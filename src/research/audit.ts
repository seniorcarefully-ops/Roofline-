import { readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type pg from "pg";
import { inspectSite, launchBrowser } from "./inspect.js";
import { mobileSpeedScore } from "./pagespeed.js";
import { agencyCredit, logoUsable, pickBrandColor } from "../build/branding.js";

/** Bump when checks change; prospects are re-audited under the new version. */
export const AUDIT_VERSION = 8; // v8: branding + builder/agency signals
export const _V7 = 7; // v7: page must show this business (blocks parked/placeholder pages)

export const EVIDENCE_DIR = process.env.EVIDENCE_DIR ?? join(process.cwd(), "data", "evidence");

/**
 * Inspect discovered prospects and store evidenced findings. Only deterministic,
 * screenshot-backed checks are marked verified. Prospects with 3+ verified
 * findings move to qualified; unreachable sites go to the exception queue.
 */
export async function auditProspects(pool: pg.Pool, limit = 50, states: string[] = ["discovered"], ids: number[] | null = null) {
  const ps = (await pool.query(
    `SELECT id, website_url, business_name, phone, normalized_domain, prospect_state FROM prospects WHERE prospect_state = ANY($3) AND website_url IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM events e WHERE e.subject_type='prospect' AND e.subject_id = prospects.id::text AND e.track='audit' AND (e.detail->>'version')::int = $2)
     AND ($4::int[] IS NULL OR id = ANY($4)) ORDER BY id LIMIT $1`, [limit, AUDIT_VERSION, states, ids])).rows;
  const browser = await launchBrowser();
  const summary = { audited: 0, qualified: 0, unreachable: 0, belowThreshold: 0, demoted: 0 };
  try {
    for (const p of ps) {
      let r;
      try {
        r = await inspectSite(p.website_url, join(EVIDENCE_DIR, String(p.id)), browser, { name: p.business_name, phone: p.phone, domain: p.normalized_domain });
      } catch (e) {
        r = { ok: false, finalUrl: null, error: `inspector error: ${e instanceof Error ? e.message.split("\n")[0] : e}`, findings: [] };
      }
      summary.audited++;
      // A re-audit replaces earlier findings; nothing old survives a new result.
      await pool.query(`DELETE FROM audit_findings WHERE prospect_id = $1`, [p.id]);
      if (r.ok && r.finalUrl) {
        const ps = await mobileSpeedScore(r.finalUrl);
        if (ps && ps.score < 50 && r.screenshot)
          r.findings.push({ code: "slow_mobile", detail: `Google's PageSpeed test scores this site's mobile performance ${ps.score}/100${ps.lcp ? ` (main content takes ${ps.lcp} to appear)` : ""}.`,
            sourceUrl: r.finalUrl, evidencePath: r.screenshot });
      }
      if (r.ok && r.branding) await saveBranding(pool, p.id, r.branding).catch((e) => console.error("branding failed:", e instanceof Error ? e.message : e));
      // Persist evidence images (keyed by file name) so the hosted audit page can show them.
      for (const path of new Set(r.findings.map((f) => f.evidencePath))) {
        const sz = await stat(path).then((x) => x.size).catch(() => 0);
        if (sz > 0 && sz < 3_000_000)
          await pool.query(`INSERT INTO evidence_images(prospect_id, key, png) VALUES ($1,$2,$3)
            ON CONFLICT (prospect_id, key) DO UPDATE SET png = EXCLUDED.png, created_at = now()`,
            [p.id, basename(path), await readFile(path)]);
      }
      for (const f of r.findings)
        await pool.query(
          `INSERT INTO audit_findings(prospect_id, code, summary, detail, source_url, evidence_path, captured_at, verified)
           VALUES ($1,$2,$2,$3,$4,$5,now(),true) ON CONFLICT (prospect_id, code) DO NOTHING`,
          [p.id, f.code, f.detail, f.sourceUrl, basename(f.evidencePath)]);
      await pool.query(
        `INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'audit','auditor',$2)`,
        [String(p.id), { version: AUDIT_VERSION, ok: r.ok, error: r.error ?? null, finalUrl: r.finalUrl, findings: r.findings.map((f) => f.code) }]);
      const demote = async () => {
        if (p.prospect_state !== "qualified") return;
        await pool.query(`UPDATE prospects SET prospect_state='discovered', updated_at=now() WHERE id=$1`, [p.id]);
        await pool.query(`INSERT INTO events(subject_type, subject_id, track, from_state, to_state, actor, detail)
          VALUES ('prospect',$1,'prospect_state','qualified','discovered','auditor',$2)`, [String(p.id), { reason: r.error ?? "below threshold on re-audit" }]);
        summary.demoted++;
      };
      if (!r.ok) {
        await demote();
        summary.unreachable++;
        await pool.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('prospect',$1,$2)`,
          [String(p.id), `site unreachable: ${r.error}`]);
      } else if (r.findings.length >= 2) {
        summary.qualified++;
        if (p.prospect_state === "qualified") continue;
        await pool.query(`UPDATE prospects SET prospect_state='qualified', updated_at=now() WHERE id=$1`, [p.id]);
        await pool.query(`INSERT INTO events(subject_type, subject_id, track, from_state, to_state, actor)
          VALUES ('prospect',$1,'prospect_state','discovered','qualified','auditor')`, [String(p.id)]);
      } else { await demote(); summary.belowThreshold++; }
    }
  } finally { await browser.close(); }
  return summary;
}

/** Store site signals and branding from the business's own site. Weak signals are stored as null. */
async function saveBranding(pool: pg.Pool, id: number, b: import("./inspect.js").Branding) {
  const color = pickBrandColor(b.colors);
  const agency = agencyCredit(b.footer, b.footerLinks);
  let logo: Buffer | null = null, type: string | null = null;
  if (b.logo && /^https?:/.test(b.logo.src)) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(b.logo.src, { signal: ctrl.signal });
      const ct = (r.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && logoUsable(b.logo.w, b.logo.h, ct, buf.length)) { logo = buf; type = ct; }
    } catch { /* no logo */ } finally { clearTimeout(t); }
  }
  await pool.query(`UPDATE prospects SET site_builder = $2, agency_credit = $3, brand_color = $4, brand_logo = $5, brand_logo_type = $6 WHERE id = $1`,
    [id, b.builder, agency, color, logo, type]);
}
