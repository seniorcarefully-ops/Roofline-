import type pg from "pg";
import { bondAndInsurance, confidentMatch, findLicenses, firstNameFromPrincipal } from "./lni.js";

/**
 * Check WA license data for prospects in Washington. An expired/suspended license
 * closes the prospect (we do not target unlicensed contractors). Non-WA prospects
 * are left unverified: no license claims will be made for them.
 */
export async function enrichLicenses(pool: pg.Pool, limit = 200) {
  const ps = (await pool.query(
    `SELECT id, business_name, phone, address, prospect_state FROM prospects
     WHERE license_checked_at IS NULL AND prospect_state IN ('discovered','qualified') ORDER BY id LIMIT $1`, [limit])).rows;
  const s = { checked: 0, active: 0, inactive: 0, notFound: 0, outOfState: 0 };
  for (const p of ps) {
    if (!/,\s*WA\b/.test(p.address ?? "")) {
      s.outOfState++;
      await pool.query(`UPDATE prospects SET license_checked_at = now() WHERE id = $1`, [p.id]);
      continue;
    }
    s.checked++;
    const m = confidentMatch(await findLicenses(p.business_name, p.phone), p.business_name, p.phone);
    if (!m) {
      s.notFound++;
      await pool.query(`UPDATE prospects SET license_checked_at = now() WHERE id = $1`, [p.id]);
      continue;
    }
    const l = m.license;
    const bi = l.status === "ACTIVE" ? await bondAndInsurance(l.license) : { bonded: null, insured: null };
    await pool.query(
      `UPDATE prospects SET license_number=$2, license_status=$3, license_bonded=$4, license_insured=$5, license_match=$6,
         principal_first_name=$7, license_since=$8, license_checked_at=now(),
         contact_first_name = COALESCE(contact_first_name, $7) WHERE id=$1`,
      [p.id, l.license, l.status, bi.bonded, bi.insured, m.by, firstNameFromPrincipal(l.principal), l.effective ? l.effective.slice(0, 10) : null]);
    await pool.query(
      `INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'license','lni',$2)`,
      [String(p.id), { license: l.license, status: l.status, match: m.by, ...bi, source: "data.wa.gov m8qx-ubtq" }]);
    if (l.status === "ACTIVE") s.active++;
    else {
      s.inactive++;
      await pool.query(`UPDATE prospects SET prospect_state='closed', next_action=$2, updated_at=now() WHERE id=$1`,
        [p.id, `closed: WA license ${l.status}`]);
      await pool.query(`INSERT INTO events(subject_type, subject_id, track, from_state, to_state, actor, detail)
        VALUES ('prospect',$1,'prospect_state',$2,'closed','lni',$3)`, [String(p.id), p.prospect_state, { reason: `license ${l.status}` }]);
    }
  }
  return s;
}
