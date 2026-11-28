import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NicheConfig } from "../niches/schema.js";
import { BuildBrief } from "./brief.js";
import { photoUrl, pickPhoto, serviceTag, type Photo } from "./photos.js";
import { MIN_RATING_FOR_REVIEWS, type LiveReviews } from "./reviews.js";
import { words } from "../niches/words.js";
import { accentPalette, displayName } from "./branding.js";
import { chooseDesign, factHeadlines } from "./design.js";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const STAR = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"/></svg>`;
const stars = (n: number) => `<span class="stars" aria-label="${n} out of 5 stars">${STAR.repeat(Math.round(n))}</span>`;
const CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const PHONE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>`;

export interface RenderOptions {
  purchaseUrl: string;
  live?: LiveReviews | null; // live Google reviews, never stored
  niche?: string;            // selects wording + photo library (default roofing)
}

/**
 * "Ridge" premium one-page roofing site. Complete sections; every statement is
 * either a verified fact from the brief or a general statement that makes no claim.
 * Photos come from the licensed Roofline library and are never captioned as the
 * roofer's own work. Preview safeguards: noindex, preview-only form, purchase bar.
 */
export function renderRidge(input: import("./brief.js").BuildBriefInput, brand: NicheConfig["brand"], opts: RenderOptions): string {
  const b = BuildBrief.parse(input);
  const niche = opts.niche ?? "roofing";
  const W = words(niche), T = W.trade[0]!.toUpperCase() + W.trade.slice(1);
  const shown = displayName(b.businessName);
  const name = esc(shown);
  const seedD = b.placeId ?? b.businessName;
  const D = chooseDesign(seedD, W.site.heroHeadlines ?? [W.site.heroHeadline],
    factHeadlines({ rating: input.rating ?? null, count: input.reviewCount ?? null, city: b.city ? b.city.split(",")[0]! : null,
      licensedSince: b.license?.since ?? null, state: b.license ? "Washington" : null }, W.one));
  const pal = accentPalette(b.branding?.accent ?? D.accent);
  const GENERIC = /^(roofing|roofers?|roof|construction|exteriors?|contracting|contractors?|company|services?|and|&|the|of|llc|inc|co)$/i;
  const initials = (shown.split(/\s+/).filter((w) => !GENERIC.test(w))[0] ?? shown).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "R";
  void initials;
  const logoHtml = `<a class="logo wm" href="#top"><span>${name}</span></a>`;
  const tel = b.phoneE164 ? `tel:${b.phoneE164}` : null;
  const phone = esc(b.phone ?? "");
  const city = b.city ? esc(b.city) : null;
  const cityShort = b.city ? esc(b.city.split(",")[0]!) : null;
  const rating = opts.live?.rating ?? b.rating;
  const count = opts.live?.count ?? b.reviewCount;
  const showReviews = !!rating && rating >= MIN_RATING_FOR_REVIEWS && !!count;
  const mapsUrl = opts.live?.mapsUrl ?? b.googleMapsUrl;
  const lic = b.license;
  const licWords = lic ? ["Licensed", lic.bonded ? "bonded" : null, lic.insured ? "insured" : null].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " & $1") : null;

  const seed = b.placeId ?? b.businessName;
  const used = new Set<string>();
  const take = (tag: string) => { const p = pickPhoto(tag, seed, used, niche) ?? pickPhoto("shingles", seed, used, niche); if (p) used.add(p.id); return p; };
  const hero = take(D.heroTag);
  const about = take("home");
  const ctaBg = take("shingles");
  const svc = b.services.map((s) => ({ s, p: take(serviceTag(s)) }));
  const credits = [hero, about, ctaBg, ...svc.map((x) => x.p)].filter((p): p is Photo => !!p);
  const img = (p: Photo | null, w: number, h: number, cls = "", lazy = true) => p
    ? `<img class="${cls}" src="${esc(photoUrl(p, w, h))}" srcset="${esc(photoUrl(p, Math.round(w / 2), Math.round(h / 2)))} ${Math.round(w / 2)}w, ${esc(photoUrl(p, w, h))} ${w}w" sizes="(max-width: 700px) 100vw, ${w}px" alt=""${lazy ? ` loading="lazy"` : ` fetchpriority="high"`} decoding="async">`
    : "";

  const stats: [string, string][] = [];
  if (showReviews) stats.push([rating!.toFixed(1), `Google rating`], [String(count), `Google reviews`]);
  if (lic?.since) stats.push([String(lic.since), "WA licensed since"]);
  if (lic && !lic.since) stats.push(["WA", "Licensed contractor"]);
  if (cityShort) stats.push([cityShort, W.site.statLabel]);

  const why: string[] = [];
  if (showReviews) why.push(`Rated ${rating!.toFixed(1)} stars by ${count} customers on Google`);
  if (lic) why.push(`${licWords} · Washington license #${esc(lic.number)}`);
  if (lic?.since) why.push(`Licensed in Washington since ${lic.since}`);
  if (city) why.push(`Based in ${city}`);
  why.push("Straight answers and a clear estimate before work starts");

  const reviewCards = showReviews && opts.live?.reviews.length
    ? opts.live.reviews.slice(0, 3).map((r) => `<figure class="rev">${stars(r.rating)}<blockquote>“${esc(r.text.length > 300 ? r.text.slice(0, 297).trimEnd() + "…" : r.text)}”</blockquote>
<figcaption>${r.photo ? `<img src="${esc(r.photo)}" alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer">` : `<span class="av">${esc(r.author.slice(0, 1))}</span>`}<span>${r.authorUrl ? `<a href="${esc(r.authorUrl)}" rel="noopener nofollow">${esc(r.author)}</a>` : esc(r.author)}<small>${esc(r.when)} · Google</small></span></figcaption></figure>`).join("")
    : "";

  const area = b.serviceArea.length ? `Serving ${esc(b.serviceArea.join(", "))}.` : city ? `Based in ${city}. Call to confirm we cover your address.` : "Call to confirm we cover your address.";
  const mapQ = encodeURIComponent(`${b.businessName}${b.city ? ", " + b.city : ""}`);
  const hours = b.hours?.length ? `<ul class="hours">${b.hours.map((h) => {
    const [d, ...t] = h.split(": "); return `<li><span>${esc(d ?? "")}</span><span>${esc(t.join(": ").replace(/ | /g, " "))}</span></li>`; }).join("")}</ul>` : "";

  const faqs: [string, string][] = [
    ["How do I get an estimate?", tel ? `Call ${phone} or send a request with the form on this page.` : "Send a request with the form on this page."],
    ["Do you work in my area?", area],
    ...(lic ? [["Are you licensed?", `Yes. Washington contractor license #${esc(lic.number)}${lic.bonded && lic.insured ? ", bonded and insured" : ""}. You can verify it with Washington L&amp;I.`] as [string, string]] : []),
    ...(b.hours?.length ? [["When can I reach you?", "Our hours are listed on this page. Leave a message after hours and we'll get back to you."] as [string, string]] : []),
    ["What happens after I reach out?", "We'll talk through what you're seeing, take a look, and give you a clear estimate before any work starts."],
  ];

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${name}${city ? ` | ${esc(T)} in ${city}` : ` | ${esc(T)}`}</title>
<meta name="description" content="${name}: ${esc(W.trade)}${city ? ` in ${city}` : ""}.${phone ? ` Call ${phone} for an estimate.` : ""}">
<meta name="theme-color" content="#0f1621">
${hero ? `<link rel="preload" as="image" href="${esc(photoUrl(hero, 1800, 1100))}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${D.fonts.url}&display=swap" rel="stylesheet">
<style>
:root{--fh:"${D.fonts.head}",system-ui,sans-serif;--fb:"${D.fonts.body}",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;--ink:#0f1621;--ink2:#3b4452;--muted:#6b7380;--line:#e7e9ee;--soft:#f5f6f8;--night:#0f1621;--accent:#e2561b;--tint:#fdebe2;--accent2:#c74813;--gold:#f6b13b;--r:20px}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:16.5px/1.65 var(--fb);color:var(--ink);background:#fff;padding-bottom:72px;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}img{max-width:100%;display:block}
h1,h2,h3{font-family:var(--fh);letter-spacing:-.025em;line-height:1.05;margin:0}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.kicker{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.kicker::before{content:"";width:28px;height:2px;background:currentColor}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:16px 26px;border-radius:999px;border:0;font-size:16px;cursor:pointer;transition:background .2s,transform .2s}
.btn:hover{background:var(--accent2);transform:translateY(-1px)}.btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}
.btn.light{background:#fff;color:var(--ink)}.btn.line{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55)}
.btn.line:hover{background:rgba(255,255,255,.1)}
header{position:absolute;top:0;left:0;right:0;z-index:20;color:#fff}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:84px}
.logo{display:flex;align-items:center;gap:12px;font:700 19px var(--fh);letter-spacing:-.01em;color:inherit;text-decoration:none;min-width:0}
.logo i{flex:none;width:38px;height:38px;border-radius:11px;background:var(--accent);display:grid;place-items:center}
.logo i svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.logo span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.logo i.ini{font:800 14px/1 var(--fh);color:#fff;letter-spacing:.02em}
.logo.has-img img{height:44px;width:auto;max-width:210px;object-fit:contain;background:#fff;padding:6px 10px;border-radius:10px}
nav{display:flex;gap:30px;font-size:15px;font-weight:500}nav a{color:rgba(255,255,255,.85);text-decoration:none}nav a:hover{color:#fff}
header .btn{padding:12px 20px;font-size:15px}
.hero{position:relative;min-height:min(860px,100svh);display:flex;align-items:flex-end;color:#fff;background:var(--night);overflow:hidden}
.hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.03)}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,22,33,.55) 0%,rgba(15,22,33,.15) 35%,rgba(15,22,33,.85) 100%),linear-gradient(90deg,rgba(15,22,33,.7),rgba(15,22,33,0) 70%)}
.hero .wrap{position:relative;z-index:1;width:100%;padding-top:160px;padding-bottom:72px;display:grid;grid-template-columns:1.4fr 1fr;gap:40px;align-items:end}
.hero .kicker{color:var(--accentl)}
.hero h1{font-size:clamp(44px,7.4vw,96px);margin:18px 0 22px;max-width:11ch}
.hero p{font-size:clamp(17px,1.6vw,20px);color:rgba(255,255,255,.82);max-width:32em;margin:0 0 32px}
.cta{display:flex;flex-wrap:wrap;gap:12px}
.badge{justify-self:end;background:rgba(255,255,255,.1);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.18);border-radius:var(--r);padding:22px 24px;max-width:320px}
.badge .big{font:800 44px/1 var(--fh);display:flex;align-items:center;gap:12px}
.badge p{font-size:14.5px;margin:10px 0 0;color:rgba(255,255,255,.8)}
.stars{display:inline-flex;gap:3px}.stars svg{width:18px;height:18px;fill:var(--gold)}
.stats{background:var(--night);color:#fff}
.stats .wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));border-top:1px solid rgba(255,255,255,.1)}
.stats div{padding:34px 24px 34px 0}.stats b{display:block;font:800 clamp(30px,3.6vw,44px)/1 var(--fh);letter-spacing:-.03em}
.stats span{display:block;margin-top:8px;font-size:14px;color:rgba(255,255,255,.62);text-transform:uppercase;letter-spacing:.08em}
section{padding:112px 0}.soft{background:var(--soft)}
.head{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end;margin-bottom:52px}
.head h2{font-size:clamp(34px,4.6vw,58px);margin-top:16px}.head p{margin:0;color:var(--ink2);font-size:18px;max-width:30em;justify-self:end}
.svc{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.card{position:relative;border-radius:var(--r);overflow:hidden;min-height:420px;display:flex;align-items:flex-end;color:#fff;background:#222}
.card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s}
.card:hover img{transform:scale(1.05)}
.card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,22,33,0) 35%,rgba(15,22,33,.88))}
.card div{position:relative;z-index:1;padding:28px}.card h3{font-size:30px}.card p{margin:8px 0 0;color:rgba(255,255,255,.8)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.split .ph{border-radius:var(--r);overflow:hidden;aspect-ratio:4/5}.split .ph img{width:100%;height:100%;object-fit:cover}
.split h2{font-size:clamp(34px,4.4vw,54px);margin:16px 0 22px}
.ticks{list-style:none;padding:0;margin:28px 0 36px;display:grid;gap:16px}
.ticks li{display:flex;gap:14px;align-items:flex-start;font-size:17px;font-weight:500}
.ticks svg{flex:none;width:26px;height:26px;padding:4px;border-radius:50%;background:var(--tint);fill:none;stroke:var(--accent);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.dark{background:var(--night);color:#fff}.dark .head p{color:rgba(255,255,255,.7)}
.revs{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.rev{margin:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:var(--r);padding:30px;display:flex;flex-direction:column;gap:18px}
.rev blockquote{margin:0;font-size:17px;line-height:1.6;color:rgba(255,255,255,.9);flex:1}
.rev figcaption{display:flex;align-items:center;gap:12px;font-weight:600}.rev figcaption img,.av{width:36px;height:36px;border-radius:50%;background:var(--accent);display:grid;place-items:center;font-weight:700}
.rev figcaption a{color:#fff;text-decoration:none}.rev small{display:block;font-weight:400;font-size:13px;color:rgba(255,255,255,.55)}
.attr{margin-top:28px;font-size:14px;color:rgba(255,255,255,.6)}.attr a{color:#fff}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;counter-reset:s;list-style:none;padding:0;margin:0}
.steps li{counter-increment:s;padding-top:28px;border-top:2px solid var(--ink)}
.steps li::before{content:"0" counter(s);font:800 15px var(--fh);color:var(--accent);letter-spacing:.06em}
.steps h3{font-size:26px;margin:14px 0 10px}.steps p{margin:0;color:var(--ink2)}
.area{display:grid;grid-template-columns:1.5fr 1fr;gap:24px}
.map{width:100%;height:100%;min-height:420px;border:0;border-radius:var(--r);background:#e8eaee}
.panel{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:30px}
.panel h3{font-size:22px;margin-bottom:14px}
.hours{list-style:none;margin:0 0 24px;padding:0}.hours li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:15px}
.hours li span:first-child{font-weight:600}
.faq{max-width:860px}
details{border-bottom:1px solid var(--line);padding:24px 0}
summary{font:600 20px var(--fh);letter-spacing:-.01em;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px}
summary::-webkit-details-marker{display:none}
summary::after{content:"";flex:none;width:28px;height:28px;border-radius:50%;background:var(--soft) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e2561b' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 6v12M6 12h12'/%3E%3C/svg%3E") center/16px no-repeat;transition:transform .2s}
details[open] summary::after{transform:rotate(45deg)}details p{margin:14px 0 0;color:var(--ink2);font-size:17px}
.final{position:relative;color:#fff;overflow:hidden;background:var(--night)}
.final>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35}
.final .wrap{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.final h2{font-size:clamp(36px,5vw,64px);margin:16px 0 18px}.final p{color:rgba(255,255,255,.78);font-size:18px}
form{display:grid;gap:12px;background:#fff;border-radius:var(--r);padding:30px;color:var(--ink)}
form h3{font-size:22px;margin-bottom:4px}
input,textarea{font:inherit;padding:15px 16px;border:1px solid var(--line);border-radius:12px;background:var(--soft);color:var(--ink)}
input:focus,textarea:focus{outline:2px solid var(--accent);border-color:transparent}
.note{font-size:13.5px;color:var(--muted);margin:0}
footer{padding:44px 0;color:var(--muted);font-size:14px;border-top:1px solid var(--line)}
footer .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 24px}footer a{color:var(--ink2)}
footer .cr{flex-basis:100%;font-size:12.5px}footer .cr a{color:var(--muted)}
#rl-bar{position:fixed;left:16px;right:16px;bottom:16px;z-index:50;background:rgba(11,15,23,.42);-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);color:#e5e7eb;border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.28),inset 0 0 0 1px rgba(255,255,255,.16);overflow:hidden}
#rl-fade{position:fixed;left:0;right:0;bottom:0;height:170px;z-index:49;pointer-events:none;background:linear-gradient(180deg,rgba(11,15,23,0),rgba(11,15,23,.35))}
#rl-bar .t,#rl-bar .p{text-shadow:0 1px 2px rgba(0,0,0,.35)}
#rl-bar::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,var(--accent),#f6b13b)}
#rl-bar .wrap{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:68px;padding:10px 12px 10px 22px}
#rl-bar .tag{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#0b0f17;background:#f6b13b;border-radius:999px;padding:3px 10px;margin-bottom:6px}
#rl-bar .t{display:block;font:700 17px/1.25 var(--fh);color:#fff;letter-spacing:-.01em}
#rl-bar .p{display:block;font-size:14.5px;color:rgba(255,255,255,.85);margin-top:2px}#rl-bar .p b{font:800 18px var(--fh);color:#fff}
#rl-bar .btn{background:#f6b13b;color:#0b0f17;padding:14px 24px;white-space:nowrap;font-size:16px;font-weight:800;box-shadow:0 8px 24px rgba(246,177,59,.35);animation:rlpulse 2.4s ease-in-out infinite}
#rl-bar .btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
@keyframes rlpulse{0%,100%{box-shadow:0 8px 24px rgba(246,177,59,.35)}50%{box-shadow:0 8px 34px rgba(246,177,59,.7)}}
@media (prefers-reduced-motion:reduce){#rl-bar .btn{animation:none}}
body{padding-bottom:100px}
@media (max-width:900px){nav{display:none}.hero .wrap,.head,.split,.area,.final .wrap{grid-template-columns:1fr}.badge{justify-self:start}.head p{justify-self:start}
.steps{grid-template-columns:1fr}section{padding:80px 0}.split{gap:36px}.split .ph{aspect-ratio:4/3}.final .wrap{gap:36px}}
@media (max-width:520px){.wrap{padding:0 18px}.hero .wrap{padding-top:120px;padding-bottom:40px}.cta .btn{width:100%}header .btn{padding:10px 16px}
.badge{display:none}.card{min-height:340px}}
#call-now{display:none}
@media (max-width:700px){#rl-fade{display:none}
#rl-bar{left:0;right:0;top:0;bottom:auto;border-radius:0;background:rgba(11,15,23,.92)}#rl-bar::before{inset:auto 0 0 0}
#rl-bar .wrap{flex-direction:row;min-height:52px;gap:10px;padding:6px 8px 6px 14px}#rl-bar .tag,#rl-bar .t,#rl-bar .hide-sm{display:none}
#rl-bar .p{font-size:13px;margin:0}#rl-bar .p b{font-size:15px}#rl-bar .btn{padding:10px 14px;font-size:14px}
header{top:52px}.L-classic header{top:52px}.trust{margin-top:52px}
body{padding-bottom:84px}
#call-now{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:45;padding:16px;font-size:17px;box-shadow:0 10px 30px rgba(0,0,0,.3)}
#rl-bar .nsm{display:none}.L-classic .trust .lic{display:none}.L-classic .trust{font-size:13px}
.L-split header,.L-bold header{text-shadow:0 1px 8px rgba(0,0,0,.45)}}
/* Layout: light */
.L-light header{color:var(--ink)}.L-light nav a{color:var(--ink2)}.L-light nav a:hover{color:var(--ink)}
.L-light .hero{background:var(--tint);color:var(--ink);min-height:auto;align-items:center}
.L-light .hero::after{display:none}
.L-light .hero>img{left:auto;right:3vw;top:110px;bottom:56px;width:44vw;height:auto;border-radius:28px;transform:none;box-shadow:0 30px 60px rgba(15,22,33,.18)}
.L-light .hero .wrap{grid-template-columns:1fr;padding-top:170px;padding-bottom:110px}.L-light .hero .wrap>div:first-child{max-width:50%}
.L-light .hero p{color:var(--ink2)}.L-light .hero .kicker{color:var(--accent)}.L-light .btn.line{color:var(--ink);box-shadow:inset 0 0 0 1.5px rgba(15,22,33,.25)}
.L-light .badge{position:absolute;right:6vw;bottom:80px;background:#fff;color:var(--ink);border:0;box-shadow:0 14px 40px rgba(15,22,33,.16)}.L-light .badge p{color:var(--ink2)}
/* Layout: split */
.L-split .hero{background:var(--accent2);align-items:center}.L-split .hero::after{display:none}
.L-split .hero>img{left:52%;width:48%;transform:none}
.L-split .hero .wrap{grid-template-columns:1fr;padding-top:150px}.L-split .hero .wrap>div:first-child{max-width:46%}
.L-split .hero .kicker{color:#fff;opacity:.85}.L-split .badge{position:absolute;left:calc(52% + 32px);bottom:48px}
.L-split .hero h1{max-width:9ch}.L-split header{text-shadow:0 1px 8px rgba(0,0,0,.55)}
/* Layout: classic (trust bar + centered hero) */
.trust{display:none}
.L-classic .trust{display:block;background:var(--night);color:#e5e7eb;font-size:14px}.L-classic .trust .wrap{display:flex;flex-wrap:wrap;gap:6px 22px;justify-content:center;padding:9px 24px}
.L-classic .trust b{color:#fff}
.L-classic header{position:sticky;top:0;background:#fff;color:var(--ink);box-shadow:0 1px 0 var(--line)}.L-classic nav a{color:var(--ink2)}
.L-classic .hero{min-height:640px;align-items:center;text-align:center}.L-classic .hero::after{background:rgba(15,22,33,.62)}
.L-classic .hero .wrap{grid-template-columns:1fr;justify-items:center;padding-top:90px}.L-classic .hero h1{max-width:15ch;margin-left:auto;margin-right:auto}
.L-classic .hero p{margin-left:auto;margin-right:auto}.L-classic .cta{justify-content:center}.L-classic .badge{display:none}
@media (max-width:900px){.L-light .hero{flex-direction:column;align-items:stretch}.L-light .hero>img{position:relative;inset:auto;width:auto;height:280px;margin:150px 18px 0;object-fit:cover}
.L-light .hero .wrap{padding-top:28px;padding-bottom:48px}.L-light .hero .wrap>div:first-child,.L-split .hero .wrap>div:first-child{max-width:100%}
.L-split .hero{flex-direction:column;align-items:stretch}.L-split .hero>img{position:relative;left:0;width:100%;height:300px;object-fit:cover;margin-top:0}
.L-split .hero .wrap{padding-top:36px}.L-split .badge{display:none}.L-split header{color:#fff}}
</style><style>:root{--accent:${pal.accent};--accent2:${pal.accent2};--tint:${pal.tint};--accentl:${pal.light}}</style></head>
<body class="L-${D.layout}">
<div class="trust"><div class="wrap">${showReviews ? `<span><b>${rating!.toFixed(1)}★</b> from ${count} Google reviews</span>` : ""}${lic ? `<span class="lic">${esc(licWords ?? "Licensed")} · WA #${esc(lic.number)}</span>` : ""}${tel ? `<span>Call <b>${phone}</b></span>` : ""}</div></div>
<header><div class="wrap">
${logoHtml}
<nav><a href="#services">Services</a><a href="#about">About</a>${showReviews ? `<a href="#reviews">Reviews</a>` : ""}<a href="#area">Service area</a><a href="#faq">FAQ</a></nav>
${tel ? `<a class="btn" href="${tel}">${PHONE}<span>Call</span></a>` : `<a class="btn" href="#estimate">Get an estimate</a>`}
</div></header>
<main id="top">
<div class="hero">${img(hero, 1800, 1100, "", false)}<div class="wrap">
<div><span class="kicker">${esc(T)}${cityShort ? ` · ${cityShort}` : ""}</span>
<h1>${esc(D.headline)}</h1>
<p>${name}${city ? ` serves customers in and around ${city}` : " serves customers in your area"}. Tell us what's going on and we'll take it from there.</p>
<div class="cta">${tel ? `<a class="btn" href="${tel}">${PHONE}Call ${phone}</a>` : ""}<a class="btn line" href="#estimate">Request an estimate</a></div></div>
${showReviews ? `<div class="badge"><div class="big">${rating!.toFixed(1)} ${stars(rating!)}</div><p>From ${count} reviews on Google</p></div>` : ""}
</div></div>
${stats.length ? `<div class="stats"><div class="wrap">${stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div></div>` : ""}
<section id="services"><div class="wrap">
<div class="head"><div><span class="kicker">Services</span><h2>What we do</h2></div><p>Something else on your mind? Call and ask. We'll tell you straight.</p></div>
<div class="svc">${svc.map(({ s, p }) => `<article class="card">${img(p, 900, 1100)}<div><h3>${esc(s)}</h3></div></article>`).join("")}</div>
</div></section>
<section id="about" class="soft"><div class="wrap split">
<div class="ph">${img(about, 1000, 1250)}</div>
<div><span class="kicker">Why ${name}</span><h2>Local, accountable, easy to reach.</h2>
<ul class="ticks">${why.map((w) => `<li>${CHECK}<span>${w}</span></li>`).join("")}</ul>
${tel ? `<a class="btn" href="${tel}">${PHONE}Call ${phone}</a>` : `<a class="btn" href="#estimate">Request an estimate</a>`}</div>
</div></section>
${showReviews ? `<section id="reviews" class="dark"><div class="wrap">
<div class="head"><div><span class="kicker">Reviews</span><h2>${rating!.toFixed(1)} stars from ${count} customers</h2></div><p>${stars(rating!)}<br>Real reviews from Google, shown as written.</p></div>
${reviewCards ? `<div class="revs">${reviewCards}</div>` : ""}
<p class="attr">Reviews from Google${mapsUrl ? ` · <a href="${esc(mapsUrl)}" rel="noopener">Read all ${count} reviews on Google</a>` : ""}</p>
</div></section>` : ""}
<section><div class="wrap">
<div class="head"><div><span class="kicker">How it works</span><h2>Three simple steps</h2></div></div>
<ol class="steps">
<li><h3>Reach out</h3><p>Call${tel ? ` ${phone}` : ""} or ${esc(W.site.reachOut)}</p></li>
<li><h3>We take a look</h3><p>${esc(W.site.takeLook)}</p></li>
<li><h3>Clear estimate</h3><p>You get a clear estimate before any work starts. No pressure.</p></li>
</ol></div></section>
<section id="area" class="soft"><div class="wrap">
<div class="head"><div><span class="kicker">Service area</span><h2>${cityShort ? `Serving ${cityShort} & nearby` : "Where we work"}</h2></div><p>${area}</p></div>
<div class="area"><iframe class="map" title="Map of ${name}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${mapQ}&amp;z=11&amp;output=embed"></iframe>
<div class="panel">${hours ? `<h3>Hours</h3>${hours}` : ""}<h3>Talk to us</h3>${tel ? `<a class="btn" href="${tel}" style="width:100%">${PHONE}${phone}</a>` : `<a class="btn" href="#estimate" style="width:100%">Request an estimate</a>`}</div></div>
</div></section>
<section id="faq"><div class="wrap">
<div class="head"><div><span class="kicker">FAQ</span><h2>Good questions</h2></div></div>
<div class="faq">${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
</div></section>
<section id="estimate" class="final">${img(ctaBg, 1800, 1000)}<div class="wrap">
<div><span class="kicker" style="color:var(--accentl)">Free to ask</span><h2>${esc(W.site.ctaHeadline)}</h2><p>Send a few details and the best way to reach you.${tel ? ` Or call <a href="${tel}" style="color:#fff">${phone}</a>.` : ""}</p></div>
<form data-preview="true" onsubmit="event.preventDefault();this.querySelector('.note').textContent='This is a preview, so the form is not active yet. Please call instead.'">
<h3>Request an estimate</h3>
<input name="name" placeholder="Your name" autocomplete="name" aria-label="Your name">
<input name="phone" placeholder="Phone" autocomplete="tel" aria-label="Phone">
<input name="address" placeholder="Property address" autocomplete="street-address" aria-label="Property address">
<textarea name="msg" rows="3" placeholder="${esc(W.site.msgPlaceholder)}" aria-label="${esc(W.site.msgPlaceholder)}"></textarea>
<button class="btn" type="submit">Send request</button>
<p class="note">Preview: this form becomes active when the site goes live.</p>
</form></div></section>
</main>
<footer><div class="wrap"><span>© ${new Date().getFullYear()} ${name}${lic ? ` · WA contractor license #${esc(lic.number)}` : ""}</span>${tel ? `<a href="${tel}">${phone}</a>` : ""}
<span class="cr">Photos: ${credits.filter((p, i, a) => a.findIndex((q) => q.author === p.author) === i).map((p) => `<a href="${esc(p.authorUrl)}?utm_source=roofline&amp;utm_medium=referral" rel="noopener">${esc(p.author)}</a>`).join(", ")} on <a href="https://unsplash.com/?utm_source=roofline&amp;utm_medium=referral" rel="noopener">Unsplash</a></span></div></footer>
${tel ? `<a id="call-now" class="btn" href="${tel}">${PHONE}Call now</a>` : ""}
<div id="rl-fade" aria-hidden="true"></div>
<aside id="rl-bar" aria-label="${esc(brand.name)} preview"><div class="wrap">
<div><span class="tag">Preview · built for you</span><span class="t">This website is ready for ${name}.</span>
<span class="p"><b>$150/month</b><span class="nsm"> · no setup fee · cancel anytime</span><span class="hide-sm"> · free edits</span></span></div>
<a class="btn" href="${esc(opts.purchaseUrl)}">Get this site <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
</div></aside>
</body></html>`;
}

export async function writePreview(dir: string, html: string): Promise<{ path: string; hash: string }> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, "index.html");
  await writeFile(path, html);
  return { path, hash: createHash("sha256").update(html).digest("hex") };
}
