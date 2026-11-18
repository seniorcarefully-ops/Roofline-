import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { freshDb } from "./helpers.js";
import { verifyWebhook, handleEvent, syncEvents } from "../src/billing/events.js";
import { ensureCatalog } from "../src/billing/setup.js";
import { createCheckout } from "../src/billing/checkout.js";
import { stripe } from "../src/billing/stripe.js";
import { publishNicheVersion } from "../src/niches/registry.js";
import { roofing } from "../src/niches/roofing.js";
import { transition } from "../src/state.js";

let pool: pg.Pool;
beforeAll(async () => { pool = await freshDb(); });
afterAll(() => pool.end());

describe("webhook signature", () => {
  it("accepts valid and rejects tampered/stale", () => {
    const secret = "whsec_test", body = '{"id":"evt_1"}', t = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    expect(verifyWebhook(body, `t=${t},v1=${sig}`, secret)).toBe(true);
    expect(verifyWebhook(body + " ", `t=${t},v1=${sig}`, secret)).toBe(false);
    expect(verifyWebhook(body, `t=${t - 600},v1=${sig}`, secret)).toBe(false);
  });
});

describe("event idempotency", () => {
  it("processes an event once", async () => {
    const e = { id: "evt_dup", type: "invoice.payment_failed", created: 1, data: { object: { id: "in_1", customer: "cus_x" } } };
    expect(await handleEvent(pool, e)).toBe(true);
    expect(await handleEvent(pool, e)).toBe(false);
    expect((await pool.query(`SELECT * FROM exceptions`)).rowCount).toBe(1);
  });
});

// Real calls to the Stripe sandbox. Run with STRIPE_SANDBOX=1.
describe.runIf(process.env.STRIPE_SANDBOX === "1")("stripe sandbox", () => {
  it("catalog, checkout, subscription, sync", async () => {
    const prices = await ensureCatalog();
    expect(Object.keys(prices).sort()).toEqual(["marketing", "sms", "website"]);
    expect(await ensureCatalog()).toEqual(prices); // idempotent

    const v = await publishNicheVersion(pool, roofing);
    const pid = Number((await pool.query(
      `INSERT INTO prospects(niche_version_id, business_name) VALUES ($1,'Sandbox Roofing') RETURNING id`, [v])).rows[0].id);
    await transition(pool, pid, "prospect_state", "qualified", "t");
    await transition(pool, pid, "prospect_state", "contacted", "t");

    const co = await createCheckout({ service: "website", prospectId: pid, baseUrl: "https://example.invalid" });
    expect(co.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    const since = Math.floor(Date.now() / 1000) - 5;
    const cus = await stripe("POST", "/v1/customers", { email: "sandbox@roofline.invalid",
      payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } });
    const sub = await stripe("POST", "/v1/subscriptions", { customer: cus.id,
      items: { 0: { price: prices.website } }, metadata: { prospect_id: String(pid), service: "website" } });
    expect(sub.status).toBe("active");
    await stripe("DELETE", `/v1/subscriptions/${sub.id}`);

    let n = 0;
    for (let i = 0; i < 10 && n < 2; i++) { // events can lag a few seconds
      await new Promise((r) => setTimeout(r, 1500));
      n += await syncEvents(pool, since);
    }
    const row = (await pool.query(`SELECT service, status, livemode FROM subscriptions WHERE stripe_subscription_id=$1`,
      [sub.id])).rows[0];
    expect(row).toEqual({ service: "website", status: "canceled", livemode: false });
    await stripe("DELETE", `/v1/customers/${cus.id}`);
  }, 60000);
});
