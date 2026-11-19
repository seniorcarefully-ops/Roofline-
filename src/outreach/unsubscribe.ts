import type pg from "pg";
import { removeLeadEverywhere } from "./instantly.js";

/** Suppress a prospect's email everywhere. Idempotent. */
export async function unsubscribeByToken(pool: pg.Pool, token: string, source: string): Promise<{ ok: boolean; company?: string }> {
  const p = (await pool.query(`SELECT id, contact_email, email_state, business_name FROM prospects WHERE unsub_token = $1`, [token])).rows[0];
  if (!p) return { ok: false };
  if (p.contact_email)
    await pool.query(`INSERT INTO suppressions(channel, address, reason) VALUES ('email', lower($1), 'unsubscribe') ON CONFLICT DO NOTHING`, [p.contact_email]);
  if (p.email_state !== "suppressed") {
    await pool.query(`UPDATE prospects SET email_state = 'suppressed', updated_at = now() WHERE id = $1`, [p.id]);
    await pool.query(`INSERT INTO events(subject_type, subject_id, track, from_state, to_state, actor, detail)
      VALUES ('prospect',$1,'email_state',$2,'suppressed','unsubscribe',$3)`, [String(p.id), p.email_state, { source }]);
  }
  await pool.query(`UPDATE jobs SET status = 'done', last_error = 'canceled: unsubscribed', updated_at = now()
    WHERE status = 'queued' AND kind LIKE 'outreach.%' AND payload->>'prospect_id' = $1`, [String(p.id)]);
  if (p.contact_email) await removeLeadEverywhere(p.contact_email).catch(() => {});
  return { ok: true, company: p.business_name };
}
