import type pg from "pg";
import { decide } from "../ai/assistant.js";
import { NicheConfig } from "../niches/schema.js";
import { grantSms } from "./consent.js";
import { transition } from "../state.js";
import { APP_BASE_URL, previewUrlFor } from "../build/pipeline.js";
import { unsubscribeByToken } from "./unsubscribe.js";

async function api<T = any>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.INSTANTLY_API_KEY) headers.Authorization = `Bearer ${process.env.INSTANTLY_API_KEY}`;
  const r = await fetch(`https://api.instantly.ai${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Instantly ${r.status} ${path}: ${d?.message ?? ""}`);
  return d as T;
}

const textOf = (e: any) => (e?.body?.text ?? String(e?.body?.html ?? e?.content_preview ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
  // Drop the quoted thread below the reply.
  .split(/\n\s*On .+wrote:\s*\n|\n-{2,}\s*Original Message|\n>/)[0]!.trim();

/** Webhook events from Instantly. Idempotent per event. */
export async function handleInstantlyEvent(pool: pg.Pool, ev: any) {
  const type = ev.event_type as string;
  const leadEmail = String(ev.lead_email ?? ev.email ?? "").toLowerCase();
  const key = `instantly:${type}:${ev.email_id ?? ev.id ?? ""}:${leadEmail}:${ev.timestamp ?? ""}`;
  const fresh = await pool.query(`INSERT INTO billing_events(stripe_event_id, type, created) VALUES ($1,$2,now()) ON CONFLICT DO NOTHING`, [key, type]);
  if (!fresh.rowCount) return { duplicate: true };
  const p = (await pool.query(`SELECT * FROM prospects WHERE lower(contact_email) = $1 ORDER BY id DESC LIMIT 1`, [leadEmail])).rows[0];
  await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'instantly','instantly',$2)`,
    [String(p?.id ?? "unknown"), { type, lead: leadEmail }]);
  if (!p) return { unknownLead: true };

  if (type === "email_sent") {
    if (p.website_state === "ready_to_send") await transition(pool, p.id, "website_state", "sent", "instantly");
    if (p.prospect_state === "qualified") await transition(pool, p.id, "prospect_state", "contacted", "instantly");
    await pool.query(`UPDATE messages SET status = 'sent' WHERE idempotency_key = $1`, [`initial_email:${p.id}`]);
  } else if (type === "email_bounced") {
    await pool.query(`INSERT INTO suppressions(channel, address, reason) VALUES ('email', lower($1), 'bounce') ON CONFLICT DO NOTHING`, [leadEmail]);
    await pool.query(`UPDATE prospects SET contact_verified = false, email_state = 'suppressed' WHERE id = $1`, [p.id]);
  } else if (type === "lead_unsubscribed") {
    await unsubscribeByToken(pool, p.unsub_token, "instantly");
  } else if (type === "reply_received") {
    return handleReply(pool, p, ev);
  }
  return { handled: type };
}

async function handleReply(pool: pg.Pool, p: any, ev: any) {
  // Fetch the actual received email (the webhook payload shape is not relied on for content).
  const list = await api("GET", `/api/v2/emails?lead=${encodeURIComponent(p.contact_email)}&email_type=received&limit=1&sort_order=desc`);
  const email = list.items?.[0];
  if (!email) throw new Error("reply email not found");
  const text = textOf(email) || String(ev.reply_text ?? "");
  await pool.query(`INSERT INTO messages(prospect_id, channel, direction, idempotency_key, provider_id, status, body, meta)
    VALUES ($1,'email','inbound',$2,$2,'received',$3,$4) ON CONFLICT (idempotency_key) DO NOTHING`,
    [p.id, `email_in:${email.id}`, text, JSON.stringify({ subject: email.subject, eaccount: email.eaccount })]);

  const cfg = NicheConfig.parse((await pool.query(`SELECT config FROM niche_versions WHERE id = $1`, [p.niche_version_id])).rows[0].config);
  const pv = (await pool.query(`SELECT token FROM previews WHERE prospect_id = $1 ORDER BY version DESC LIMIT 1`, [p.id])).rows[0];
  const history = (await pool.query(`SELECT direction, body FROM messages WHERE prospect_id = $1 AND channel = 'email' AND idempotency_key <> $2 ORDER BY id`, [p.id, `email_in:${email.id}`])).rows
    .map((m) => ({ from: m.direction === "outbound" ? "us" as const : "them" as const, text: m.body }));
  const d = await decide({
    channel: "email", text, brand: cfg.brand, niche: cfg.niche, company: p.business_name, firstName: p.contact_first_name,
    previewUrl: pv ? previewUrlFor(pv.token) : null, optInUrl: pv ? `${APP_BASE_URL}/s/${pv.token}` : null,
    smsPermission: p.sms_state === "granted", smsLive: !!process.env.TWILIO_FROM_NUMBER, history, today: new Date().toISOString().slice(0, 10),
  });
  await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'reply_decision','assistant',$2)`,
    [String(p.id), { intent: d.intent, escalate: d.escalate, reason: d.reason, followUpAfter: d.followUpAfter }]);

  // Deterministic side effects, by intent.
  if (d.intent === "unsubscribe") { await unsubscribeByToken(pool, p.unsub_token, "reply"); return { intent: d.intent }; }
  if (d.intent === "gave_phone_and_permission" && d.phone) {
    await grantSms(pool, p.id, d.phone, text, `email_reply:${email.id}`).catch(() => {});
  }
  if (["gave_phone_and_permission", "interested_no_phone", "question"].includes(d.intent) && p.prospect_state === "contacted")
    await transition(pool, p.id, "prospect_state", "interested", "assistant");
  if (["not_interested", "wrong_person"].includes(d.intent) && ["contacted", "interested"].includes(p.prospect_state))
    await transition(pool, p.id, "prospect_state", "closed", "assistant", { intent: d.intent });
  if (d.escalate)
    await pool.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('prospect',$1,$2)`, [String(p.id), `reply needs attention: ${d.reason}`]);

  if (d.reply) {
    const body = d.reply.replace(/\n/g, "<br/>");
    await api("POST", "/api/v2/emails/reply", {
      eaccount: email.eaccount, reply_to_uuid: email.id,
      subject: /^re:/i.test(email.subject ?? "") ? email.subject : `Re: ${email.subject ?? ""}`, body: { text: d.reply, html: body },
    });
    await pool.query(`INSERT INTO messages(prospect_id, channel, direction, idempotency_key, status, body, meta) VALUES ($1,'email','outbound',$2,'sent',$3,$4)
      ON CONFLICT (idempotency_key) DO NOTHING`, [p.id, `email_reply:${email.id}`, d.reply, JSON.stringify({ intent: d.intent })]);
  }
  return { intent: d.intent, replied: !!d.reply, escalated: d.escalate };
}
