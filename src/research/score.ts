import type pg from "pg";
import { isDiyBuilder } from "../build/branding.js";

export interface ScoreInput {
  licenseStatus: string | null; rating: number | null; reviews: number | null;
  findings: number; hasWebsite: boolean; emailVerified: boolean; ownerName: boolean; catchAll?: boolean;
  name: string;
  siteBuilder?: string | null; agencyCredit?: string | null;
}

/** Fit score 0-100. Weights are a starting point; the strategy agent re-tunes them against purchases. */
export function fitScore(p: ScoreInput): { score: number; reasons: string[] } {
  const r: string[] = []; let s = 0;
  if (p.licenseStatus === "ACTIVE") { s += 20; r.push("active license +20"); }
  else if (p.licenseStatus) { return { score: 0, reasons: [`license ${p.licenseStatus}: excluded`] }; }
  // An agency already manages their site: wrong buyer for us.
  if (p.agencyCredit) return { score: 0, reasons: [`agency-built site (${p.agencyCredit}): excluded`] };
  const rev = p.reviews ?? 0, rat = p.rating ?? 0;
  if (isDiyBuilder(p.siteBuilder ?? null)) { s += 10; r.push(`do-it-yourself site (${p.siteBuilder}) +10`); }
  if (rev >= 5 && rev <= 150 && rat >= 3.5) { s += 25; r.push("5-150 reviews, 3.5+ rating +25"); }
  else if (rev > 150) { s += 10; r.push("150+ reviews (may have an agency) +10"); }
  if (!p.hasWebsite) { s += 25; r.push("no website +25"); }
  else if (p.findings >= 3) { s += 25; r.push("3+ proven site problems +25"); }
  else if (p.findings === 2) { s += 20; r.push("2 proven site problems +20"); }
  else if (p.findings > 0) { s += 10 * p.findings; r.push(`${p.findings} site problem(s) +${10 * p.findings}`); }
  if (p.emailVerified) { s += p.catchAll ? 12 : 20; r.push(p.catchAll ? "published email (catch-all domain) +12" : "verified email +20"); }
  if (p.ownerName) { s += 10; r.push("owner first name known +10"); }
  if (/\b(inc|corp|corporation|national|usa|america)\b/i.test(p.name) && rev > 300) { s -= 20; r.push("likely large/chain -20"); }
  return { score: Math.max(0, Math.min(100, s)), reasons: r };
}

export async function scoreAll(pool: pg.Pool) {
  const ps = (await pool.query(`SELECT p.*, (SELECT count(*) FROM audit_findings f WHERE f.prospect_id = p.id AND f.verified)::int AS nf
    FROM prospects p WHERE p.prospect_state IN ('discovered','qualified')`)).rows;
  for (const p of ps) {
    const { score, reasons } = fitScore({ licenseStatus: p.license_status, rating: p.google_rating == null ? null : Number(p.google_rating),
      reviews: p.google_review_count, findings: p.nf, hasWebsite: !!p.website_url, emailVerified: p.contact_verified, catchAll: p.contact_catch_all,
      ownerName: !!(p.principal_first_name || p.contact_first_name), name: p.business_name,
      siteBuilder: p.site_builder, agencyCredit: p.agency_credit });
    await pool.query(`UPDATE prospects SET fit_score = $2, fit_reasons = $3 WHERE id = $1`, [p.id, score, JSON.stringify(reasons)]);
  }
  const dist = (await pool.query(`SELECT width_bucket(fit_score, 0, 101, 5) b, count(*) FROM prospects WHERE fit_score IS NOT NULL GROUP BY 1 ORDER BY 1`)).rows;
  return { scored: ps.length, buckets: dist.map((d) => ({ range: `${(d.b - 1) * 20}-${d.b * 20 - 1}`, count: Number(d.count) })) };
}
