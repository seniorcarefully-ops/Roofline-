import type { NicheConfig } from "../niches/schema.js";
import type { BuildBrief } from "../build/brief.js";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Brand = NicheConfig["brand"];

/** Per-niche wording. Adding a niche = adding an entry here (and its NicheConfig). */
export const NICHE_WORDS: Record<string, { one: string; many: string; trade: string }> = {
  roofing: { one: "roofer", many: "roofers", trade: "roofing" },
};
export const words = (niche: string) => NICHE_WORDS[niche] ?? { one: "business", many: "local businesses", trade: "local service" };

export const PERSONA = { first: "Cole", full: "Cole Bennett" };
export const BRAND_PHONE = { display: "(509) 390-8200", e164: "+15093908200" };

/** Fictional demo business used for the public example (clearly labeled as a demo). */
export function demoBrief(niche: string): BuildBrief {
  const w = words(niche);
  return {
    prospectId: 0, version: 1, businessName: `Summit Ridge ${w.trade[0]!.toUpperCase()}${w.trade.slice(1)} (Demo)`,
    phone: "(555) 010-0199", phoneE164: "+15550100199", city: "Your Town, USA", serviceArea: [],
    services: ["Roof repair", "Roof replacement"], hours: null, rating: null, reviewCount: null,
    googleMapsUrl: null, placeId: null, license: null, servicesSource: "category", sources: ["demo"],
  };
}

