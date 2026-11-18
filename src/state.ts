import type { Db } from "./db.js";

/** Allowed transitions per lifecycle track. Anything else is rejected. */
export const TRANSITIONS = {
  prospect_state: {
    discovered: ["qualified", "closed"],
    qualified: ["contacted", "closed"],
    contacted: ["interested", "closed"],
    interested: ["purchased", "closed"],
    purchased: [],
    closed: [],
  },
  website_state: {
    none: ["build_queued"],
    build_queued: ["building"],
    building: ["reviewing"],
    reviewing: ["approved", "changes_requested", "replacement_requested"],
    changes_requested: ["building"],
    replacement_requested: ["building"],
    approved: ["ready_to_send", "building"],
    ready_to_send: ["sent", "building"],
    sent: ["customer_approved", "building"],
    customer_approved: ["live"],
    live: ["building"],
  },
  email_state: { eligible: ["suppressed"], suppressed: [] },
  sms_state: { missing: ["granted"], granted: ["withdrawn"], withdrawn: ["granted"] },
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type Track = keyof typeof TRANSITIONS;

export class TransitionError extends Error {}

/**
 * Move a prospect along one track, atomically and only from the expected state.
 * Writes an event row. Use inside a transaction when combined with other writes.
 */
export async function transition(
  db: Db,
  prospectId: number,
  track: Track,
  to: string,
  actor: string,
  detail: Record<string, unknown> = {},
): Promise<string> {
  const cur = await db.query(`SELECT ${track} AS s FROM prospects WHERE id = $1 FOR UPDATE`, [prospectId]);
  if (!cur.rowCount) throw new TransitionError(`prospect ${prospectId} not found`);
  const from: string = cur.rows[0].s;
  const allowed = (TRANSITIONS[track] as Record<string, readonly string[]>)[from] ?? [];
  if (!allowed.includes(to)) throw new TransitionError(`${track}: ${from} -> ${to} not allowed`);
  await db.query(`UPDATE prospects SET ${track} = $2, updated_at = now() WHERE id = $1`, [prospectId, to]);
  await db.query(
    `INSERT INTO events(subject_type, subject_id, track, from_state, to_state, actor, detail)
     VALUES ('prospect', $1, $2, $3, $4, $5, $6)`,
    [String(prospectId), track, from, to, actor, detail],
  );
  return from;
}
