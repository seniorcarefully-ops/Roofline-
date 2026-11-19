import type pg from "pg";
import { activeNiche } from "../niches/registry.js";
import type { NicheConfig } from "../niches/schema.js";
import { cleanUrl, normalizeDomain, searchPlaces, type Place } from "./places.js";

export interface DiscoverResult { found: number; inserted: number; skipped: Record<string, number> }

/** Pure fit check against niche criteria. Returns a skip reason or null. */
export function fitReason(p: Place, c: { placeTypes: string[]; minRating: number; minReviews: number }): string | null {
  if (p.status && p.status !== "OPERATIONAL") return "not_operational";
  if (!p.types.some((t) => c.placeTypes.includes(t))) return "wrong_type";
  if ((p.rating ?? 0) < c.minRating) return "low_rating";
  if (p.reviews < c.minReviews) return "few_reviews";
  if (!p.website) return "no_website";
  return null;
}

/** Search one area with the active niche's terms and store new prospects (deduped). */
export async function discover(pool: pg.Pool, area: string, maxPages = 3, nicheOverride?: { id: number; config: NicheConfig }): Promise<DiscoverResult> {
  const niche = nicheOverride ?? await activeNiche(pool);
  if (!niche) throw new Error("no active niche");
  const crit = niche.config.prospecting;
  const seen = new Map<string, Place>();
  for (const term of crit.searchTerms)
    for (const p of await searchPlaces(`${term} in ${area}`, maxPages)) seen.set(p.id, p);

  const res: DiscoverResult = { found: seen.size, inserted: 0, skipped: {} };
  for (const p of seen.values()) {
    const why = fitReason(p, crit);
    if (why && why !== "no_website") { res.skipped[why] = (res.skipped[why] ?? 0) + 1; continue; }
    const site = p.website ? cleanUrl(p.website) : null;
    const r = await pool.query(
      `INSERT INTO prospects(niche_version_id, business_name, website_url, normalized_domain, place_id, phone, address,
         service_area, outreach_template, google_rating, google_review_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING RETURNING id`,
      [niche.id, p.name, site, normalizeDomain(site), p.id, p.phone, p.address, area,
        site ? "website_audit" : "no_website", p.rating, p.reviews],
    );
    if (r.rowCount) {
      res.inserted++;
      await pool.query(
        `INSERT INTO events(subject_type, subject_id, track, to_state, actor, detail)
         VALUES ('prospect',$1,'prospect_state','discovered','discover',$2)`,
        [String(r.rows[0].id), { place_id: p.id, rating: p.rating, reviews: p.reviews, query_area: area }],
      );
    } else res.skipped.duplicate = (res.skipped.duplicate ?? 0) + 1;
  }
  return res;
}
