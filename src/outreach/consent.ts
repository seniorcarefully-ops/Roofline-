import type { Db } from "../db.js";
import { transition } from "../state.js";

/** Normalize a US phone number to E.164, or null if not plausible. */
export function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

const STOP_WORDS = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|revoke|optout|opt out)\s*$/i;
export const isStopMessage = (body: string) => STOP_WORDS.test(body);

/**
 * Record SMS permission from the prospect's own reply. The reply text is stored
 * verbatim as evidence. A number found elsewhere is never treated as consent.
 */
export async function grantSms(
  db: Db,
  prospectId: number,
  phoneRaw: string,
  wording: string,
  source: string,
): Promise<string> {
  const phone = toE164(phoneRaw);
  if (!phone) throw new Error("invalid phone number");
  const sup = await db.query(`SELECT 1 FROM suppressions WHERE address = $1 AND channel IN ('sms','all')`, [phone]);
  if (sup.rowCount) throw new Error("number is suppressed; consent must be re-confirmed by the person via SMS");
  await db.query(
    `INSERT INTO consents(prospect_id, channel, action, phone_e164, wording, source, scope)
     VALUES ($1, 'sms', 'granted', $2, $3, $4, 'website preview and related questions')`,
    [prospectId, phone, wording, source],
  );
  await transition(db, prospectId, "sms_state", "granted", "consent", { phone, source });
  return phone;
}

/** Honor STOP: record withdrawal, suppress the number, update the track. */
export async function withdrawSms(db: Db, phone: string, wording: string, source: string): Promise<void> {
  await db.query(
    `INSERT INTO suppressions(channel, address, reason) VALUES ('sms', $1, 'stop') ON CONFLICT DO NOTHING`,
    [phone],
  );
  const ps = await db.query(
    `SELECT DISTINCT prospect_id FROM consents WHERE phone_e164 = $1 AND channel = 'sms'`,
    [phone],
  );
  for (const { prospect_id } of ps.rows) {
    await db.query(
      `INSERT INTO consents(prospect_id, channel, action, phone_e164, wording, source, scope)
       VALUES ($1, 'sms', 'withdrawn', $2, $3, $4, 'all sms')`,
      [prospect_id, phone, wording, source],
    );
    const cur = await db.query(`SELECT sms_state FROM prospects WHERE id = $1`, [prospect_id]);
    if (cur.rows[0]?.sms_state === "granted") {
      await transition(db, Number(prospect_id), "sms_state", "withdrawn", "consent", { source });
    }
  }
}
