/**
 * Washington L&I contractor license data (public, data.wa.gov, updated daily).
 * Used to verify license status, owner name (for greetings), bond, and insurance.
 */
const BASE = "https://data.wa.gov/resource";

export interface LniLicense {
  license: string;
  businessName: string;
  status: string;            // ACTIVE, EXPIRED, SUSPENDED, ...
  expires: string | null;
  specialties: string[];
  phone: string | null;
  principal: string | null;  // "LAST, FIRST" as registered
  ubi: string | null;
}

async function soql(dataset: string, where: string, limit = 20): Promise<any[]> {
  const url = `${BASE}/${dataset}.json?$limit=${limit}&$where=${encodeURIComponent(where)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`data.wa.gov ${r.status}`);
  return r.json() as Promise<any[]>;
}

const q = (s: string) => s.replace(/'/g, "''");
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);

function toLicense(r: any): LniLicense {
  return {
    license: r.contractorlicensenumber,
    businessName: r.businessname,
    status: r.contractorlicensestatus,
    expires: r.licenseexpirationdate ?? null,
    specialties: [r.specialtycode1desc, r.specialtycode2desc].filter(Boolean),
    phone: r.phonenumber ?? null,
    principal: r.primaryprincipalname ?? null,
    ubi: r.ubi ?? null,
  };
}

/** Find licenses matching a business by phone (strongest) or exact normalized name. */
export async function findLicenses(name: string, phone: string | null): Promise<LniLicense[]> {
  const out = new Map<string, LniLicense>();
  const ph = digits(phone);
  if (ph.length === 10) for (const r of await soql("m8qx-ubtq", `phonenumber='${ph}'`)) out.set(r.contractorlicensenumber, toLicense(r));
  const core = name.toUpperCase().replace(/[.,]/g, "").replace(/\b(LLC|INC|CO|CORP|COMPANY)\b/g, "").trim();
  if (core.length >= 4)
    for (const r of await soql("m8qx-ubtq", `upper(businessname) like '${q(core)}%'`)) out.set(r.contractorlicensenumber, toLicense(r));
  return [...out.values()];
}

/** Active license if one exists; otherwise the most recent record (to report why not). */
export function bestLicense(ls: LniLicense[]): LniLicense | null {
  return ls.find((l) => l.status === "ACTIVE") ?? [...ls].sort((a, b) => (b.expires ?? "").localeCompare(a.expires ?? ""))[0] ?? null;
}

/** "ALDANA ROJAS, LUIGI" -> "Luigi". Null if the format is not clearly LAST, FIRST. */
export function firstNameFromPrincipal(p: string | null): string | null {
  const m = p?.match(/^[^,]+,\s*([A-Za-z'-]{2,})/);
  if (!m) return null;
  const f = m[1]!;
  return f[0]!.toUpperCase() + f.slice(1).toLowerCase();
}

/** Bond and insurance currently on file for a license. */
export async function bondAndInsurance(license: string): Promise<{ bonded: boolean; insured: boolean }> {
  const today = new Date().toISOString().slice(0, 10);
  const [bonds, ins] = await Promise.all([
    soql("bzff-4fmt", `contractorlicensenumber='${q(license)}'`, 50),
    soql("ciwg-agsx", `contractorlicensenumber='${q(license)}'`, 50),
  ]);
  // An end value that is not a date (e.g. "Until Canceled") counts as open-ended.
  const current = (rows: any[], startKey: string, endKey: string) => rows.some((r) => {
    const start = String(r[startKey] ?? "").slice(0, 10), end = String(r[endKey] ?? "");
    const endOk = !/^\d{4}-\d{2}-\d{2}/.test(end) || end.slice(0, 10) >= today;
    return start !== "" && start <= today && endOk;
  });
  return {
    bonded: current(bonds, "bondeffectivedate", "bondexpirationdate"),
    insured: current(ins, "effectivedate", "expirationdate"),
  };
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Only accept a license when the phone matches or the business name matches exactly. */
export function confidentMatch(ls: LniLicense[], name: string, phone: string | null): { license: LniLicense; by: "phone" | "exact_name" } | null {
  const ph = digits(phone);
  const byPhone = ls.filter((l) => ph.length === 10 && digits(l.phone) === ph);
  const byName = ls.filter((l) => norm(l.businessName) === norm(name));
  const pick = bestLicense(byPhone.length ? byPhone : byName);
  return pick ? { license: pick, by: byPhone.length ? "phone" : "exact_name" } : null;
}
