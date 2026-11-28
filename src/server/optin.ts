import { displayName } from "../build/branding.js";
import type pg from "pg";
import type { NicheConfig } from "../niches/schema.js";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const SENDER_NAME = process.env.SENDER_NAME ?? "Cole";

/** Exact consent wording shown next to the checkbox; stored verbatim with each opt-in. */
export const consentText = (brand: string) =>
  `I agree to receive text messages from ${brand} about my website preview, including follow-up questions and offers. ` +
  `Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.`;

export interface OptinData {
  token: string;
  brand: NicheConfig["brand"];
  niche: string;
  company: string;
  firstName: string | null;
  template: "website_audit" | "no_website";
  findings: { code: string; title: string; detail: string; image: string | null; captured: string }[];
  rating: number | null;
  reviews: number | null;
  hasThumb: boolean;
}

/** Load everything the opt-in page shows, only for an approved preview. */
export async function loadOptin(pool: pg.Pool, token: string): Promise<OptinData | null> {
  const r = await pool.query(
    `SELECT pv.id, pv.prospect_id, pv.thumb IS NOT NULL AS has_thumb, p.business_name, p.contact_first_name, p.outreach_template,
            p.google_rating, p.google_review_count, p.prospect_state, v.config,
            (SELECT verdict FROM reviews WHERE preview_id = pv.id ORDER BY id DESC LIMIT 1) AS verdict
     FROM previews pv JOIN prospects p ON p.id = pv.prospect_id JOIN niche_versions v ON v.id = p.niche_version_id
     WHERE pv.token = $1`, [token]);
  const row = r.rows[0];
  if (!row || row.verdict !== "approved" || row.prospect_state === "closed") return null;
  const cfg = row.config as NicheConfig;
  const order = new Map(cfg.audit.priorities.map((x, i) => [x.code, i]));
  const phrase = new Map(cfg.audit.priorities.map((x) => [x.code, x.phrase]));
  const f = (await pool.query(
    `SELECT f.code, f.detail, f.evidence_path, f.captured_at, EXISTS(SELECT 1 FROM evidence_images e WHERE e.prospect_id = f.prospect_id AND e.key = f.evidence_path) AS has_img
     FROM audit_findings f WHERE f.prospect_id = $1 AND f.verified`, [row.prospect_id])).rows
    .filter((x) => order.has(x.code)).sort((a, b) => order.get(a.code)! - order.get(b.code)!).slice(0, 3);
  return {
    token, brand: cfg.brand, niche: cfg.niche, company: row.business_name, firstName: row.contact_first_name,
    template: row.outreach_template,
    findings: f.map((x) => ({ code: x.code, title: phrase.get(x.code)!, detail: x.detail,
      image: x.has_img ? `/s/${token}/img/${encodeURIComponent(x.evidence_path)}` : null,
      captured: new Date(x.captured_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) })),
    rating: row.google_rating != null ? Number(row.google_rating) : null,
    reviews: row.google_review_count,
    hasThumb: row.has_thumb,
  };
}

const nichePlural: Record<string, string> = { roofing: "roofers" };

