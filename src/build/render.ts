import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NicheConfig } from "../niches/schema.js";
import { BuildBrief } from "./brief.js";
import { MIN_RATING_FOR_REVIEWS, type LiveReviews } from "./reviews.js";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const STAR = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>`;
const stars = (n: number) => `<span class="stars" aria-label="${n} out of 5 stars">${STAR.repeat(Math.round(n))}</span>`;

const ICONS: Record<string, string> = {
  repair: `<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>`,
  replace: `<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>`,
  default: `<path d="M3 12l9-8 9 8"/><path d="M6 10v10h12V10"/>`,
};
const icon = (name: string) => {
  const k = /repair/i.test(name) ? "repair" : /replace/i.test(name) ? "replace" : "default";
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
};

/** Brand-neutral hero illustration: our own artwork, never presented as the roofer's work. */
const HERO_ART = `<svg class="art" viewBox="0 0 600 360" aria-hidden="true" preserveAspectRatio="xMidYMax slice">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2533"/><stop offset="1" stop-color="#2d3b50"/></linearGradient>
<linearGradient id="roofA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4a61"/><stop offset="1" stop-color="#25303f"/></linearGradient></defs>
<rect width="600" height="360" fill="url(#sky)"/>
<circle cx="480" cy="90" r="46" fill="#f59e0b" opacity=".18"/>
<polygon points="40,250 210,120 380,250" fill="url(#roofA)"/><polygon points="230,250 400,95 570,250" fill="#33435a"/>
<g stroke="#4b5d78" stroke-width="2" opacity=".55">${Array.from({ length: 9 }, (_, i) => `<line x1="${250 + i * 17}" y1="${232 - i * 15.5}" x2="${550 - i * 17}" y2="${232 - i * 15.5}"/>`).join("")}</g>
<rect x="70" y="250" width="280" height="110" fill="#202a38"/><rect x="260" y="250" width="280" height="110" fill="#1d2633"/>
<rect x="110" y="282" width="46" height="40" rx="3" fill="#f59e0b" opacity=".35"/><rect x="300" y="282" width="46" height="40" rx="3" fill="#f59e0b" opacity=".25"/>
<rect x="440" y="282" width="46" height="40" rx="3" fill="#f59e0b" opacity=".3"/></svg>`;

export interface RenderOptions {
  purchaseUrl: string;
  live?: LiveReviews | null; // live Google reviews, never stored
}

/**
 * "Ridge" one-page roofing site. Complete sections; every statement is either a
 * verified fact from the brief or a general statement that makes no claim.
 * Preview safeguards: noindex, preview-only form, separate purchase bar.
 */
export function renderRidge(input: BuildBrief, brand: NicheConfig["brand"], opts: RenderOptions): string {
  const b = BuildBrief.parse(input);
  const name = esc(b.businessName);
  const tel = b.phoneE164 ? `tel:${b.phoneE164}` : null;
  const phone = esc(b.phone ?? "");
  const city = b.city ? esc(b.city) : null;
  const rating = opts.live?.rating ?? b.rating;
  const count = opts.live?.count ?? b.reviewCount;
  const showReviews = !!rating && rating >= MIN_RATING_FOR_REVIEWS && !!count;
  const mapsUrl = opts.live?.mapsUrl ?? b.googleMapsUrl;

  const trust: string[] = [];
  if (showReviews) trust.push(`${stars(rating!)}<span><b>${rating!.toFixed(1)}</b> from ${count} Google reviews</span>`);
  if (b.license) {
    const parts = ["Licensed", b.license.bonded ? "bonded" : null, b.license.insured ? "insured" : null].filter(Boolean);
    trust.push(`<span><b>${parts.join(", ").replace(/, ([^,]*)$/, " & $1")}</b> · WA #${esc(b.license.number)}</span>`);
  }
  if (city) trust.push(`<span>Local to <b>${city}</b></span>`);

  const why: [string, string][] = [];
  if (showReviews) why.push(["Rated by real customers", `${rating!.toFixed(1)} stars across ${count} reviews on Google.`]);
  if (b.license) why.push([`Licensed${b.license.bonded ? " & bonded" : ""}${b.license.insured ? " & insured" : ""}`,
    `Washington contractor license #${esc(b.license.number)}, verifiable with L&amp;I.`]);
  if (city) why.push(["Local", `Based in ${city}, close to the homes we work on.`]);
  why.push(["Straight answers", "Call and talk to a person about your roof and what it needs."]);

  const reviewCards = showReviews && opts.live?.reviews.length
    ? opts.live.reviews.slice(0, 3).map((r) => `<figure class="rev">${stars(r.rating)}<blockquote>${esc(r.text.length > 320 ? r.text.slice(0, 317).trimEnd() + "…" : r.text)}</blockquote>
<figcaption>${r.authorUrl ? `<a href="${esc(r.authorUrl)}" rel="noopener nofollow">${esc(r.author)}</a>` : esc(r.author)}${r.when ? ` · ${esc(r.when)}` : ""}</figcaption></figure>`).join("")
    : "";
  const reviewsSection = showReviews ? `<section id="reviews"><div class="wrap">
<div class="sec-head"><h2>What customers say</h2><p class="big-rating">${stars(rating!)} <b>${rating!.toFixed(1)}</b> · ${count} Google reviews</p></div>
${reviewCards ? `<div class="revs">${reviewCards}</div>` : ""}
<p class="attr">Reviews from Google${mapsUrl ? ` · <a href="${esc(mapsUrl)}" rel="noopener">See all reviews on Google</a>` : ""}</p>
</div></section>` : "";

  const services = b.services.map((s) => `<li>${icon(s)}<h3>${esc(s)}</h3></li>`).join("");
  const area = b.serviceArea.length ? `Serving ${esc(b.serviceArea.join(", "))}.` : city ? `Based in ${city}. Call to confirm we cover your address.` : "Call to confirm we cover your address.";
  const mapQ = encodeURIComponent(`${b.businessName}${b.city ? ", " + b.city : ""}`);
  const hours = b.hours?.length ? `<div class="card"><h3>Hours</h3><ul class="hours">${b.hours.map((h) => {
    const [d, ...t] = h.split(": "); return `<li><span>${esc(d ?? "")}</span><span>${esc(t.join(": "))}</span></li>`; }).join("")}</ul></div>` : "";
  const callBtn = (cls = "btn") => (tel ? `<a class="${cls}" href="${tel}">Call ${phone}</a>` : "");

  const faqs: [string, string][] = [
    ["How do I get an estimate?", tel ? `Call ${phone} or send a request with the form on this page.` : "Send a request with the form on this page."],
    ["Do you work in my area?", area],
    ...(b.hours?.length ? [["When can I reach you?", "Our hours are listed on this page. Leave a message after hours and we'll get back to you."] as [string, string]] : []),
    ...(b.license ? [["Are you licensed?", `Yes. Washington contractor license #${esc(b.license.number)}${b.license.bonded && b.license.insured ? ", bonded and insured" : ""}.`] as [string, string]] : []),
  ];

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${name}${city ? ` | Roofing in ${city}` : " | Roofing"}</title>
<meta name="description" content="${name}: roofing${city ? ` in ${city}` : ""}. Call ${phone} for an estimate.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--ink:#111827;--ink2:#374151;--muted:#6b7280;--line:#e5e7eb;--soft:#f6f7f9;--navy:#1b2533;--accent:#d9480f;--accent2:#b93c0b;--gold:#f59e0b}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:16.5px/1.6 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:#fff;padding-bottom:76px;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}h1,h2,h3{letter-spacing:-.02em;line-height:1.15;margin:0}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;border:0;font-size:16px;cursor:pointer;transition:background .15s}
.btn:hover{background:var(--accent2)}.btn.ghost{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.5)}
header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;color:var(--ink);text-decoration:none;min-width:0}
.logo svg{flex:none;width:30px;height:30px}.logo span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
nav{display:flex;gap:22px;font-weight:600;font-size:15px}nav a{color:var(--ink2);text-decoration:none}
header .btn{padding:10px 16px;white-space:nowrap}
.hero{position:relative;color:#fff;background:var(--navy);overflow:hidden}
.hero .art{position:absolute;inset:0;width:100%;height:100%}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,24,39,.92) 0%,rgba(17,24,39,.75) 55%,rgba(17,24,39,.35) 100%)}
.hero .wrap{position:relative;z-index:1;padding-top:84px;padding-bottom:84px}
.eyebrow{display:inline-block;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fbbf8a;margin-bottom:14px}
.hero h1{font-size:clamp(34px,6vw,58px);max-width:15ch;margin-bottom:16px}
.hero p.lead{font-size:clamp(17px,2.2vw,20px);color:#d1d5db;max-width:34em;margin:0 0 28px}
.cta{display:flex;flex-wrap:wrap;gap:12px}
.trust{background:#fff;border-bottom:1px solid var(--line)}
.trust .wrap{display:flex;flex-wrap:wrap;gap:12px 32px;padding-top:18px;padding-bottom:18px;font-size:15px;color:var(--ink2)}
.trust .wrap>div{display:flex;align-items:center;gap:8px}
.stars{display:inline-flex;gap:2px;vertical-align:middle}.stars svg{width:17px;height:17px;fill:var(--gold)}
section{padding:80px 0}.soft{background:var(--soft)}
.sec-head{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:12px;margin-bottom:32px}
.sec-head h2{font-size:clamp(28px,4vw,38px)}.sec-head p{margin:0;color:var(--muted);max-width:36em}
.svc{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;list-style:none;padding:0;margin:0}
.svc li{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px;transition:box-shadow .2s,transform .2s}
.svc li:hover{box-shadow:0 12px 30px rgba(17,24,39,.08);transform:translateY(-2px)}
.ico{width:44px;height:44px;padding:10px;border-radius:12px;background:#fff1ea;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-bottom:16px}
.svc h3{font-size:20px}
.why{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:28px}
.why div{border-top:3px solid var(--accent);padding-top:18px}.why h3{font-size:18px;margin-bottom:6px}.why p{margin:0;color:var(--ink2)}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;counter-reset:s;list-style:none;padding:0;margin:0}
.steps li{background:#fff;border:1px solid var(--line);border-radius:16px;padding:26px;counter-increment:s}
.steps li::before{content:counter(s);display:inline-grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--navy);color:#fff;font-weight:800;margin-bottom:14px}
.steps h3{font-size:18px;margin-bottom:6px}.steps p{margin:0;color:var(--ink2)}
.revs{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.rev{margin:0;background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:12px}
.rev blockquote{margin:0;color:var(--ink2)}.rev figcaption{font-size:14px;color:var(--muted);font-weight:600}.rev figcaption a{color:inherit}
.big-rating{display:flex;align-items:center;gap:8px;font-size:17px}.attr{margin-top:18px;font-size:14px;color:var(--muted)}
.two{display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:start}
.map{width:100%;height:340px;border:0;border-radius:16px;background:#e5e7eb}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px}.card h3{font-size:18px;margin-bottom:12px}
.hours{list-style:none;margin:0;padding:0}.hours li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #eef0f3;font-size:15px}
.hours li:last-child{border:0}
details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 22px;margin-bottom:12px}
summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:12px}summary::after{content:"+";color:var(--accent);font-size:22px;line-height:1}
details[open] summary::after{content:"–"}details p{margin:12px 0 0;color:var(--ink2)}
.estimate{background:var(--navy);color:#fff;border-radius:24px;padding:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.estimate h2{font-size:clamp(28px,4vw,38px);margin-bottom:12px}.estimate p{color:#cbd5e1}
form{display:grid;gap:12px}input,textarea{font:inherit;padding:14px 16px;border:1px solid #334155;border-radius:10px;background:#0f1724;color:#fff}
input::placeholder,textarea::placeholder{color:#94a3b8}.note{font-size:14px;color:#94a3b8;margin:0}
footer{padding:40px 0;color:var(--muted);font-size:14px}footer .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px}
#rl-bar{position:fixed;left:0;right:0;bottom:0;z-index:50;background:#0b0f17;color:#e5e7eb;border-top:3px solid ${esc(brand.colors.accent)}}
#rl-bar .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;font-size:14.5px}
#rl-bar b{color:#fff}#rl-bar .btn{background:${esc(brand.colors.accent)};padding:11px 18px;white-space:nowrap;font-size:15px}
@media (max-width:820px){nav{display:none}.two,.estimate{grid-template-columns:1fr}.estimate{padding:32px 22px}section{padding:60px 0}
.hero .wrap{padding-top:64px;padding-bottom:64px}.hero::after{background:linear-gradient(180deg,rgba(17,24,39,.88),rgba(17,24,39,.8))}}
@media (max-width:480px){#rl-bar .wrap{font-size:12.5px}#rl-bar .hide-sm{display:none}.cta .btn{width:100%}}
</style></head>
<body>
<header><div class="wrap">
<a class="logo" href="#top"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#1b2533"/><path d="M6 19l10-9 10 9" stroke="#d9480f" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 18v7h12v-7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/></svg><span>${name}</span></a>
<nav><a href="#services">Services</a>${showReviews ? `<a href="#reviews">Reviews</a>` : ""}<a href="#area">Service area</a><a href="#faq">FAQ</a></nav>
${tel ? `<a class="btn" href="${tel}">Call now</a>` : `<a class="btn" href="#estimate">Get an estimate</a>`}
</div></header>
<main id="top">
<div class="hero">${HERO_ART}<div class="wrap">
<span class="eyebrow">Roofing${city ? ` · ${city}` : ""}</span>
<h1>${name}</h1>
<p class="lead">Roofing${city ? ` in ${city}` : ""} with straight answers. Tell us what's going on with your roof and we'll take it from there.</p>
<div class="cta">${callBtn()}<a class="btn ghost" href="#estimate">Request an estimate</a></div>
</div></div>
${trust.length ? `<div class="trust"><div class="wrap">${trust.map((t) => `<div>${t}</div>`).join("")}</div></div>` : ""}
<section id="services"><div class="wrap">
<div class="sec-head"><h2>Services</h2><p>Have something else in mind? Call and ask.</p></div>
<ul class="svc">${services}</ul>
</div></section>
<section class="soft"><div class="wrap">
<div class="sec-head"><h2>Why ${name}</h2></div>
<div class="why">${why.map(([h, p]) => `<div><h3>${h}</h3><p>${p}</p></div>`).join("")}</div>
</div></section>
${reviewsSection}
<section class="soft"><div class="wrap">
<div class="sec-head"><h2>How it works</h2></div>
<ol class="steps">
<li><h3>Reach out</h3><p>Call${tel ? ` ${phone}` : ""} or send a request with a few details about your roof.</p></li>
<li><h3>We take a look</h3><p>We'll talk through what you're seeing and what your roof needs.</p></li>
<li><h3>Get your estimate</h3><p>You get a clear estimate before any work starts.</p></li>
</ol>
</div></section>
<section id="area"><div class="wrap">
<div class="sec-head"><h2>Service area</h2><p>${area}</p></div>
<div class="two"><iframe class="map" title="Map of ${name}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${mapQ}&amp;output=embed"></iframe>
<div>${hours}${tel ? `<div class="card" style="margin-top:16px"><h3>Call</h3><a class="btn" href="${tel}">${phone}</a></div>` : ""}</div></div>
</div></section>
<section id="faq" class="soft"><div class="wrap">
<div class="sec-head"><h2>Questions</h2></div>
${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}
</div></section>
<section id="estimate"><div class="wrap"><div class="estimate">
<div><h2>Request an estimate</h2><p>Tell us a little about your roof and the best way to reach you.</p>${tel ? `<p>Prefer to talk? <a href="${tel}" style="color:#fbbf8a">${phone}</a></p>` : ""}</div>
<form data-preview="true" onsubmit="event.preventDefault();this.querySelector('.note').textContent='This is a preview, so the form is not active yet. Please call instead.'">
<input name="name" placeholder="Your name" autocomplete="name" aria-label="Your name">
<input name="phone" placeholder="Phone" autocomplete="tel" aria-label="Phone">
<input name="address" placeholder="Property address" autocomplete="street-address" aria-label="Property address">
<textarea name="msg" rows="3" placeholder="What's going on with your roof?" aria-label="What's going on with your roof?"></textarea>
<button class="btn" type="submit">Send request</button>
<p class="note">Preview: this form becomes active when the site goes live.</p>
</form></div></div></section>
</main>
<footer><div class="wrap"><span>© ${new Date().getFullYear()} ${name}${b.license ? ` · WA license #${esc(b.license.number)}` : ""}</span>${tel ? `<a href="${tel}">${phone}</a>` : ""}</div></footer>
<aside id="rl-bar" aria-label="${esc(brand.name)} preview"><div class="wrap">
<span><b>Your new site, built by ${esc(brand.name)}.</b> $150/month<span class="hide-sm"> · no setup fee · cancel anytime · free edits</span></span>
<a class="btn" href="${esc(opts.purchaseUrl)}">Get this site</a>
</div></aside>
</body></html>`;
}

export async function writePreview(dir: string, html: string): Promise<{ path: string; hash: string }> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, "index.html");
  await writeFile(path, html);
  return { path, hash: createHash("sha256").update(html).digest("hex") };
}
