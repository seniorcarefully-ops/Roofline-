import type { Db } from "../db.js";
import { NicheConfig } from "./schema.js";

/** Store a new immutable config version. Returns its id. */
export async function publishNicheVersion(db: Db, config: NicheConfig): Promise<number> {
  const c = NicheConfig.parse(config);
  await db.query(`INSERT INTO niches(id) VALUES ($1) ON CONFLICT DO NOTHING`, [c.niche]);
  const r = await db.query(
    `INSERT INTO niche_versions(niche_id, version, config)
     SELECT $1, COALESCE(MAX(version), 0) + 1, $2 FROM niche_versions WHERE niche_id = $1
     RETURNING id`,
    [c.niche, c],
  );
  return Number(r.rows[0].id);
}

/** Switch the public niche. Existing prospects keep their own version. */
export async function activateNicheVersion(db: Db, versionId: number, actor: string): Promise<void> {
  const prev = await db.query(`SELECT active_niche_version FROM settings`);
  await db.query(`UPDATE settings SET active_niche_version = $1`, [versionId]);
  await db.query(
    `INSERT INTO events(subject_type, subject_id, track, from_state, to_state, actor)
     VALUES ('settings', 'active_niche', 'niche', $1, $2, $3)`,
    [prev.rows[0]?.active_niche_version?.toString() ?? null, String(versionId), actor],
  );
}

export async function activeNiche(db: Db): Promise<{ id: number; config: NicheConfig } | null> {
  const r = await db.query(
    `SELECT v.id, v.config FROM settings s JOIN niche_versions v ON v.id = s.active_niche_version`,
  );
  return r.rowCount ? { id: Number(r.rows[0].id), config: NicheConfig.parse(r.rows[0].config) } : null;
}

/**
 * Publish the code's current config for a niche if it differs from the latest stored
 * version, activate it, and move prospects that have NOT been contacted yet onto it.
 * Contacted prospects keep the version they were contacted under.
 */
export async function refreshNiche(db: Db, config: NicheConfig, actor: string): Promise<{ version: number; moved: number }> {
  const c = NicheConfig.parse(config);
  const latest = (await db.query(
    `SELECT id, config FROM niche_versions WHERE niche_id = $1 ORDER BY version DESC LIMIT 1`, [c.niche])).rows[0];
  const id = latest && JSON.stringify(latest.config) === JSON.stringify(c) ? Number(latest.id) : await publishNicheVersion(db, c);
  await activateNicheVersion(db, id, actor);
  const moved = await db.query(
    `UPDATE prospects p SET niche_version_id = $1, updated_at = now()
     FROM niche_versions v WHERE v.id = p.niche_version_id AND v.niche_id = $2 AND p.niche_version_id <> $1
       AND p.prospect_state IN ('discovered','qualified')
       AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.prospect_id = p.id AND m.direction = 'outbound')`,
    [id, c.niche]);
  return { version: id, moved: moved.rowCount ?? 0 };
}