const head = (brand: Brand, title: string, desc: string) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#eef1f5">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800&display=swap" rel="stylesheet">
<style>
:root{--ink:#111827;--ink2:#4b5563;--muted:#6b7280;--line:#e3e7ed;--bg:#eef1f5;--card:#fff;--accent:${esc(brand.colors.accent)};--night:${esc(brand.colors.primary)}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:17px/1.65 Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
a{color:inherit}h1,h2,h3{font-family:"Inter Tight",Inter,sans-serif;letter-spacing:-.03em;line-height:1.04;margin:0}
.wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.sky{position:relative;overflow:hidden;background:linear-gradient(180deg,#dfe4ea 0%,#eef1f5 55%,#eef1f5 100%)}
.sky::before,.sky::after{content:"";position:absolute;pointer-events:none;filter:blur(40px);opacity:.9;border-radius:50%}
.sky::before{width:900px;height:320px;left:-200px;top:40px;background:radial-gradient(closest-side,#fff,rgba(255,255,255,0))}
.sky::after{width:800px;height:300px;right:-220px;top:180px;background:radial-gradient(closest-side,#fff,rgba(255,255,255,0))}
.cloud{position:absolute;pointer-events:none;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.95),rgba(255,255,255,0));filter:blur(18px);animation:drift 60s linear infinite}
@keyframes drift{from{transform:translateX(-6%)}to{transform:translateX(6%)}}
@media (prefers-reduced-motion:reduce){.cloud{animation:none}}
nav{position:relative;z-index:5}nav .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:76px}
.logo{display:flex;align-items:center;gap:10px;font:700 20px "Inter Tight",sans-serif;text-decoration:none}
.logo i{width:36px;height:36px;border-radius:10px;background:var(--night);display:grid;place-items:center}
.logo i svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.links{display:flex;gap:28px;font-weight:500;font-size:15.5px}.links a{text-decoration:none;color:var(--ink2)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px 26px;border-radius:999px;border:0;background:var(--ink);color:#fff;font:600 16px Inter,sans-serif;text-decoration:none;cursor:pointer;transition:transform .15s}
.btn:hover{transform:translateY(-1px)}.btn.accent{background:var(--accent)}.btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px #c9d0da}
.hero{position:relative;z-index:2;text-align:center;padding:72px 0 0}
.pill{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.75);backdrop-filter:blur(8px);border:1px solid #fff;border-radius:999px;padding:7px 14px;font-size:14px;font-weight:600;color:var(--ink2)}
.pill b{color:var(--accent)}
.hero h1{font-size:clamp(46px,8vw,104px);margin:22px auto 22px;max-width:12ch}
.hero p{font-size:clamp(18px,2vw,21px);color:var(--ink2);max-width:36em;margin:0 auto 32px}
.cta{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.stage{position:relative;margin:64px auto 0;max-width:1040px;height:520px}
.browser{position:absolute;left:0;right:110px;top:0;height:520px;background:#fff;border-radius:18px 18px 0 0;box-shadow:0 40px 90px rgba(17,24,39,.18);overflow:hidden;border:1px solid #fff}
.browser .bar{height:38px;background:#f3f5f8;display:flex;align-items:center;gap:7px;padding:0 14px}.browser .bar i{width:11px;height:11px;border-radius:50%;background:#d6dbe2}
.browser .bar span{margin-left:12px;font-size:12.5px;color:var(--muted);background:#fff;border-radius:6px;padding:3px 12px}
.frame{position:relative;width:100%;height:calc(100% - 38px);overflow:hidden}
.frame iframe{border:0;width:1440px;height:1100px;transform:scale(.62);transform-origin:0 0;pointer-events:none}
.phone{position:absolute;right:0;top:90px;width:230px;height:470px;border-radius:36px;background:#0b0f17;padding:10px;box-shadow:0 40px 80px rgba(17,24,39,.3)}
.phone .frame{height:100%;border-radius:28px}.phone iframe{width:390px;height:800px;transform:scale(.538)}
.demo-tag{position:absolute;left:16px;bottom:16px;z-index:3;background:rgba(17,24,39,.8);color:#fff;font-size:12px;font-weight:600;border-radius:999px;padding:5px 12px}
section{padding:110px 0}
.kicker{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.center{text-align:center}.center h2{margin:14px auto 16px;max-width:16ch}.center p.lead{color:var(--ink2);max-width:34em;margin:0 auto}
h2{font-size:clamp(36px,5vw,62px)}
.offer{display:grid;grid-template-columns:1.1fr 1fr;gap:28px;margin-top:56px;align-items:stretch}
.price{background:var(--night);color:#fff;border-radius:28px;padding:42px;display:flex;flex-direction:column;gap:18px}
.price .amt{font:800 76px/1 "Inter Tight",sans-serif;letter-spacing:-.04em}.price .amt small{font-size:22px;font-weight:600;color:rgba(255,255,255,.7)}
.price ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.price li{display:flex;gap:12px;color:rgba(255,255,255,.9)}.price li::before{content:"";flex:none;width:22px;height:22px;border-radius:50%;margin-top:2px;background:var(--accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/14px no-repeat}
.price .btn{background:#fff;color:var(--ink);margin-top:auto}
.addons{display:grid;gap:18px}
.card{background:var(--card);border:1px solid #fff;border-radius:24px;padding:30px;box-shadow:0 10px 30px rgba(17,24,39,.05)}
.card h3{font-size:24px;margin-bottom:6px}.card p{margin:0;color:var(--ink2)}.card .tag{display:inline-block;font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px}
.story{display:grid;grid-template-columns:.9fr 1.1fr;gap:64px;align-items:center}
.portrait{position:relative;max-width:440px;justify-self:center;transform:rotate(-2.5deg);filter:drop-shadow(0 30px 40px rgba(17,24,39,.22))}
.portrait img{width:100%;height:auto;display:block}
.portrait .ph{position:absolute;inset:0;display:grid;place-items:center;color:#8b95a3;font-weight:600}
.portrait .ph svg{width:120px;height:120px;fill:#c1c9d3}
.story h2{margin:14px 0 22px}.story p{color:var(--ink2);font-size:19px;margin:0 0 16px}.story .sig{font:700 22px "Inter Tight",sans-serif;color:var(--ink)}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:56px;counter-reset:s}
.steps .card{counter-increment:s}.steps .card::before{content:"0" counter(s);display:block;font:800 15px "Inter Tight",sans-serif;color:var(--accent);margin-bottom:14px;letter-spacing:.06em}
.examples{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:56px}
.ex{background:#fff;border-radius:24px;overflow:hidden;border:1px solid #fff;box-shadow:0 10px 30px rgba(17,24,39,.06)}
.ex .frame{height:300px}.ex .frame iframe{transform:scale(.27);width:1440px;height:1110px}
.ex div.t{padding:20px 22px}.ex h3{font-size:19px}.ex p{margin:4px 0 0;color:var(--muted);font-size:15px}
.final{text-align:center;background:linear-gradient(180deg,#eef1f5,#dfe4ea)}
.final h2{max-width:14ch;margin:14px auto 18px}
form.get{max-width:560px;margin:34px auto 0;background:#fff;border-radius:24px;padding:28px;display:grid;gap:12px;text-align:left;box-shadow:0 20px 60px rgba(17,24,39,.08)}
form.get input{font:inherit;padding:15px 16px;border:1px solid var(--line);border-radius:12px;background:#f8fafc;width:100%}
form.get .consent{display:grid;grid-template-columns:20px 1fr;gap:10px;font-size:13px;color:var(--muted);line-height:1.5}
form.get .consent input{width:18px;height:18px;padding:0;margin-top:2px}
footer{padding:44px 0;color:var(--muted);font-size:14px}footer .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 28px}
footer a{color:var(--ink2);text-decoration:none;margin-right:18px}
.doc{max-width:760px;margin:0 auto;padding:40px 24px 80px}.doc h1{font-size:44px;margin:20px 0 10px}.doc h2{font-size:24px;margin:34px 0 8px}.doc p,.doc li{color:var(--ink2)}
@media (max-width:900px){.links{display:none}.offer,.story,.steps,.examples{grid-template-columns:1fr}.stage{height:420px}.browser{right:0;height:420px}.phone{display:none}section{padding:80px 0}}
</style></head><body>`;

const navBar = (brand: Brand) => `<nav><div class="wrap">
<a class="logo" href="/"><i><svg viewBox="0 0 24 24"><path d="M3 12l9-8 9 8"/><path d="M6 10.5V20h12v-9.5"/></svg></i>${esc(brand.name)}</a>
<div class="links"><a href="/#offer">Pricing</a><a href="/#story">About</a><a href="/#examples">Examples</a><a href="/#how">How it works</a></div>
<a class="btn" href="/#get">Get my free preview</a></div></nav>`;

const foot = (brand: Brand) => `<footer><div class="wrap">
<span>© ${new Date().getFullYear()} ${esc(brand.name)} · ${esc(brand.tagline)}</span>
<span><a href="/privacy">Privacy</a><a href="/terms">Terms &amp; SMS</a><a href="tel:${BRAND_PHONE.e164}">${BRAND_PHONE.display}</a></span>
<span style="flex-basis:100%;font-size:12.5px">${PERSONA.first} is ${esc(brand.name)}'s brand character. Replies to our emails and texts are handled by ${esc(brand.name)}'s AI assistant.</span>
</div></footer></body></html>`;

export function renderHome(brand: Brand, niche: string, opts: { sent?: boolean; error?: string } = {}): string {
  const w = words(niche);
  const W = w.one[0]!.toUpperCase() + w.one.slice(1);
  return head(brand, `${brand.name} · Websites built only for ${w.many}`, `${brand.name} builds and manages websites only for ${w.many}. $150/month, no setup fee, cancel anytime.`) + `
<div class="sky">
<span class="cloud" style="width:520px;height:160px;left:6%;top:120px"></span>
<span class="cloud" style="width:420px;height:140px;right:4%;top:60px;animation-duration:80s"></span>
${navBar(brand)}
<div class="hero"><div class="wrap">
<span class="pill"><b>New</b> We build your site before you even ask</span>
<h1>Websites built only for ${esc(w.many)}.</h1>
<p>A premium, mobile-first website for your ${esc(w.trade)} business, built from your real reviews and info. <b>$150/month.</b> No setup fee. Cancel anytime.</p>
<div class="cta"><a class="btn accent" href="#get">Get my free preview</a><a class="btn ghost" href="#examples">See an example</a></div>
<div class="stage">
<div class="browser"><div class="bar"><i></i><i></i><i></i><span>your${esc(w.trade)}company.com</span></div><div class="frame"><iframe src="/demo" title="Demo website" loading="lazy" tabindex="-1"></iframe></div><span class="demo-tag">Demo business</span></div>
<div class="phone"><div class="frame"><iframe src="/demo" title="Demo website on a phone" loading="lazy" tabindex="-1"></iframe></div></div>
</div></div></div></div>

<section id="offer"><div class="wrap center">
<span class="kicker">Our offer</span><h2>One simple plan. Everything handled.</h2>
<p class="lead">No agencies, no contracts, no learning a website builder. We build it, host it, and keep it updated for you.</p>
<div class="offer" style="text-align:left">
<div class="price"><span class="kicker" style="color:#ffb38a">Managed website</span>
<div class="amt">$150<small>/month</small></div>
<ul><li>Custom site built for your ${esc(w.trade)} business</li><li>Looks great on phones, with tap-to-call and estimate requests</li><li>Your real Google reviews, shown live</li><li>Hosting, security (HTTPS) and maintenance included</li><li>Free edits: ask for changes anytime</li><li>Keep your domain. No setup fee. Cancel anytime.</li></ul>
<a class="btn" href="#get">Get my free preview</a></div>
<div class="addons">
<div class="card"><span class="tag">Optional add-on · $200/month</span><h3>AI missed-call texting</h3><p>Miss a call on a job? An AI assistant texts the caller back, answers basic questions, and collects job details for you.</p></div>
<div class="card"><span class="tag">Optional add-on · $500/month</span><h3>Automated marketing</h3><p>Content and ad campaigns managed for you, with reports that show what's working. Ad spend is separate and always yours to set.</p></div>
<div class="card"><span class="tag">Our promise</span><h3>Simple and month-to-month</h3><p>Every service is independent. Buy one, cancel anytime, no bundles required.</p></div>
</div></div></div></section>

<section id="story" style="background:#fff"><div class="wrap story">
<div class="portrait"><img src="/assets/cole.jpg" alt="Polaroid of ${PERSONA.first} in front of a house mid-reroof" width="960" height="1170" loading="lazy"></div>
<div><span class="kicker">Meet ${PERSONA.first}</span>
<h2>${W === "Roofer" ? "Roofing runs in the family." : `${W}s run in the family.`}</h2>
<p>${PERSONA.first}'s dad was a ${esc(w.one)}. So was his grandpa, and his great-grandpa before him.</p>
<p>${PERSONA.first}? He builds websites. Just for ${esc(w.many)}.</p>
<p>That's the whole idea behind ${esc(brand.name)}: one trade, done right. We know what a ${esc(w.one)}'s customers look for, so every site we build is made to turn visitors into calls. Smart automation does the heavy lifting, which is how we build your site before you ask and keep it at $150 a month.</p>
<p class="sig">${PERSONA.first} &amp; the ${esc(brand.name)} team</p></div></div></section>

<section id="how"><div class="wrap center">
<span class="kicker">How it works</span><h2>Live in days, not months.</h2>
<div class="steps" style="text-align:left">
<div class="card"><h3>We build it</h3><p>We build a site for your business from your public info and real reviews. Free, no obligation.</p></div>
<div class="card"><h3>You see it</h3><p>We text you a private preview link. Look it over, ask questions, request changes.</p></div>
<div class="card"><h3>It goes live</h3><p>Love it? Subscribe in one tap and connect your domain with one click. We handle the rest.</p></div>
</div></div></section>

<section id="examples" style="background:#fff"><div class="wrap center">
<span class="kicker">Examples</span><h2>What your site could look like.</h2>
<p class="lead">Sample builds for a demo business. Real customer results will appear here as they come in.</p>
<div class="examples" style="text-align:left">
${[["", "Homepage", "Bold photo hero, tap-to-call, and an estimate button up front."], ["#services", "Services", "Clear, photo-led service cards homeowners understand."], ["#estimate", "Estimate requests", "A simple form that sends requests straight to you."]]
  .map(([a, h, p]) => `<div class="ex"><div class="frame"><iframe src="/demo${a}" title="Demo website: ${h}" loading="lazy" tabindex="-1"></iframe></div><div class="t"><h3>${h}</h3><p>${p}</p></div></div>`).join("")}
</div></div></section>

<section id="get" class="final"><div class="wrap">
<span class="kicker">Free preview</span><h2>See your new website first. Then decide.</h2>
<p class="lead" style="margin:0 auto;max-width:32em;color:var(--ink2)">Tell us your business and we'll build your site and text you the private link. No cost, no obligation.</p>
<form class="get" method="post" action="/request">
${opts.sent ? `<p style="margin:0;font-weight:600;color:#15803d">Got it! We'll build your preview and text you the link.</p>` : ""}
${opts.error ? `<p style="margin:0;font-weight:600;color:#b91c1c">${esc(opts.error)}</p>` : ""}
<input name="business" placeholder="Business name" required maxlength="120" autocomplete="organization">
<input name="city" placeholder="City and state" required maxlength="80">
<input name="website" placeholder="Current website (if you have one)" maxlength="200" autocomplete="url">
<input name="phone" type="tel" placeholder="Your cell number" required maxlength="30" autocomplete="tel">
<label class="consent"><input type="checkbox" name="consent" value="yes" required><span>I agree to receive text messages from ${esc(brand.name)} about my website preview, including follow-up questions and offers. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</span></label>
<button class="btn accent" type="submit">Get my free preview</button>
</form></div></section>
` + foot(brand);
}

export function renderDoc(brand: Brand, kind: "privacy" | "terms"): string {
  const n = esc(brand.name);
  const body = kind === "privacy" ? `
<h1>Privacy Policy</h1><p>Last updated November 19, 2026.</p>
<h2>What we collect</h2><p>Business information that is publicly available (such as your business name, phone number, address, website and Google reviews), information you give us (such as your name, email, cell number and requests), and basic usage data when you visit our pages.</p>
<h2>How we use it</h2><p>To build and show you a website preview, to communicate with you by email and text about that preview and our services, to provide and support the services you buy, and to process payments through our payment provider.</p>
<h2>Text messaging</h2><p><b>We do not sell, rent, or share your mobile number or text messaging consent with third parties or affiliates for their marketing purposes.</b> Mobile information is shared only with service providers that help us deliver messages and run our services (for example, our messaging provider), and only for that purpose.</p>
<h2>Service providers</h2><p>We use trusted providers for hosting, email delivery, text messaging, payments and data lookups. They may process data on our behalf under their own security obligations.</p>
<h2>Your choices</h2><p>Reply STOP to any text to opt out. Use the unsubscribe link in any email. You can ask us to delete your information by replying to any of our messages.</p>
<h2>Security</h2><p>We use encryption in transit (HTTPS) and limit access to personal information.</p>
<h2>Contact</h2><p>Reply to any message from ${n}, or text ${BRAND_PHONE.display}.</p>` : `
<h1>Terms &amp; SMS Terms</h1><p>Last updated November 19, 2026.</p>
<h2>Services</h2><p>${n} offers independent monthly subscriptions: a managed website ($150/month), AI missed-call texting ($200/month), and automated marketing ($500/month; advertising spend billed separately). No setup fee. Cancel anytime; service continues through the end of the paid period.</p>
<h2>SMS program</h2><ul>
<li><b>Program:</b> ${n} website preview and customer messages.</li>
<li><b>What you'll receive:</b> your website preview link, answers to your questions, follow-ups about your preview, and service and account messages if you become a customer.</li>
<li><b>Frequency:</b> message frequency varies.</li>
<li><b>Cost:</b> Msg &amp; data rates may apply.</li>
<li><b>Opt out:</b> reply <b>STOP</b> at any time. You'll get one confirmation and no further texts.</li>
<li><b>Help:</b> reply <b>HELP</b>, or text ${BRAND_PHONE.display}.</li>
<li>Carriers are not liable for delayed or undelivered messages.</li>
<li>Consent to receive texts is not a condition of purchase.</li></ul>
<h2>AI assistant</h2><p>Replies to our emails and texts are handled by ${n}'s AI assistant. It will tell you it is an AI if you ask.</p>
<h2>Previews</h2><p>Website previews are built from publicly available information and are private, not indexed by search engines, and not live until you subscribe and approve.</p>
<h2>Privacy</h2><p>See our <a href="/privacy">Privacy Policy</a>.</p>`;
  return head(brand, `${kind === "privacy" ? "Privacy Policy" : "Terms & SMS Terms"} · ${brand.name}`, `${brand.name} ${kind}`) +
    `<div class="sky">${navBar(brand)}</div><div class="doc">${body}</div>` + foot(brand);
}
