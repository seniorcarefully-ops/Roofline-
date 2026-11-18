/**
 * LOCKED initial cold email. Do not change this wording without Micah's
 * explicit approval (plan section 6). Placeholders are filled only with
 * verified data; rendering refuses anything missing.
 */
export const LOCKED_SUBJECT = "A new website for [Company]";
export const LOCKED_BODY = `Hi [First Name],

I noticed your website is missing [X], [Y], and [Z]. I’ve attached a short audit showing what I found.

I went ahead and built a new website for [Company] that addresses these issues.

Just reply with your cell number and permission to text you the preview. No obligation.

—[Name]`;

/** Approved fallback when no first name is verified (owner may revise). */
export const GREETING_FALLBACK = (company: string) => `${company} team`;

export interface EmailVars {
  company: string;
  firstName: string | null;
  findings: [string, string, string];
  senderName: string;
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
      .replaceAll("[Name]", v.senderName);
  const out = { subject: fill(LOCKED_SUBJECT), body: fill(LOCKED_BODY) };
  if (/\[[A-Z][^\]]*\]/.test(out.subject + out.body)) throw new Error("unfilled placeholder");
  return out;
}
