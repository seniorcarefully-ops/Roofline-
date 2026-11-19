import type pg from "pg";

/**
 * Find a contact email for a prospect from its OWN website (homepage + contact/about
 * pages), then verify it with Instantly's verification API. Only "valid" results
 * are marked verified; risky/catch-all/unknown are stored but not sendable.
 */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g;
const JUNK = /(example\.|domain\.com|email\.com|sentry|wixpress|godaddy|squarespace|wordpress|\.png|\.jpg|\.webp|\.gif|@2x|noreply|no-reply|donotreply|privacy@|abuse@|webmaster@)/i;
const PATHS = ["", "contact", "contact-us", "about", "about-us"];

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; RooflineWebsitesBot/1.0)" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return "";
    return (await r.text()).slice(0, 2_000_000);
  } catch { return ""; } finally { clearTimeout(t); }
}

/** Decode common obfuscations: "name [at] domain [dot] com", HTML entities, mailto: links. */
export function extractEmails(html: string): string[] {
  const text = html
    .replace(/&#64;|&#x40;/gi, "@").replace(/&#46;|&#x2e;/gi, ".")
    .replace(/\s*[\[(]\s*at\s*[\])]\s*/gi, "@").replace(/\s*[\[(]\s*dot\s*[\])]\s*/gi, ".")
    .replace(/%40/g, "@");
  const found = new Set<string>();
  for (const m of text.match(EMAIL_RE) ?? []) {
    const e = m.toLowerCase().replace(/^mailto:/, "").replace(/[.,;:]+$/, "");
    if (!JUNK.test(e) && e.length <= 80) found.add(e);
  }
  return [...found];
}

/** Rank: same domain as the website first; owner-ish names before generic inboxes; free webmail last. */
export function rankEmails(emails: string[], siteDomain: string | null, firstName: string | null): string[] {
  const free = /@(gmail|yahoo|hotmail|outlook|aol|icloud|comcast|msn|live)\./;
  const score = (e: string) => {
    let s = 0;
    const [local, dom] = e.split("@") as [string, string];
    if (siteDomain && (dom === siteDomain || dom.endsWith(`.${siteDomain}`))) s += 100;
    if (firstName && local.includes(firstName.toLowerCase())) s += 40;
    if (/^(info|office|contact|sales|estimates?|hello|service|admin)$/.test(local)) s += 20;
    if (free.test(e)) s += 10; // small roofers often use Gmail; still usable, ranked after own-domain
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a));
}

export async function verifyEmail(email: string): Promise<{ status: string; catchAll: boolean }> {
  const r = await fetch("https://api.instantly.ai/api/v2/email-verification", {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.INSTANTLY_API_KEY ? { Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}` } : {}) },
    body: JSON.stringify({ email }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(`verification ${r.status}: ${d?.message}`);
  return { status: d.verification_status ?? "unknown", catchAll: !!d.catch_all };
}

export async function findEmails(pool: pg.Pool, limit = 50, opts: { verify?: boolean; niche?: string } = {}) {
  const ps = (await pool.query(
    `SELECT id, website_url, normalized_domain, contact_first_name FROM prospects
     WHERE contact_email IS NULL AND website_url IS NOT NULL AND prospect_state IN ('discovered','qualified')
       AND NOT EXISTS (SELECT 1 FROM events e WHERE e.subject_type='prospect' AND e.subject_id=prospects.id::text AND e.track='email_search')
       AND ($2::text IS NULL OR niche_version_id IN (SELECT id FROM niche_versions WHERE niche_id = $2))
     ORDER BY (prospect_state = 'qualified') DESC, id LIMIT $1`, [limit, opts.niche ?? null])).rows;
  const s = { searched: 0, found: 0, verified: 0, risky: 0, invalid: 0, none: 0 };
  for (const p of ps) {
    s.searched++;
    const base = new URL(p.website_url);
    const seen = new Set<string>();
    for (const path of PATHS) {
      const html = await fetchText(new URL(`/${path}`, base.origin).toString());
      for (const e of extractEmails(html)) seen.add(e);
      if ([...seen].some((e) => p.normalized_domain && e.endsWith(`@${p.normalized_domain}`))) break;
    }
    const ranked = rankEmails([...seen], p.normalized_domain, p.contact_first_name);
    let chosen: string | null = ranked[0] ?? null, status = "not_found", catchAll = false;
    if (chosen) {
      s.found++;
      if (opts.verify !== false) {
        const v = await verifyEmail(chosen).catch((e) => ({ status: `error: ${e.message}`, catchAll: false }));
        status = v.status; catchAll = v.catchAll;
      } else status = "unverified";
    } else s.none++;
    const ok = (status === "valid" || status === "verified") && !catchAll;
    if (ok) s.verified++; else if (status === "invalid") s.invalid++; else if (chosen) s.risky++;
    if (chosen && status !== "invalid")
      await pool.query(`UPDATE prospects SET contact_email = $2, contact_verified = $3, updated_at = now() WHERE id = $1`, [p.id, chosen, ok]);
    await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'email_search','email_finder',$2)`,
      [String(p.id), { candidates: ranked.slice(0, 5), chosen, status, catch_all: catchAll }]);
  }
  return s;
}