export function renderOptin(d: OptinData, state: { error?: string; phone?: string } = {}): string {
  const c = esc(displayName(d.company));
  const hi = d.firstName ? `Hi ${esc(d.firstName)},` : `Hi there,`;
  const smsLive = !!process.env.TWILIO_FROM_NUMBER;
  const previewHref = `/p/${d.token}`;
  const nowImg = d.findings.find((f) => f.image)?.image ?? null;
  const compare = d.hasThumb && nowImg ? `<section class="vs"><div class="wrap">
<span class="kicker">Side by side</span><h2>Your site today vs. the new one</h2>
<div class="pair"><figure><div class="phone sm"><div class="scr"><img src="${nowImg}" alt="The current ${c} website on a phone"></div></div><figcaption>Your site today</figcaption></figure>
<div class="arrow" aria-hidden="true">→</div>
<figure><a href="${previewHref}" class="phone sm new"><div class="scr"><img src="/s/${d.token}/thumb.jpg" alt="The new ${c} website on a phone"></div></a><figcaption><b>Your new site</b> · <a href="${previewHref}">open it</a></figcaption></figure></div>
</div></section>` : "";
  const who = nichePlural[d.niche] ?? "local businesses";
  const audit = d.template === "website_audit" && d.findings.length
    ? `<section class="audit"><div class="wrap">
<span class="kicker">The audit</span><h2>${d.findings.length} things your website is missing</h2>
<p class="sub">I checked ${c}'s website on an iPhone, the way most homeowners find you. Here's what came up.</p>
<div class="finds">${d.findings.map((f, i) => `<article class="find">
${f.image ? `<div class="shot"><img src="${f.image}" alt="Screenshot of the current ${c} website on a phone" loading="lazy"></div>` : ""}
<div class="txt"><span class="num">0${i + 1}</span><h3>Missing ${esc(f.title)}</h3><p>${esc(f.detail)}</p><small>Checked ${esc(f.captured)}</small></div>
</article>`).join("")}</div></div></section>`
    : d.template === "no_website"
      ? `<section class="audit"><div class="wrap"><span class="kicker">What I noticed</span>
<h2>Homeowners love you on Google, but there's nowhere to go.</h2>
<p class="sub">${d.reviews && d.rating ? `${c} has <b>${d.reviews} reviews averaging ${d.rating.toFixed(1)} stars</b>, but no website linked to your listing.` : `${c} has no website linked to your Google listing.`} People who find you can't see your services or request an estimate online.</p></div></section>`
      : "";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#0f1621">
<title>${c}: your website audit · ${esc(d.brand.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@700;800&display=swap" rel="stylesheet">
<style>
:root{--ink:#0f1621;--ink2:#3b4452;--muted:#6b7380;--line:#e7e9ee;--soft:#f5f6f8;--accent:${esc(d.brand.colors.accent)};--night:${esc(d.brand.colors.primary)};--bad:#dc2626}
*{box-sizing:border-box}body{margin:0;font:16.5px/1.65 Inter,system-ui,sans-serif;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:"Inter Tight",Inter,sans-serif;letter-spacing:-.025em;line-height:1.08;margin:0}
.wrap{max-width:1040px;margin:0 auto;padding:0 22px}
.top{background:var(--night);color:#fff}.top .wrap{display:flex;align-items:center;gap:12px;min-height:64px;font:700 18px "Inter Tight",sans-serif}
.logo{width:34px;height:34px;border-radius:10px;background:var(--accent);display:grid;place-items:center}
.logo svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.hero{background:var(--night);color:#fff;padding:36px 0 64px}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.hi{color:#ffb38a;font-weight:600;margin:0 0 10px}
.hero h1{font-size:clamp(34px,5.6vw,56px);margin:0 0 16px}.hero p{color:rgba(255,255,255,.78);font-size:18px;margin:0 0 26px}
.kicker{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.kicker::before{content:"";width:24px;height:2px;background:currentColor}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:16px 24px;border-radius:999px;border:0;background:var(--accent);color:#fff;font:600 17px Inter,sans-serif;text-decoration:none;cursor:pointer}
.phone{position:relative;justify-self:center;width:min(300px,78vw);aspect-ratio:390/688;border-radius:42px;background:#0b0f17;padding:12px;box-shadow:0 30px 70px rgba(0,0,0,.45),inset 0 0 0 2px #2a3240}
.phone .scr{position:relative;width:100%;height:100%;border-radius:32px;overflow:hidden;background:#1b2533}
.phone{display:block}.phone img{width:100%;height:100%;object-fit:cover;object-position:top}
.vs h2{font-size:clamp(30px,4.4vw,46px);margin:14px 0 30px}.pair{display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
.pair figure{margin:0;text-align:center}.pair figcaption{margin-top:14px;font-weight:600;color:var(--ink2)}
.phone.sm{width:min(250px,40vw)}.phone.new{box-shadow:0 30px 70px rgba(0,0,0,.35),0 0 0 4px var(--accent)}
.arrow{font:800 40px "Inter Tight",sans-serif;color:var(--accent)}.alt{background:var(--soft);border-radius:22px;padding:30px}.alt p{margin:14px 0 0;color:var(--ink2);text-align:center}
@media (max-width:600px){.phone.sm{width:42vw;border-radius:26px;padding:7px}.phone.sm .scr{border-radius:20px}.pair{gap:10px;flex-wrap:nowrap}.arrow{font-size:26px}}
.lock{position:absolute;inset:0;display:grid;place-content:center;gap:10px;text-align:center;color:#fff;background:linear-gradient(180deg,rgba(15,22,33,.15),rgba(15,22,33,.65));padding:20px}
.lock b{font:800 22px/1.15 "Inter Tight",sans-serif}.lock span{font-size:14px;color:rgba(255,255,255,.85)}
.lock i{width:48px;height:48px;border-radius:50%;background:var(--accent);display:grid;place-items:center;margin:0 auto}
.lock i svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
section{padding:72px 0}.audit{background:var(--soft)}
.audit h2{font-size:clamp(30px,4.4vw,46px);margin:14px 0 10px}.sub{color:var(--ink2);font-size:18px;max-width:40em;margin:0 0 36px}
.finds{display:grid;gap:22px}
.find{display:grid;grid-template-columns:260px 1fr;gap:28px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px}
.shot{border-radius:14px;overflow:hidden;border:1px solid var(--line);aspect-ratio:9/12;background:var(--soft);position:relative}
.shot::after{content:"";position:absolute;inset:10px;border:3px solid var(--bad);border-radius:12px;opacity:.85}
.shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.num{font:800 15px "Inter Tight",sans-serif;color:var(--bad);letter-spacing:.06em}
.find h3{font-size:24px;margin:6px 0 8px}.find p{margin:0 0 8px;color:var(--ink2)}.find small{color:var(--muted)}
.cta .wrap{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.cta h2{font-size:clamp(30px,4.4vw,46px);margin:14px 0 14px}.cta p{color:var(--ink2);font-size:18px}
form{background:var(--night);color:#fff;border-radius:22px;padding:30px;display:grid;gap:14px}
form label.f{font-weight:600}form input[type=tel]{font:500 20px Inter,sans-serif;padding:16px 18px;border-radius:14px;border:1.5px solid #334155;background:#0b1220;color:#fff;width:100%}
form input[type=tel]:focus{outline:2px solid var(--accent);border-color:transparent}
.consent{display:grid;grid-template-columns:22px 1fr;gap:10px;font-size:13px;line-height:1.5;color:rgba(255,255,255,.75)}
.consent input{width:20px;height:20px;margin:2px 0 0;accent-color:var(--accent)}
.err{background:#fee2e2;color:#991b1b;border-radius:10px;padding:10px 14px;font-weight:600;font-size:15px}
.me{display:flex;gap:14px;align-items:center;margin-top:24px;color:var(--ink2)}
.me i{flex:none;width:46px;height:46px;border-radius:50%;background:var(--night);color:#fff;display:grid;place-items:center;font:700 18px "Inter Tight",sans-serif;font-style:normal}
footer{padding:30px 0 100px;text-align:center;color:var(--muted);font-size:13.5px;border-top:1px solid var(--line)}
.sticky{position:fixed;left:12px;right:12px;bottom:12px;z-index:9;display:none}
.sticky .btn{width:100%;box-shadow:0 10px 30px rgba(0,0,0,.3)}
@media (max-width:860px){.hero .wrap,.cta .wrap{grid-template-columns:1fr}.find{grid-template-columns:1fr}.shot{aspect-ratio:4/3}.sticky{display:block}section{padding:56px 0}}
</style></head><body>
<div class="top"><div class="wrap"><span class="logo"><svg viewBox="0 0 24 24"><path d="M3 12l9-8 9 8"/><path d="M6 10.5V20h12v-9.5"/></svg></span>${esc(d.brand.name)}</div></div>
<div class="hero"><div class="wrap"><div>
<p class="hi">${hi}</p>
<h1>I built ${c} a new website.</h1>
<p>${d.template === "website_audit" ? "Below is a short audit of your current site, and the new one I built to fix it." : "It's built from your public business info and ready to see."}</p>
<a class="btn" href="${previewHref}">See your new website</a></div>
<a class="phone" href="${previewHref}"><div class="scr">${d.hasThumb ? `<img class="clear" src="/s/${d.token}/thumb.jpg" alt="Your new website">` : ""}</div></a>
</div></div>
${compare}
${audit}
<section class="cta" id="get"><div class="wrap"><div>
<span class="kicker">See your new site</span><h2>${smsLive ? "Get the preview on your phone." : "Your new site is ready."}</h2>
<p>${smsLive ? "I'll text you the link in a few seconds. You can ask me anything about it by text. No obligation." : "Take a look. If you like it, it can go live on your domain. No obligation."}</p>
<div class="me"><i>${esc(SENDER_NAME.slice(0, 1))}</i><span><b>${esc(SENDER_NAME)}, ${esc(d.brand.name)}</b><br>I build websites just for ${who}.</span></div></div>
${smsLive ? "" : `<div class="alt"><a class="btn" href="${previewHref}" style="width:100%">See your new website</a><p>Questions? Just reply to my email.</p></div>`}
${smsLive ? `<form method="post" action="/s/${d.token}/optin">
${state.error ? `<div class="err">${esc(state.error)}</div>` : ""}
<label class="f" for="ph">Your cell number</label>
<input id="ph" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(509) 555-0123" required value="${esc(state.phone ?? "")}">
<label class="consent"><input type="checkbox" name="consent" value="yes" required><span>${esc(consentText(d.brand.name))}</span></label>
<button class="btn" type="submit">Text me the preview</button>
</form>` : ""}</div></section>
<footer>${esc(d.brand.name)} · ${esc(d.brand.tagline)}<br>You're seeing this because we built a website preview for ${c}. Not interested? Just ignore it.</footer>
<div class="sticky"><a class="btn" href="${smsLive ? "#get" : previewHref}">${smsLive ? "Text me the preview" : "See your new website"}</a></div>
</body></html>`;
}
