import type { NicheConfig } from "../niches/schema.js";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type Brand = NicheConfig["brand"];

const ICON = {
  check: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/>`,
  back: `<path d="M15 6l-6 6 6 6"/>`,
  house: `<path d="M3 12l9-8 9 8"/><path d="M6 10.5V20h12v-9.5"/>`,
};

/** Shared Roofline shell for every system page (checkout results, errors, onboarding). */
export function brandPage(brand: Brand, o: {
  title: string;
  kicker?: string;
  heading: string;
  lead: string;
  icon?: keyof typeof ICON;
  tone?: "success" | "neutral";
  body?: string;
  actions?: { href: string; label: string; primary?: boolean }[];
}): string {
  const tone = o.tone ?? "neutral";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#0f1621">
<title>${esc(o.title)} · ${esc(brand.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@700;800&display=swap" rel="stylesheet">
<style>
:root{--ink:#0f1621;--ink2:#3b4452;--muted:#6b7380;--line:#e7e9ee;--soft:#f5f6f8;--accent:${esc(brand.colors.accent)};--night:${esc(brand.colors.primary)}}
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:flex;flex-direction:column;font:16.5px/1.65 Inter,system-ui,sans-serif;color:var(--ink);background:var(--soft);-webkit-font-smoothing:antialiased}
.top{background:var(--night);color:#fff}.top .in{max-width:760px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;gap:12px;font:700 18px "Inter Tight",Inter,sans-serif}
.logo{width:34px;height:34px;border-radius:10px;background:var(--accent);display:grid;place-items:center}
.logo svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.hero{background:var(--night);color:#fff;padding:40px 0 120px}
main{flex:1}.wrap{max-width:760px;margin:0 auto;padding:0 24px}
.kicker{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ffb38a}
.kicker::before{content:"";width:24px;height:2px;background:currentColor}
h1{font:800 clamp(34px,6vw,52px)/1.05 "Inter Tight",Inter,sans-serif;letter-spacing:-.03em;margin:14px 0 14px}
.lead{font-size:18px;color:rgba(255,255,255,.78);margin:0;max-width:34em}
.badge{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:${tone === "success" ? "#16a34a" : "rgba(255,255,255,.12)"};margin-bottom:22px}
.badge svg{width:28px;height:28px;fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:32px;margin-top:-80px;box-shadow:0 20px 50px rgba(15,22,33,.08)}
.card h2{font:700 22px "Inter Tight",Inter,sans-serif;letter-spacing:-.01em;margin:0 0 18px}
.steps{list-style:none;margin:0;padding:0;counter-reset:s}
.steps li{position:relative;padding:0 0 22px 52px;counter-increment:s}
.steps li::before{content:counter(s);position:absolute;left:0;top:0;width:34px;height:34px;border-radius:50%;background:var(--soft);border:1px solid var(--line);display:grid;place-items:center;font-weight:700;font-size:15px;color:var(--ink)}
.steps li.done::before{content:"";background:#16a34a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/18px no-repeat;border-color:#16a34a}
.steps li:not(:last-child)::after{content:"";position:absolute;left:17px;top:38px;bottom:4px;width:1px;background:var(--line)}
.steps b{display:block;font-size:17px}.steps span{color:var(--ink2)}
.summary{display:grid;grid-template-columns:1fr auto;gap:8px 16px;padding:18px 20px;background:var(--soft);border-radius:14px;margin:0 0 26px;font-size:15.5px}
.summary dt{color:var(--muted)}.summary dd{margin:0;font-weight:600;text-align:right}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 22px;border-radius:999px;font-weight:600;text-decoration:none;border:1.5px solid var(--line);color:var(--ink);background:#fff}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.note{font-size:14px;color:var(--muted);margin:22px 0 0}
footer{padding:28px 0 36px;text-align:center;color:var(--muted);font-size:14px}
@media (max-width:520px){.card{padding:24px}.actions .btn{width:100%}}
</style></head><body>
<div class="top"><div class="in"><span class="logo"><svg viewBox="0 0 24 24">${ICON.house}</svg></span>${esc(brand.name)}</div></div>
<main>
<div class="hero"><div class="wrap">
${o.icon ? `<div class="badge"><svg viewBox="0 0 24 24">${ICON[o.icon]}</svg></div>` : ""}
${o.kicker ? `<span class="kicker">${esc(o.kicker)}</span>` : ""}
<h1>${esc(o.heading)}</h1><p class="lead">${o.lead}</p>
</div></div>
<div class="wrap"><div class="card">${o.body ?? ""}
${o.actions?.length ? `<div class="actions">${o.actions.map((a) => `<a class="btn${a.primary ? " primary" : ""}" href="${esc(a.href)}">${esc(a.label)}</a>`).join("")}</div>` : ""}
</div></div>
</main>
<footer>${esc(brand.name)} · ${esc(brand.tagline)}</footer>
</body></html>`;
}

export function successPage(brand: Brand, info: { business: string | null; email: string | null; amount: string | null; previewUrl: string | null }) {
  return brandPage(brand, {
    title: "You're all set",
    kicker: "Payment confirmed",
    heading: info.business ? `Welcome aboard, ${info.business}.` : "Welcome aboard.",
    lead: "Your website subscription is active. Here's what happens next.",
    icon: "check",
    tone: "success",
    body: `${info.business || info.amount ? `<dl class="summary">
${info.business ? `<dt>Business</dt><dd>${esc(info.business)}</dd>` : ""}
<dt>Plan</dt><dd>Managed website</dd>
${info.amount ? `<dt>Billing</dt><dd>${esc(info.amount)}/month · cancel anytime</dd>` : ""}
${info.email ? `<dt>Email</dt><dd>${esc(info.email)}</dd>` : ""}
</dl>` : ""}
<h2>Next steps</h2>
<ol class="steps">
<li class="done"><b>Subscription active</b><span>Your payment is confirmed.</span></li>
<li><b>Confirm your details</b><span>We'll reach out to confirm your phone, services and service area, and where estimate requests should go.</span></li>
<li><b>Connect your domain</b><span>You'll sign in to your domain provider and approve the connection with one click. Your domain stays in your account, and your email keeps working.</span></li>
<li><b>Go live</b><span>We check everything (HTTPS, phone links, forms) and let you know the moment your new site is live.</span></li>
</ol>`,
    actions: info.previewUrl ? [{ href: info.previewUrl, label: "View your new site", primary: true }] : [],
  });
}

export function canceledPage(brand: Brand, previewUrl: string | null) {
  return brandPage(brand, {
    title: "Checkout canceled",
    kicker: "No charge made",
    heading: "No problem. Your site is still here.",
    lead: "You weren't charged. Your preview link keeps working, so come back whenever you're ready.",
    icon: "info",
    body: `<h2>Have a question first?</h2><p style="margin:0 0 20px;color:var(--ink2)">Reply to the text or email you got from us and a real answer comes right back. $150/month, no setup fee, cancel anytime, free edits.</p>`,
    actions: previewUrl ? [{ href: previewUrl, label: "Back to your site", primary: true }] : [],
  });
}

export function messagePage(brand: Brand, title: string, heading: string, lead: string, previewUrl?: string | null) {
  return brandPage(brand, {
    title, heading, lead, icon: "info",
    body: `<p style="margin:0 0 6px;color:var(--ink2)">If you think this is a mistake, reply to the message you received from us and we'll sort it out.</p>`,
    actions: previewUrl ? [{ href: previewUrl, label: "View your site", primary: true }] : [],
  });
}
