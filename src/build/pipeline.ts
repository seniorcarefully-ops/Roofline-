import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type pg from "pg";
import { NicheConfig } from "../niches/schema.js";
import { transition } from "../state.js";
import { assembleBrief } from "./assemble.js";
import { renderRidge, writePreview } from "./render.js";
import { fetchLiveReviews } from "./reviews.js";
import { reviewPreview } from "./review.js";

export const PREVIEW_DIR = process.env.PREVIEW_DIR ?? join(process.cwd(), "data", "previews");
export const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
export const MAX_REVISIONS = 2;

export const previewUrlFor = (token: string) => `${APP_BASE_URL}/p/${token}`;
export const purchaseUrlFor = (token: string) => `${APP_BASE_URL}/p/${token}/buy`;

/** Build one preview version, review it independently, and move it to ready_to_send or changes_requested. */
export async function buildAndReview(pool: pg.Pool, prospectId: number) {
  const p = (await pool.query(
    `SELECT p.*, v.config FROM prospects p JOIN niche_versions v ON v.id = p.niche_version_id WHERE p.id = $1`, [prospectId])).rows[0];
  if (!p) throw new Error("prospect not found");
  if (p.revision_count >= MAX_REVISIONS) {
    await pool.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('prospect',$1,'revision cap reached')`, [String(prospectId)]);
    return { verdict: "escalated" as const };
  }
  const brand = NicheConfig.parse(p.config).brand;
  if (p.website_state === "none") await transition(pool, prospectId, "website_state", "build_queued", "builder");
  await transition(pool, prospectId, "website_state", "building", "builder");

  const version = Number((await pool.query(`SELECT COALESCE(MAX(version),0)+1 v FROM previews WHERE prospect_id=$1`, [prospectId])).rows[0].v);
  const brief = await assembleBrief(pool, prospectId, version);
  const token = randomBytes(16).toString("base64url");
  const buy = purchaseUrlFor(token);
  const live = brief.placeId ? await fetchLiveReviews(brief.placeId).catch(() => null) : null;
  // The static file is the reviewed snapshot; the server re-renders with fresh live reviews.
  const out = await writePreview(join(PREVIEW_DIR, String(prospectId), `v${version}`), renderRidge(brief, brand, { purchaseUrl: buy, live }));
  const pv = await pool.query(
    `INSERT INTO previews(prospect_id, version, url, content_hash, brief, token) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [prospectId, version, previewUrlFor(token), out.hash, JSON.stringify(brief), token]);
  await transition(pool, prospectId, "website_state", "reviewing", "builder", { version, sources: brief.sources });

  const r = await reviewPreview(out.path, brief, buy);
  await pool.query(`INSERT INTO reviews(preview_id, verdict, checks, reviewer) VALUES ($1,$2,$3,'auto-reviewer')`,
    [pv.rows[0].id, r.verdict, JSON.stringify(r.checks)]);
  if (r.verdict === "approved") {
    // Thumbnail of the approved preview for the opt-in page (blurred there).
    try {
      const { launchBrowser } = await import("../research/inspect.js");
      const { devices } = await import("playwright");
      const { pathToFileURL } = await import("node:url");
      const b = await launchBrowser();
      try {
        const pg2 = await (await b.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2 })).newPage();
        await pg2.goto(pathToFileURL(out.path).href, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
        await pg2.addStyleTag({ content: "#rl-bar{display:none!important}" });
        const png = await pg2.screenshot({ type: "png" });
        await pool.query(`UPDATE previews SET thumb = $2 WHERE id = $1`, [pv.rows[0].id, png]);
      } finally { await b.close(); }
    } catch (e) { console.error("thumbnail failed:", e instanceof Error ? e.message : e); }
    await transition(pool, prospectId, "website_state", "approved", "auto-reviewer");
    await transition(pool, prospectId, "website_state", "ready_to_send", "auto-reviewer");
  } else {
    await pool.query(`UPDATE prospects SET revision_count = revision_count + 1 WHERE id = $1`, [prospectId]);
    await transition(pool, prospectId, "website_state", "changes_requested", "auto-reviewer",
      { failed: r.checks.filter((c) => !c.pass) });
  }
  return { verdict: r.verdict, version, url: previewUrlFor(token), file: out.path, checks: r.checks };
}