/** Verify stored-but-unverified emails (e.g. found earlier without verification). */
export async function verifyPending(pool: pg.Pool, limit = 100) {
  const ps = (await pool.query(
    `SELECT id, contact_email FROM prospects WHERE contact_email IS NOT NULL AND NOT contact_verified
       AND NOT EXISTS (SELECT 1 FROM events e WHERE e.subject_type='prospect' AND e.subject_id=prospects.id::text AND e.track='email_verify')
     ORDER BY id LIMIT $1`, [limit])).rows;
  const s: Record<string, number> = { checked: 0, valid: 0, catch_all: 0, invalid: 0, other: 0 };
  for (const p of ps) {
    const v = await verifyEmail(p.contact_email).catch((e) => ({ status: `error: ${e.message}`, catchAll: false }));
    s.checked!++;
    const ok = (v.status === "valid" || v.status === "verified") && !v.catchAll;
    if (ok) s.valid!++; else if (v.catchAll) s.catch_all!++; else if (v.status === "invalid") s.invalid!++; else s.other!++;
    if (v.status === "invalid") await pool.query(`UPDATE prospects SET contact_email = NULL, contact_verified = false WHERE id = $1`, [p.id]);
    else await pool.query(`UPDATE prospects SET contact_verified = $2 WHERE id = $1`, [p.id, ok]);
    await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'email_verify','email_finder',$2)`,
      [String(p.id), { email: p.contact_email, status: v.status, catch_all: v.catchAll }]);
  }
  return s;
}

const WEBHOST = /(wix|squarespace|godaddysites|weebly|business\.site|wordpress\.com|webflow|yolasite|site123)/i;

/** Guess common inboxes on the business's own domain; keep only verified, non-catch-all. Max 3 checks. */
export async function guessEmails(pool: pg.Pool, limit = 50, niche: string | null = null) {
  const ps = (await pool.query(
    `SELECT id, normalized_domain, principal_first_name FROM prospects p
     WHERE contact_email IS NULL AND normalized_domain IS NOT NULL AND prospect_state IN ('discovered','qualified')
       AND (license_status IS NULL OR license_status = 'ACTIVE')
       AND NOT EXISTS (SELECT 1 FROM events e WHERE e.subject_type='prospect' AND e.subject_id=p.id::text AND e.track='email_guess')
       AND ($2::text IS NULL OR p.niche_version_id IN (SELECT id FROM niche_versions WHERE niche_id = $2))
     ORDER BY fit_score DESC NULLS LAST, id LIMIT $1`, [limit, niche])).rows;
  const s = { tried: 0, found: 0, catchAll: 0, none: 0, checks: 0 };
  for (const p of ps) {
    if (WEBHOST.test(p.normalized_domain)) continue;
    s.tried++;
    const cands = [p.principal_first_name ? p.principal_first_name.toLowerCase() : null, "info", "office"].filter(Boolean) as string[];
    let result: { email: string | null; status: string } = { email: null, status: "none" };
    for (const local of cands) {
      const email = `${local}@${p.normalized_domain}`;
      const v = await verifyEmail(email).catch(() => ({ status: "error", catchAll: false }));
      s.checks++;
      if (v.catchAll) { result = { email: null, status: "catch_all_domain" }; s.catchAll++; break; } // every guess would "pass": unusable
      if (v.status === "verified" || v.status === "valid") { result = { email, status: "verified" }; break; }
    }
    if (result.email) {
      s.found++;
      await pool.query(`UPDATE prospects SET contact_email = $2, contact_verified = true WHERE id = $1`, [p.id, result.email]);
    } else if (result.status === "none") s.none++;
    await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'email_guess','email_finder',$2)`,
      [String(p.id), { tried: cands, ...result }]);
  }
  return s;
}
