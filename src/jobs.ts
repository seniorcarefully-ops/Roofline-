import type pg from "pg";
import type { Db } from "./db.js";

export interface Job {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

/** Enqueue once per idempotency key; returns the existing job id on repeat. */
export async function enqueue(
  db: Db,
  kind: string,
  payload: Record<string, unknown>,
  opts: { key?: string; maxAttempts?: number; runAfter?: Date } = {},
): Promise<number> {
  const r = await db.query(
    `INSERT INTO jobs(kind, payload, idempotency_key, max_attempts, run_after)
     VALUES ($1, $2, $3, $4, COALESCE($5, now()))
     ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
     RETURNING id`,
    [kind, payload, opts.key ?? null, opts.maxAttempts ?? 3, opts.runAfter ?? null],
  );
  return Number(r.rows[0].id);
}

/** Claim one ready job; concurrent workers never receive the same job. */
export async function claim(db: Db, kinds?: string[]): Promise<Job | null> {
  const r = await db.query(
    `UPDATE jobs SET status = 'running', attempts = attempts + 1, locked_at = now(), updated_at = now()
     WHERE id = (
       SELECT id FROM jobs WHERE status = 'queued' AND run_after <= now()
         AND ($1::text[] IS NULL OR kind = ANY($1))
       ORDER BY run_after, id FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id, kind, payload, attempts, max_attempts`,
    [kinds ?? null],
  );
  return r.rowCount ? { ...r.rows[0], id: Number(r.rows[0].id) } : null;
}

export async function complete(db: Db, id: number): Promise<void> {
  await db.query(`UPDATE jobs SET status = 'done', locked_at = NULL, updated_at = now() WHERE id = $1`, [id]);
}

/** Retry with backoff; after max attempts mark failed and open an exception for the owner. */
export async function fail(db: Db, job: Job, error: string): Promise<"retry" | "failed"> {
  if (job.attempts < job.max_attempts) {
    const delay = 30 * 2 ** (job.attempts - 1);
    await db.query(
      `UPDATE jobs SET status = 'queued', locked_at = NULL, last_error = $2,
         run_after = now() + make_interval(secs => $3), updated_at = now() WHERE id = $1`,
      [job.id, error, delay],
    );
    return "retry";
  }
  await db.query(
    `UPDATE jobs SET status = 'failed', locked_at = NULL, last_error = $2, updated_at = now() WHERE id = $1`,
    [job.id, error],
  );
  await db.query(
    `INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('job', $1, $2)`,
    [String(job.id), `${job.kind} failed after ${job.attempts} attempts: ${error}`],
  );
  return "failed";
}

/** Process at most one job with the given handlers. Returns false when idle. */
export async function runOnce(
  pool: pg.Pool,
  handlers: Record<string, (job: Job) => Promise<void>>,
): Promise<boolean> {
  const job = await claim(pool, Object.keys(handlers));
  if (!job) return false;
  try {
    await handlers[job.kind]!(job);
    await complete(pool, job.id);
  } catch (e) {
    await fail(pool, job, e instanceof Error ? e.message : String(e));
  }
  return true;
}
