import type pg from "pg";
import { NicheConfig } from "../niches/schema.js";
import { checkInitialEmailGate } from "./gate.js";
import { emailFooter, renderMainEmail, renderNoWebsiteEmail } from "./template.js";
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
    insert_unsubscribe_header: true,
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
  for (const p of rows) {
    const g = await checkInitialEmailGate(pool, p.id);
    if (!g.ok) { out.blocked.push({ id: p.id, reasons: g.reasons }); continue; }
    const cfg = NicheConfig.parse(p.config);
    const optInUrl = `${APP_BASE_URL}/s/${p.token}`;
    const unsubUrl = `${APP_BASE_URL}/u/${p.unsub_token}`;
    const email = g.template === "no_website"
      ? renderNoWebsiteEmail({ company: p.business_name, firstName: p.contact_first_name, reviewCount: p.google_review_count,
          rating: Number(p.google_rating), senderName: PERSONA.first, optInUrl })
      : renderMainEmail({ company: p.business_name, firstName: p.contact_first_name, findings: g.findings!,
          senderName: PERSONA.first, optInUrl, nichePlural: words(cfg.niche).many });
    const body = email.body + emailFooter(cfg.brand.postalAddress, unsubUrl);
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
  }
  return out;
}

/** Remove a contact from all Instantly campaigns (used by unsubscribe). */
export async function removeLeadEverywhere(email: string) {
  const found = await api("POST", "/api/v2/leads/list", { search: email, limit: 20 }).catch(() => ({ items: [] }));
  for (const l of found.items ?? []) if (l.email?.toLowerCase() === email.toLowerCase()) await api("DELETE", `/api/v2/leads/${l.id}`).catch(() => {});
}

export const campaignStatus = (id: string) => api("GET", `/api/v2/campaigns/${id}`);
