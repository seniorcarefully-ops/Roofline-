import type { Db } from "../db.js";
import { NicheConfig } from "../niches/schema.js";

export interface GateResult {
  ok: boolean;
  reasons: string[];
  findings?: [string, string, string];
  template?: "website_audit" | "no_website";
}

/**
 * Deterministic prerequisites for sending the locked initial email.
 * The email claims a site is already built, so an approved, reviewed preview
 * must exist. Any failed check blocks the send.
 */
export async function checkInitialEmailGate(db: Db, prospectId: number): Promise<GateResult> {
  const reasons: string[] = [];
  const p = (
    await db.query(
      `SELECT p.*, v.config FROM prospects p JOIN niche_versions v ON v.id = p.niche_version_id WHERE p.id = $1`,
      [prospectId],
    )
  ).rows[0];
  if (!p) return { ok: false, reasons: ["prospect not found"] };

  const s = (await db.query(`SELECT outreach_paused FROM settings`)).rows[0];
  if (s.outreach_paused) reasons.push("outreach is paused");
  if (p.prospect_state !== "qualified") reasons.push(`prospect is ${p.prospect_state}, not qualified`);
  if (p.website_state !== "ready_to_send") reasons.push(`website is ${p.website_state}, not ready_to_send`);
  if (p.email_state !== "eligible") reasons.push("email suppressed for prospect");
  if (!p.contact_email || !p.contact_verified) reasons.push("no verified contact email");

  if (p.contact_email) {
    const sup = await db.query(
      `SELECT 1 FROM suppressions WHERE address = lower($1) AND channel IN ('email','all')`,
      [p.contact_email],
    );
    if (sup.rowCount) reasons.push("address is on suppression list");
  }

  // Latest preview must have an approving review by a non-builder reviewer.
  const rev = await db.query(
    `SELECT r.verdict FROM previews pv JOIN reviews r ON r.preview_id = pv.id
     WHERE pv.prospect_id = $1 AND pv.version = (SELECT MAX(version) FROM previews WHERE prospect_id = $1)
     ORDER BY r.id DESC LIMIT 1`,
    [prospectId],
  );
  if (rev.rows[0]?.verdict !== "approved") reasons.push("latest preview not approved by reviewer");

  if (p.outreach_template === "no_website") {
    // No audit: the email instead states verified Google listing facts.
    if (p.website_url) reasons.push("prospect has a website; no_website template does not apply");
    if (!(p.google_review_count >= 5) || p.google_rating == null) reasons.push("verified Google rating/reviews missing");
    const already = await db.query(`SELECT 1 FROM messages WHERE idempotency_key = $1`, [`initial_email:${prospectId}`]);
    if (already.rowCount) reasons.push("initial email already sent");
    return { ok: reasons.length === 0, reasons, template: "no_website" };
  }

  const doc = await db.query(`SELECT 1 FROM audit_documents WHERE prospect_id = $1`, [prospectId]);
  if (!doc.rowCount) reasons.push("no audit attachment");

  // Exactly the top three verified findings, in niche priority order.
  const cfg = NicheConfig.parse(p.config);
  const order = new Map(cfg.audit.priorities.map((x, i) => [x.code, i]));
  const phrase = new Map(cfg.audit.priorities.map((x) => [x.code, x.phrase]));
  const f = (await db.query(`SELECT code FROM audit_findings WHERE prospect_id = $1 AND verified`, [prospectId])).rows
    .map((r) => r.code as string)
    .filter((c) => order.has(c))
    .sort((a, b) => order.get(a)! - order.get(b)!);
  if (f.length < 3) reasons.push(`only ${f.length} verified findings; 3 required`);

  const already = await db.query(
    `SELECT 1 FROM messages WHERE idempotency_key = $1`,
    [`initial_email:${prospectId}`],
  );
  if (already.rowCount) reasons.push("initial email already sent");

  return reasons.length
    ? { ok: false, reasons }
    : { ok: true, reasons, template: "website_audit", findings: [phrase.get(f[0]!)!, phrase.get(f[1]!)!, phrase.get(f[2]!)!] };
}
