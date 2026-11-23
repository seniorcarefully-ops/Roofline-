import type pg from "pg";
import { activeNiche } from "../niches/registry.js";
import { fitReason } from "./discover.js";
import { cleanUrl, normalizeDomain, searchPlaces } from "./places.js";

/**
 * Import leads from an Instantly SuperSearch list. Each lead is matched to its
 * Google Business listing (same website domain as the email) so the normal fit
 * rules, audit and scoring apply. Unmatched leads are skipped, never guessed.
 */
export async function importSupersearch(pool: pg.Pool, listId: string) {
  const niche = await activeNiche(pool);
  if (!niche) throw new Error("no active niche");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.INSTANTLY_API_KEY) headers.Authorization = `Bearer ${process.env.INSTANTLY_API_KEY}`;
  const leads: any[] = [];
  let after: string | undefined;
  do {
    const r = await fetch("https://api.instantly.ai/api/v2/leads/list", { method: "POST", headers, body: JSON.stringify({ list_id: listId, limit: 100, starting_after: after }) });
    const d: any = await r.json();
    leads.push(...(d.items ?? [])); after = d.next_starting_after;
  } while (after);
  const s: Record<string, number> = { leads: leads.length, inserted: 0 };
  const bump = (k: string) => { s[k] = (s[k] ?? 0) + 1; };
  for (const l of leads) {
    const email = String(l.email ?? "").toLowerCase();
    const dom = email.split("@")[1];
    if (!email || !dom || /^(gmail|yahoo|hotmail|outlook|aol|icloud)\./.test(dom)) { bump("no_company_email"); continue; }
    const loc = l.payload?.location ?? l.location ?? "";
    const places = await searchPlaces(`${l.company_name ?? dom} ${loc}`.trim(), 1).catch(() => []);
    const p = places.find((x) => x.website && normalizeDomain(cleanUrl(x.website)) === dom);
    if (!p) { bump("no_matching_listing"); continue; }
    const why = fitReason(p, niche.config.prospecting);
    if (why) { bump(why); continue; }
    const site = cleanUrl(p.website!);
    const r = await pool.query(
      `INSERT INTO prospects(niche_version_id, business_name, website_url, normalized_domain, place_id, phone, address,
         service_area, outreach_template, google_rating, google_review_count, contact_first_name, contact_email, contact_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'website_audit',$9,$10,$11,$12,true) ON CONFLICT DO NOTHING RETURNING id`,
      [niche.id, p.name, site, normalizeDomain(site), p.id, p.phone, p.address, loc || null, p.rating, p.reviews, l.first_name ?? null, email]);
    if (!r.rowCount) { bump("duplicate"); continue; }
    s.inserted!++;
    await pool.query(`INSERT INTO events(subject_type, subject_id, track, to_state, actor, detail) VALUES ('prospect',$1,'prospect_state','discovered','supersearch',$2)`,
      [String(r.rows[0].id), { list_id: listId, lead_email: email }]);
  }
  return s;
}

/** Funnel report for prospects imported from SuperSearch. */
export async function supersearchReport(pool: pg.Pool) {
  return (await pool.query(`SELECT prospect_state, website_state, count(*)::int n, count(*) FILTER (WHERE fit_score >= 60)::int fit60,
     count(*) FILTER (WHERE EXISTS (SELECT 1 FROM events e WHERE e.subject_type='prospect' AND e.subject_id=x.id::text AND e.track='audit'))::int audited
   FROM prospects x WHERE id::text IN (SELECT subject_id FROM events WHERE actor='supersearch') GROUP BY 1,2 ORDER BY 1,2`)).rows;
}
