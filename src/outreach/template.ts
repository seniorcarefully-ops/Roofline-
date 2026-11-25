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

/**
 * Required commercial-email footer (sender identity, postal address, opt-out).
 * Appended below the locked body; it does not change the approved wording.
 */
export function emailFooter(postalAddress: string | null, unsubscribeUrl: string): string {
  if (!postalAddress?.trim()) throw new Error("postal address missing: cannot send commercial email");
  if (!/^https:\/\//.test(unsubscribeUrl)) throw new Error("unsubscribe link must be https");
  return `\n\n--\n${postalAddress}\nNot interested? Reply "unsubscribe" or click: ${unsubscribeUrl}`;
}

/**
 * LOCKED main email (variant B; approved as the main cold email 2026-11-19).
 * The audit lives on the prospect's personal page ([Link]); no attachment.
 */
export const LOCKED_B_SUBJECT = "A new website for [Company]";
export const LOCKED_B_BODY = `Hi [First Name],

I noticed your website is missing [X], [Y], and [Z]. I put together a short audit showing what I found, and I went ahead and built a new website for [Company] that fixes these issues.

You can see both here: [Link]. Or just reply with your cell number and I'll text you the preview. No obligation.

\u2014[Name]
I build websites just for [Niche].`;

export function renderMainEmail(v: EmailVars & { nichePlural: string }): { subject: string; body: string } {
  if (!v.company.trim() || !v.senderName.trim()) throw new Error("missing company or sender");
  if (v.findings.length !== 3 || v.findings.some((f) => !f.trim())) throw new Error("need exactly 3 findings");
  if (!/^https:\/\//.test(v.optInUrl)) throw new Error("opt-in link must be https");
  const greeting = v.firstName?.trim() || GREETING_FALLBACK(v.company);
  const fill = (s: string) => s.replaceAll("[Company]", v.company).replaceAll("[First Name]", greeting)
    .replace("[X]", v.findings[0]).replace("[Y]", v.findings[1]).replace("[Z]", v.findings[2])
    .replaceAll("[Name]", v.senderName).replaceAll("[Link]", v.optInUrl).replaceAll("[Niche]", v.nichePlural);
  const out = { subject: fill(LOCKED_B_SUBJECT), body: fill(LOCKED_B_BODY) };
  if (/\[[A-Z][^\]]*\]/.test(out.subject + out.body)) throw new Error("unfilled placeholder");
  return out;
}

/** LOCKED 2-finding version of the main email (approved by Micah 2026-11-20): only the finding line differs. */
export const LOCKED_B2_BODY = LOCKED_B_BODY.replace("missing [X], [Y], and [Z].", "missing [X] and [Y].");

export function renderMainEmailAny(v: Omit<EmailVars, "findings"> & { findings: string[]; nichePlural: string }) {
  if (v.findings.length >= 3) return renderMainEmail({ ...v, findings: [v.findings[0]!, v.findings[1]!, v.findings[2]!] });
  if (v.findings.length !== 2 || v.findings.some((f) => !f.trim())) throw new Error("need 2 or 3 findings");
  if (!/^https:\/\//.test(v.optInUrl)) throw new Error("opt-in link must be https");
  const greeting = v.firstName?.trim() || GREETING_FALLBACK(v.company);
  const fill = (s: string) => s.replaceAll("[Company]", v.company).replaceAll("[First Name]", greeting)
    .replace("[X]", v.findings[0]!).replace("[Y]", v.findings[1]!)
    .replaceAll("[Name]", v.senderName).replaceAll("[Link]", v.optInUrl).replaceAll("[Niche]", v.nichePlural);
  const out = { subject: fill(LOCKED_B_SUBJECT), body: fill(LOCKED_B2_BODY) };
  if (/\[[A-Z][^\]]*\]/.test(out.subject + out.body)) throw new Error("unfilled placeholder");
  return out;
}

/**
 * LOCKED main email, version A (approved by Micah 2026-11-25: "I like version A").
 * Plain, short, NO links (links go out only after a reply, for inbox placement).
 * Opt-out is by reply. The detail line uses only verified data: Google review
 * count/rating from the listing and audit findings from screenshots.
 */
export const LOCKED_A_SUBJECT = "There's an issue with your website";
export const LOCKED_A_BODY = `Hi [Greeting],

Pulled up your site on my phone. [Detail]

I went ahead and built you a new version that fixes that. Want me to send it over?

[Name]`;

export interface EmailAVars {
  firstName: string | null;
  senderName: string;
  findings: string[];            // niche phrases, priority order (2+)
  codes: string[];               // matching finding codes
  reviewCount: number | null;    // verified Google listing data
  rating: number | null;
}

/** The one personal line. Reviews hook only when the audit proved reviews aren't on the site. */
export function detailLine(v: Pick<EmailAVars, "findings" | "codes" | "reviewCount" | "rating">): string {
  if (v.findings.length < 2 || v.findings.length !== v.codes.length || v.findings.some((f) => !f.trim())) throw new Error("need 2+ findings with codes");
  const ri = v.codes.indexOf("no_reviews_shown");
  if (ri >= 0 && (v.reviewCount ?? 0) >= 10 && (v.rating ?? 0) >= 4.5) {
    const other = v.findings.find((_, i) => i !== ri)!;
    return `You've got ${v.reviewCount} great Google reviews, but none of them show up on the site, and it's missing ${other}.`;
  }
  return `It's missing ${v.findings[0]} and ${v.findings[1]}.`;
}

export function renderEmailA(v: EmailAVars): { subject: string; body: string } {
  if (!v.senderName.trim()) throw new Error("missing sender");
  const first = v.firstName?.trim();
  const greeting = first && /^[A-Za-z][A-Za-z'-]{1,20}$/.test(first) ? first[0]!.toUpperCase() + first.slice(1).toLowerCase() : "there";
  const body = LOCKED_A_BODY.replace("[Greeting]", greeting).replace("[Detail]", detailLine(v)).replace("[Name]", v.senderName);
  if (/\[[A-Z][^\]]*\]/.test(body) || /https?:\/\//.test(body)) throw new Error("unfilled placeholder or link in version A");
  return { subject: LOCKED_A_SUBJECT, body };
}

/** Footer for version A: identity, postal address, reply-based opt-out. No links. */
export function emailFooterA(postalAddress: string | null): string {
  if (!postalAddress?.trim()) throw new Error("postal address missing: cannot send commercial email");
  return `\n\n${postalAddress}\nReply "no" and I won't email again.`;
}
