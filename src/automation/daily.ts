import type pg from "pg";
import { discover } from "../research/discover.js";
import { enrichLicenses } from "../research/enrich.js";
import { auditProspects } from "../research/audit.js";
import { findEmails, guessEmails } from "../research/emails.js";
import { scoreAll } from "../research/score.js";
import { buildAndReview } from "../build/pipeline.js";
import { queueLeads } from "../outreach/instantly.js";
import { activeNiche } from "../niches/registry.js";

/** Washington areas, worked through a few per day (then other states). */
export const AREAS = [
  "Spokane, WA", "Spokane Valley, WA", "Liberty Lake, WA", "Cheney, WA", "Deer Park, WA", "Airway Heights, WA",
  "Seattle, WA", "Bellevue, WA", "Redmond, WA", "Kirkland, WA", "Bothell, WA", "Woodinville, WA", "Everett, WA",
  "Lynnwood, WA", "Marysville, WA", "Monroe, WA", "Snohomish, WA", "Renton, WA", "Kent, WA", "Auburn, WA",
  "Federal Way, WA", "Tacoma, WA", "Puyallup, WA", "Lakewood, WA", "Gig Harbor, WA", "Olympia, WA", "Lacey, WA",
  "Bremerton, WA", "Port Orchard, WA", "Silverdale, WA", "Mount Vernon, WA", "Burlington, WA", "Bellingham, WA",
  "Ferndale, WA", "Wenatchee, WA", "Ellensburg, WA", "Yakima, WA", "Kennewick, WA", "Pasco, WA", "Richland, WA",
  "Walla Walla, WA", "Moses Lake, WA", "Vancouver, WA", "Camas, WA", "Battle Ground, WA", "Longview, WA",
  "Centralia, WA", "Aberdeen, WA", "Port Angeles, WA", "Sequim, WA", "Pullman, WA", "Oak Harbor, WA",
];

export interface DailyLimits { areas: number; audits: number; emailSearches: number; guesses: number; builds: number; queue: number; minScore: number }
export const DEFAULT_LIMITS: DailyLimits = { areas: 3, audits: 80, emailSearches: 80, guesses: 40, builds: 20, queue: 40, minScore: 60 };

/** One daily run for the live niche. Each step is isolated so one failure doesn't stop the rest. */
export async function runDaily(pool: pg.Pool, limits: DailyLimits = DEFAULT_LIMITS) {
  const niche = await activeNiche(pool);
  if (!niche) throw new Error("no active niche");
  const report: Record<string, unknown> = { niche: niche.config.niche, startedAt: new Date().toISOString() };
  const step = async (name: string, fn: () => Promise<unknown>) => {
    const t = Date.now();
    try { report[name] = await fn(); }
    catch (e) {
      report[name] = { error: e instanceof Error ? e.message : String(e) };
      await pool.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('daily_run',$1,$2)`, [name, String((report[name] as any).error)]);
    }
    (report as any)[`${name}_ms`] = Date.now() - t;
  };

  // Next areas not yet searched for this niche.
  const done = new Set((await pool.query(`SELECT detail->>'area' AS a FROM events WHERE track='area_done' AND detail->>'niche' = $1`, [niche.config.niche])).rows.map((r) => r.a));
  const areas = AREAS.filter((a) => !done.has(a)).slice(0, limits.areas);
  await step("discover", async () => {
    const out: Record<string, unknown> = {};
    for (const a of areas) {
      out[a] = await discover(pool, a);
      await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('system','daily','area_done','daily',$1)`, [{ area: a, niche: niche.config.niche }]);
    }
    return out;
  });
  await step("licenses", () => enrichLicenses(pool, 400));
  await step("audit", () => auditProspects(pool, limits.audits));
  await step("findEmails", () => findEmails(pool, limits.emailSearches, { niche: niche.config.niche }));
  await step("score1", () => scoreAll(pool));
  await step("guessEmails", () => guessEmails(pool, limits.guesses, niche.config.niche));
  await step("score2", () => scoreAll(pool));
  await step("build", async () => {
    // Only build for prospects that could actually be emailed: qualified/no-site, verified, good score.
    const ps = (await pool.query(`SELECT id FROM prospects WHERE website_state = 'none' AND contact_verified AND fit_score >= $1
      AND (prospect_state = 'qualified' OR (outreach_template = 'no_website' AND prospect_state IN ('discovered','qualified')))
      AND (license_status IS NULL OR license_status = 'ACTIVE')
      AND niche_version_id IN (SELECT id FROM niche_versions WHERE niche_id = $3) ORDER BY fit_score DESC LIMIT $2`, [limits.minScore, limits.builds, niche.config.niche])).rows;
    const out = { attempted: ps.length, approved: 0, edits: 0, failed: 0, errors: [] as string[] };
    for (const p of ps) {
      try {
        // No-website prospects never get an audit; qualify them on fit before building.
        await pool.query(`UPDATE prospects SET prospect_state = 'qualified' WHERE id = $1 AND prospect_state = 'discovered' AND outreach_template = 'no_website'`, [p.id]);
        const r: any = await buildAndReview(pool, p.id);
        if (r.verdict === "approved") out.approved++; else out.edits++;
      } catch (e) {
        out.failed++;
        const msg = e instanceof Error ? e.message : String(e);
        out.errors.push(`#${p.id}: ${msg.slice(0, 200)}`);
        await pool.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('prospect',$1,$2)`, [String(p.id), `build failed: ${msg.slice(0, 300)}`]);
      }
    }
    return out;
  });
  await step("queue", () => queueLeads(pool, { minScore: limits.minScore, limit: limits.queue, niche: niche.config.niche }));
  report.finishedAt = new Date().toISOString();
  await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('system','daily','daily_run','daily',$1)`, [report]);
  return report;
}
