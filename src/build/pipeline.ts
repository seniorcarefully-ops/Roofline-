import { join } from "node:path";
import type pg from "pg";
import { NicheConfig } from "../niches/schema.js";
import { transition } from "../state.js";
import { assembleBrief } from "./assemble.js";
import { renderRidge, writePreview } from "./render.js";
import { reviewPreview } from "./review.js";

export const PREVIEW_DIR = process.env.PREVIEW_DIR ?? join(process.cwd(), "data", "previews");
export const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
export const MAX_REVISIONS = 2;

export const purchaseUrlFor = (prospectId: number, version: number) => `${APP_BASE_URL}/p/${prospectId}/v${version}/buy`;

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
  const buy = purchaseUrlFor(prospectId, version);
  const out = await writePreview(join(PREVIEW_DIR, String(prospectId), `v${version}`), renderRidge(brief, brand, buy));
  const pv = await pool.query(
    `INSERT INTO previews(prospect_id, version, url, content_hash) VALUES ($1,$2,$3,$4) RETURNING id`,
    [prospectId, version, out.path, out.hash]);
  await transition(pool, prospectId, "website_state", "reviewing", "builder", { version, sources: brief.sources });

  const r = await reviewPreview(out.path, brief, buy);
  await pool.query(`INSERT INTO reviews(preview_id, verdict, checks, reviewer) VALUES ($1,$2,$3,'auto-reviewer')`,
    [pv.rows[0].id, r.verdict, JSON.stringify(r.checks)]);
  if (r.verdict === "approved") {
    await transition(pool, prospectId, "website_state", "approved", "auto-reviewer");
    await transition(pool, prospectId, "website_state", "ready_to_send", "auto-reviewer");
  } else {
    await pool.query(`UPDATE prospects SET revision_count = revision_count + 1 WHERE id = $1`, [prospectId]);
    await transition(pool, prospectId, "website_state", "changes_requested", "auto-reviewer",
      { failed: r.checks.filter((c) => !c.pass) });
  }
  return { verdict: r.verdict, version, path: out.path, checks: r.checks };
}
