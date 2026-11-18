/**
 * LOCKED initial cold email. Do not change this wording without Micah's
 * explicit approval (plan section 6). Opt-in link added with approval 2026-11-18. Placeholders are filled only with
 * verified data; rendering refuses anything missing.
 */
export const LOCKED_SUBJECT = "A new website for [Company]";
export const LOCKED_BODY = `Hi [First Name],

I noticed your website is missing [X], [Y], and [Z]. I’ve attached a short audit showing what I found.

I went ahead and built a new website for [Company] that addresses these issues.

Just reply with your cell number and permission to text you the preview, or enter it here: [Link]. No obligation.

—[Name]`;

/** Approved fallback when no first name is verified (owner may revise). */
export const GREETING_FALLBACK = (company: string) => `${company} team`;

export interface EmailVars {
  company: string;
  firstName: string | null;
  findings: [string, string, string];
  senderName: string;
  optInUrl: string; // our SMS opt-in page for this prospect
}

export function renderInitialEmail(v: EmailVars): { subject: string; body: string } {
  for (const [k, val] of Object.entries({ company: v.company, senderName: v.senderName })) {
    if (!val.trim()) throw new Error(`missing ${k}`);
  }
  if (v.findings.length !== 3 || v.findings.some((f) => !f.trim())) throw new Error("need exactly 3 findings");
  const greeting = v.firstName?.trim() || GREETING_FALLBACK(v.company);
  const fill = (s: string) =>
    s
      .replaceAll("[Company]", v.company)
      .replaceAll("[First Name]", greeting)
      .replace("[X]", v.findings[0])
      .replace("[Y]", v.findings[1])
      .replace("[Z]", v.findings[2])
      .replaceAll("[Name]", v.senderName)
      .replaceAll("[Link]", v.optInUrl);
  if (!/^https:\/\//.test(v.optInUrl)) throw new Error("opt-in link must be https");
  const out = { subject: fill(LOCKED_SUBJECT), body: fill(LOCKED_BODY) };
  if (/\[[A-Z][^\]]*\]/.test(out.subject + out.body)) throw new Error("unfilled placeholder");
  return out;
}

/**
 * LOCKED email for businesses with no website (approved by Micah 2026-11-18).
 * [N] and [Rating] come only from the business's Google listing.
 */
export const LOCKED_NO_SITE_SUBJECT = "A website for [Company]";
export const LOCKED_NO_SITE_BODY = `Hi [First Name],

I came across [Company] on Google. You have [N] reviews averaging [Rating] stars, but no website linked to your listing, so homeowners who find you there can\u2019t see your services or request an estimate online.

I went ahead and built a website for [Company] using your public business information.

Just reply with your cell number and permission to text you the preview, or enter it here: [Link]. No obligation.

\u2014[Name]`;

export interface NoSiteVars {
  company: string;
  firstName: string | null;
  reviewCount: number;
  rating: number;
  senderName: string;
  optInUrl: string;
}

export function renderNoWebsiteEmail(v: NoSiteVars): { subject: string; body: string } {
  if (!v.company.trim() || !v.senderName.trim()) throw new Error("missing company or sender");
  if (!Number.isInteger(v.reviewCount) || v.reviewCount < 5) throw new Error("need at least 5 verified reviews");
  if (!(v.rating >= 1 && v.rating <= 5)) throw new Error("invalid rating");
  const greeting = v.firstName?.trim() || GREETING_FALLBACK(v.company);
  const fill = (s: string) => s.replaceAll("[Company]", v.company).replaceAll("[First Name]", greeting)
    .replace("[N]", String(v.reviewCount)).replace("[Rating]", v.rating.toFixed(1)).replaceAll("[Name]", v.senderName)
    .replaceAll("[Link]", v.optInUrl);
  if (!/^https:\/\//.test(v.optInUrl)) throw new Error("opt-in link must be https");
  const out = { subject: fill(LOCKED_NO_SITE_SUBJECT), body: fill(LOCKED_NO_SITE_BODY) };
  if (/\[[A-Z][^\]]*\]/.test(out.subject + out.body)) throw new Error("unfilled placeholder");
  return out;
}
