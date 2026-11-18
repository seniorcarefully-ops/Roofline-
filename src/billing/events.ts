import { createHmac, timingSafeEqual } from "node:crypto";
import type pg from "pg";
import { tx, type Db } from "../db.js";
import { transition } from "../state.js";
import { serviceForLookupKey } from "./catalog.js";
import { stripe } from "./stripe.js";

/** Verify a Stripe webhook signature (v1 scheme, 5-minute tolerance). */
export function verifyWebhook(payload: string, header: string, secret: string, now = Date.now()): boolean {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  const sigs = header.split(",").filter((s) => s.startsWith("v1=")).map((s) => Buffer.from(s.slice(3), "hex"));
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(s, expected));
}

async function upsertCustomer(db: Db, stripeCustomerId: string, livemode: boolean, prospectId: number | null,
  email: string | null): Promise<number> {
  const r = await db.query(
    `INSERT INTO customers(stripe_customer_id, livemode, prospect_id, email) VALUES ($1,$2,$3,$4)
     ON CONFLICT (stripe_customer_id) DO UPDATE SET
       prospect_id = COALESCE(customers.prospect_id, EXCLUDED.prospect_id),
       email = COALESCE(EXCLUDED.email, customers.email)
     RETURNING id`,
    [stripeCustomerId, livemode, prospectId, email],
  );
  return Number(r.rows[0].id);
}

async function upsertSubscription(db: Db, sub: any): Promise<void> {
  const item = sub.items?.data?.[0];
  const service = serviceForLookupKey(item?.price?.lookup_key) ?? sub.metadata?.service;
  if (!service) throw new Error(`subscription ${sub.id} has no recognizable service`);
  const pid = sub.metadata?.prospect_id ? Number(sub.metadata.prospect_id) : null;
  const customerId = await upsertCustomer(db, sub.customer, sub.livemode, pid, null);
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await db.query(
    `INSERT INTO subscriptions(customer_id, stripe_subscription_id, service, status, cancel_at_period_end,
       current_period_end, livemode)
     VALUES ($1,$2,$3,$4,$5,to_timestamp($6),$7)
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = EXCLUDED.status,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       current_period_end = EXCLUDED.current_period_end, updated_at = now()`,
    [customerId, sub.id, service, sub.status, !!sub.cancel_at_period_end, periodEnd ?? null, sub.livemode],
  );
}

/** Apply one Stripe event exactly once. Returns false if already processed. */
export async function handleEvent(pool: pg.Pool, event: any): Promise<boolean> {
  return tx(pool, async (c) => {
    const ins = await c.query(
      `INSERT INTO billing_events(stripe_event_id, type, created) VALUES ($1,$2,to_timestamp($3))
       ON CONFLICT DO NOTHING`,
      [event.id, event.type, event.created],
    );
    if (!ins.rowCount) return false;
    const o = event.data.object;
    switch (event.type) {
      case "checkout.session.completed": {
        if (o.mode !== "subscription") break;
        const pid = o.client_reference_id ? Number(o.client_reference_id) : null;
        await upsertCustomer(c, o.customer, o.livemode, pid, o.customer_details?.email ?? null);
        if (pid) {
          const p = await c.query(`SELECT prospect_state FROM prospects WHERE id = $1`, [pid]);
          const st = p.rows[0]?.prospect_state;
          if (st === "contacted" || st === "interested")
            await transition(c, pid, "prospect_state", "purchased", "stripe", { session: o.id });
          // Stop prospecting sequences: cancel queued outreach jobs for this prospect.
          await c.query(
            `UPDATE jobs SET status = 'done', last_error = 'canceled: purchased', updated_at = now()
             WHERE status = 'queued' AND kind LIKE 'outreach.%' AND payload->>'prospect_id' = $1`,
            [String(pid)],
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(c, o);
        break;
      case "invoice.payment_failed":
        await c.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('stripe_invoice',$1,$2)`,
          [o.id, `payment failed for customer ${o.customer}`]);
        break;
    }
    await c.query(
      `INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('stripe_event',$1,'billing','stripe',$2)`,
      [event.id, { type: event.type }],
    );
    return true;
  });
}

/** Pull recent events from Stripe (works without a public webhook URL). */
export async function syncEvents(pool: pg.Pool, sinceUnix: number): Promise<number> {
  let n = 0;
  let starting_after: string | undefined;
  const all: any[] = [];
  for (;;) {
    const page = await stripe("GET", "/v1/events", { limit: 100, "created[gte]": sinceUnix, starting_after });
    all.push(...page.data);
    if (!page.has_more) break;
    starting_after = page.data.at(-1).id;
  }
  for (const e of all.sort((a, b) => a.created - b.created)) if (await handleEvent(pool, e)) n++;
  return n;
}
