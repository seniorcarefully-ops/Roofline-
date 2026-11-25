import type pg from "pg";
import { NicheConfig } from "../niches/schema.js";
import { checkInitialEmailGate } from "./gate.js";
import { emailFooter, emailFooterA, renderEmailA, renderNoWebsiteEmail } from "./template.js";
import { APP_BASE_URL } from "../build/pipeline.js";
import { words, PERSONA } from "../server/home.js";

/** Instantly API v2 client. Key from INSTANTLY_API_KEY (Render) or the session proxy. */
async function api<T = any>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.INSTANTLY_API_KEY) headers.Authorization = `Bearer ${process.env.INSTANTLY_API_KEY}`;
  const r = await fetch(`https://api.instantly.ai${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const d: any = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Instantly ${r.status} ${path}: ${d?.message ?? JSON.stringify(d).slice(0, 200)}`);
  return d as T;
}

export const CAMPAIGN_NAME = (niche: string) => `Roofline Websites · ${niche} · main (B)`;
/** Only the persona mailboxes send. The old micah@ boxes are excluded on purpose. */
export const SENDERS = ["cole@tryrooflinesites.com", "cole.b@tryrooflinesites.com", "cole@gorooflinesites.com", "cole.b@gorooflinesites.com"];

/**
 * Find or create the campaign. New campaigns are created in DRAFT (not sending);
 * it only sends after the owner activates it. Each lead carries its fully
 * rendered subject/body, so Instantly only delivers what our gate approved.
 */
export async function ensureCampaign(niche: string): Promise<string> {
  const name = CAMPAIGN_NAME(niche);
  const found = await api("GET", `/api/v2/campaigns?search=${encodeURIComponent(name)}&limit=10`);
  const hit = (found.items ?? []).find((c: any) => c.name === name);
  if (hit) return hit.id;
  const c = await api("POST", "/api/v2/campaigns", {
    name,
    campaign_schedule: { schedules: [{ name: "Weekdays 8-5 Pacific", timing: { from: "09:00", to: "18:00" },
      days: { "1": true, "2": true, "3": true, "4": true, "5": true }, timezone: "America/Boise" }] },
    sequences: [{ steps: [{ type: "email", delay: 3, variants: [{ subject: "{{subject}}", body: "{{body}}" }] }] }],
    email_list: SENDERS,
    daily_limit: 40,
    stop_on_reply: true, stop_on_auto_reply: true,
    link_tracking: false, open_tracking: false, text_only: true, first_email_text_only: true,
    insert_unsubscribe_header: false, // plain person-to-person email; opt-out is by reply
    allow_risky_contacts: false,
  });
  return c.id;
}

/**
 * Push send-ready prospects into the campaign. Every lead must pass the
 * deterministic send gate; the rendered email includes the legal footer.
 */
export async function queueLeads(pool: pg.Pool, opts: { minScore?: number; limit?: number; niche?: string } = {}) {
  const minScore = opts.minScore ?? 60, limit = opts.limit ?? 50;
  const rows = (await pool.query(
    `SELECT p.*, v.config,
       (SELECT token FROM previews WHERE prospect_id = p.id ORDER BY version DESC LIMIT 1) AS token
     FROM prospects p JOIN niche_versions v ON v.id = p.niche_version_id
     WHERE p.website_state = 'ready_to_send' AND p.contact_verified AND p.fit_score >= $1
       AND ($3::text IS NULL OR v.niche_id = $3)
     ORDER BY p.fit_score DESC, p.id LIMIT $2`, [minScore, limit, opts.niche ?? null])).rows;
  const out = { considered: rows.length, queued: 0, blocked: [] as { id: number; reasons: string[] }[] };
  const campaigns = new Map<string, string>();
  const catchAllCap = Math.floor(limit * 0.2); let catchAllQueued = 0;
  for (const p of rows) {
    if (p.contact_catch_all && catchAllQueued >= catchAllCap) { out.blocked.push({ id: p.id, reasons: ["catch-all daily cap reached"] }); continue; }
    const g = await checkInitialEmailGate(pool, p.id);
    if (!g.ok) { out.blocked.push({ id: p.id, reasons: g.reasons }); continue; }
    const cfg = NicheConfig.parse(p.config);
    const optInUrl = `${APP_BASE_URL}/s/${p.token}`;
    const unsubUrl = `${APP_BASE_URL}/u/${p.unsub_token}`;
    const email = g.template === "no_website"
      ? renderNoWebsiteEmail({ company: p.business_name, firstName: p.contact_first_name, reviewCount: p.google_review_count,
          rating: Number(p.google_rating), senderName: PERSONA.first, optInUrl })
      : renderEmailA({ firstName: p.contact_first_name, senderName: PERSONA.first, findings: g.findings!, codes: g.codes!,
          reviewCount: p.google_review_count, rating: p.google_rating == null ? null : Number(p.google_rating) });
    const body = email.body + (g.template === "no_website" ? emailFooter(cfg.brand.postalAddress, unsubUrl) : emailFooterA(cfg.brand.postalAddress));
    if (!campaigns.has(cfg.niche)) campaigns.set(cfg.niche, await ensureCampaign(cfg.niche));
    const lead = await api("POST", "/api/v2/leads", {
      campaign: campaigns.get(cfg.niche), email: p.contact_email, first_name: p.contact_first_name ?? undefined,
      company_name: p.business_name, website: p.website_url ?? undefined, skip_if_in_workspace: true,
      custom_variables: { subject: email.subject, body, prospect_id: String(p.id) },
    });
    // Idempotent record of the queued email; the send itself is reported back by Instantly.
    await pool.query(
      `INSERT INTO messages(prospect_id, channel, direction, idempotency_key, provider_id, status, body, meta)
       VALUES ($1,'email','outbound',$2,$3,'queued',$4,$5) ON CONFLICT (idempotency_key) DO NOTHING`,
      [p.id, `initial_email:${p.id}`, lead.id ?? null, body, JSON.stringify({ subject: email.subject, template: g.template, campaign: campaigns.get(cfg.niche) })]);
    // State moves to sent/contacted only when Instantly reports the email actually went out.
    out.queued++;
    if (p.contact_catch_all) catchAllQueued++;
  }
  return out;
}

