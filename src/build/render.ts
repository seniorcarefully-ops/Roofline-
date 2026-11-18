import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NicheConfig } from "../niches/schema.js";
import { BuildBrief } from "./brief.js";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Render the "ridge" one-page roofing template. Output is a single static HTML file.
 * Preview safeguards: noindex, contact form disabled, and a separate Roofline
 * purchase bar that is visually distinct from the roofer's site.
 */
export function renderRidge(input: BuildBrief, brand: NicheConfig["brand"], purchaseUrl: string): string {
  const b = BuildBrief.parse(input);
  const name = esc(b.businessName);
  const tel = b.phoneE164 ? `tel:${b.phoneE164}` : null;
  const callBtn = (cls: string) => tel ? `<a class="${cls}" href="${tel}">Call ${esc(b.phone ?? "")}</a>` : "";
  const services = b.services.length
    ? `<ul class="svc">${b.services.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`
    : `<p>Call to discuss your roofing project.</p>`;
  const area = b.serviceArea.length ? `<p>Serving ${esc(b.serviceArea.join(", "))}.</p>` : b.city ? `<p>Based in ${esc(b.city)}.</p>` : "";
  const rating = b.rating && b.reviewCount
    ? `<p class="rating"><span aria-hidden="true">★</span> ${b.rating.toFixed(1)} from ${b.reviewCount} Google reviews${
        b.googleMapsUrl ? ` · <a href="${esc(b.googleMapsUrl)}" rel="noopener">Read them on Google</a>` : ""}</p>` : "";
  const hours = b.hours?.length ? `<section id="hours"><h2>Hours</h2><ul class="hours">${b.hours.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></section>` : "";

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${name}${b.city ? ` | Roofing in ${esc(b.city)}` : " | Roofing"}</title>
<meta name="description" content="${name}: roofing${b.city ? ` in ${esc(b.city)}` : ""}. Call for an estimate.">
<style>
:root{--ink:#1d2430;--muted:#5b6575;--bg:#fff;--soft:#f3f5f8;--accent:#c2410c;--accent-ink:#fff}
*{box-sizing:border-box}body{margin:0;font:17px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);padding-bottom:84px}
a{color:var(--accent)}.wrap{max-width:960px;margin:0 auto;padding:0 20px}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;z-index:5}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px}
.logo{font-weight:800;font-size:19px;letter-spacing:-.01em;min-width:0}header .btn{white-space:nowrap}
.btn{display:inline-block;background:var(--accent);color:var(--accent-ink);text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px}
.btn.ghost{background:transparent;color:var(--ink);border:2px solid var(--ink)}
.hero{background:linear-gradient(160deg,#1d2430 0%,#2c3a4f 100%);color:#fff;padding:56px 0 64px}
.hero h1{font-size:clamp(30px,6vw,46px);line-height:1.15;margin:0 0 12px}
.hero p{color:#d6dbe3;margin:0 0 22px;max-width:36em}.hero .btn.ghost{color:#fff;border-color:#fff}
.hero .cta{display:flex;flex-wrap:wrap;gap:12px}
.roofline{display:block;width:100%;height:48px;margin-top:-1px}
section{padding:44px 0}section h2{font-size:26px;margin:0 0 14px}
.soft{background:var(--soft)}
.svc{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:0;list-style:none}
.svc li{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;font-weight:600}
.rating{font-weight:600}.rating span{color:#f59e0b}
.hours{list-style:none;padding:0;margin:0}.hours li{padding:4px 0;border-bottom:1px solid #eceff3}
form{display:grid;gap:10px;max-width:520px}input,textarea{font:inherit;padding:12px;border:1px solid #cbd2dc;border-radius:8px}
.note{font-size:14px;color:var(--muted)}
footer{padding:28px 0;color:var(--muted);font-size:14px;border-top:1px solid #e5e7eb}
#rl-bar{position:fixed;left:0;right:0;bottom:0;background:#0b1220;color:#fff;z-index:50;box-shadow:0 -4px 16px rgba(0,0,0,.25)}
#rl-bar .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:72px;font-size:15px}
#rl-bar b{color:#fff}#rl-bar .btn{background:${esc(brand.colors.accent)};white-space:nowrap}
@media (max-width:520px){#rl-bar .wrap{font-size:13px}header .btn{padding:10px 12px;font-size:15px}}
</style></head>
<body>
<header><div class="wrap"><div class="logo">${name}</div>${tel ? `<a class="btn" href="${tel}">Call</a>` : ""}</div></header>
<main>
<div class="hero"><div class="wrap">
<h1>Roofing${b.city ? ` in ${esc(b.city)}` : ""} from ${name}</h1>
<p>Talk to a local roofer about your roof.</p>
<div class="cta">${callBtn("btn")}<a class="btn ghost" href="#estimate">Request an estimate</a></div>
${rating}
</div></div>
<svg class="roofline" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,0 50,10 100,0" fill="#2c3a4f"/></svg>
<section id="services"><div class="wrap"><h2>Services</h2>${services}</div></section>
<section id="area" class="soft"><div class="wrap"><h2>Service area</h2>${area || "<p>Call to confirm we serve your address.</p>"}</div></section>
${hours ? `<div class="wrap">${hours}</div>` : ""}
<section id="estimate" class="soft"><div class="wrap"><h2>Request an estimate</h2>
<form data-preview="true" onsubmit="event.preventDefault();this.querySelector('.note').textContent='This is a preview, so the form is not active yet. Please call instead.'">
<input name="name" placeholder="Your name" autocomplete="name" aria-label="Your name">
<input name="phone" placeholder="Phone" autocomplete="tel" aria-label="Phone">
<textarea name="msg" rows="3" placeholder="What do you need?" aria-label="What do you need?"></textarea>
<button class="btn" type="submit">Send request</button>
<p class="note">Preview only: this form does not send yet.</p>
</form>${tel ? `<p>Or call <a href="${tel}">${esc(b.phone ?? "")}</a>.</p>` : ""}</div></section>
</main>
<footer><div class="wrap">© ${new Date().getFullYear()} ${name}</div></footer>
<aside id="rl-bar" aria-label="${esc(brand.name)} preview"><div class="wrap">
<span><b>Preview by ${esc(brand.name)}.</b> Yours for $150/month. No setup fee, cancel anytime.</span>
<a class="btn" href="${esc(purchaseUrl)}">Get this site</a>
</div></aside>
</body></html>`;
}

export async function writePreview(dir: string, html: string): Promise<{ path: string; hash: string }> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, "index.html");
  await writeFile(path, html);
  return { path, hash: createHash("sha256").update(html).digest("hex") };
}