/** Remove a contact from all Instantly campaigns (used by unsubscribe). */
export async function removeLeadEverywhere(email: string) {
  const found = await api("POST", "/api/v2/leads/list", { search: email, limit: 20 }).catch(() => ({ items: [] }));
  for (const l of found.items ?? []) if (l.email?.toLowerCase() === email.toLowerCase()) await api("DELETE", `/api/v2/leads/${l.id}`).catch(() => {});
}

export const campaignStatus = (id: string) => api("GET", `/api/v2/campaigns/${id}`);

/**
 * Owner-approved end-to-end test: send the real initial email for one prospect to the
 * OWNER's address, through a separate TEST campaign. The prospect's real address is
 * saved in an event and swapped back by `test-restore`; the real business is never emailed.
 * All gate checks still apply except the global outreach pause (owner approved this one send).
 */
export async function testSend(pool: pg.Pool, prospectId: number, testEmail: string) {
  const g = await checkInitialEmailGate(pool, prospectId);
  const other = g.reasons.filter((r) => r !== "outreach is paused" && r !== "no verified contact email");
  if (other.length) throw new Error(`gate blocked: ${other.join("; ")}`);
  const p = (await pool.query(`SELECT p.*, v.config, (SELECT token FROM previews WHERE prospect_id = p.id ORDER BY version DESC LIMIT 1) AS token
    FROM prospects p JOIN niche_versions v ON v.id = p.niche_version_id WHERE p.id = $1`, [prospectId])).rows[0];
  await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'e2e_test','owner_test',$2)`,
    [String(p.id), { original_email: p.contact_email, original_verified: p.contact_verified, test_email: testEmail }]);
  await pool.query(`UPDATE prospects SET contact_email = $2, contact_verified = true WHERE id = $1`, [p.id, testEmail.toLowerCase()]);
  const cfg = NicheConfig.parse(p.config);
  const optInUrl = `${APP_BASE_URL}/s/${p.token}`, unsubUrl = `${APP_BASE_URL}/u/${p.unsub_token}`;
  const g2 = await checkInitialEmailGate(pool, prospectId);
  const email = renderEmailA({ firstName: p.contact_first_name, senderName: PERSONA.first, findings: g2.findings ?? g.findings!, codes: g2.codes ?? g.codes!,
    reviewCount: p.google_review_count, rating: p.google_rating == null ? null : Number(p.google_rating) });
  const body = email.body + emailFooterA(cfg.brand.postalAddress);
  const name = "Roofline Websites · TEST (owner e2e)";
  const found = await api("GET", `/api/v2/campaigns?search=${encodeURIComponent(name)}&limit=10`);
  let id = (found.items ?? []).find((c: any) => c.name === name)?.id;
  if (!id) id = (await api("POST", "/api/v2/campaigns", {
    name, campaign_schedule: { schedules: [{ name: "Any time", timing: { from: "00:00", to: "23:59" },
      days: { "0": true, "1": true, "2": true, "3": true, "4": true, "5": true, "6": true }, timezone: "America/Boise" }] },
    sequences: [{ steps: [{ type: "email", delay: 0, variants: [{ subject: "{{subject}}", body: "{{body}}" }] }] }],
    email_list: [SENDERS[0]], daily_limit: 5, stop_on_reply: true, link_tracking: false, open_tracking: false, text_only: true,
    first_email_text_only: true, insert_unsubscribe_header: false,
  })).id;
  const lead = await api("POST", "/api/v2/leads", { campaign: id, email: testEmail, first_name: p.contact_first_name ?? undefined,
    company_name: p.business_name, custom_variables: { subject: email.subject, body, prospect_id: String(p.id) } });
  await pool.query(`INSERT INTO messages(prospect_id, channel, direction, idempotency_key, provider_id, status, body, meta)
    VALUES ($1,'email','outbound',$2,$3,'queued',$4,$5) ON CONFLICT (idempotency_key) DO NOTHING`,
    [p.id, `initial_email:${p.id}`, lead.id ?? null, body, JSON.stringify({ subject: email.subject, template: "website_audit", campaign: id, test: true })]);
  await api("POST", `/api/v2/campaigns/${id}/activate`, {});
  return { campaign: id, subject: email.subject, to: testEmail, business: p.business_name };
}

/** Undo testSend: restore the prospect's real address and clear test send records. */
export async function testRestore(pool: pg.Pool, prospectId: number) {
  const e = (await pool.query(`SELECT detail FROM events WHERE subject_type='prospect' AND subject_id=$1 AND track='e2e_test' ORDER BY id DESC LIMIT 1`, [String(prospectId)])).rows[0];
  if (!e) throw new Error("no test record");
  await pool.query(`UPDATE prospects SET contact_email = $2, contact_verified = $3 WHERE id = $1`, [prospectId, e.detail.original_email, e.detail.original_verified]);
  await pool.query(`DELETE FROM messages WHERE prospect_id = $1 AND meta->>'test' = 'true'`, [prospectId]);
  return { restored: e.detail.original_email };
}
