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
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:56px;align-items:stretch}
.plan{background:#fff;border:1px solid #fff;border-radius:28px;padding:34px;display:flex;flex-direction:column;gap:14px;box-shadow:0 14px 40px rgba(17,24,39,.07)}
.plan.featured{background:var(--night);color:#fff;box-shadow:0 30px 70px rgba(17,24,39,.25)}
.ptag{font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}.featured .ptag{color:#ffb38a}
.plan h3{font-size:28px;line-height:1.1}
.plan .amt{font:800 54px/1 "Inter Tight",sans-serif;letter-spacing:-.03em}
.plan .amt small{font:500 18px Inter,sans-serif;letter-spacing:0;color:var(--muted)}.featured .amt small{color:rgba(255,255,255,.65)}
.plan .why{margin:0;color:var(--ink2)}.featured .why{color:rgba(255,255,255,.8)}
.plan ul{list-style:none;margin:4px 0 8px;padding:0;display:grid;gap:12px;font-size:15.5px}
.plan li{display:flex;gap:12px;color:var(--ink2)}.featured li{color:rgba(255,255,255,.88)}.plan li b{color:var(--ink)}.featured li b{color:#fff}
.plan li::before{content:"";flex:none;width:22px;height:22px;border-radius:50%;margin-top:1px;background:var(--accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/14px no-repeat}
.plan .btn{margin-top:auto}.featured .btn{background:#fff;color:var(--ink)}
.fine{margin:28px auto 0;color:var(--muted);font-size:15px;max-width:44em}
.card{background:var(--card);border:1px solid #fff;border-radius:24px;padding:30px;box-shadow:0 10px 30px rgba(17,24,39,.05)}
.card h3{font-size:24px;margin-bottom:6px}.card p{margin:0;color:var(--ink2)}
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
@media (max-width:900px){.links{display:none}.plans,.story,.steps,.examples{grid-template-columns:1fr}.stage{height:420px}.browser{right:0;height:420px}.phone{display:none}section{padding:80px 0}}
</style></head><body>`;

const navBar = (brand: Brand) => `<nav><div class="wrap">
<a class="logo" href="/"><i><svg viewBox="0 0 24 24"><path d="M3 12l9-8 9 8"/><path d="M6 10.5V20h12v-9.5"/></svg></i>${esc(brand.name)}</a>
<div class="links"><a href="/#website">1 · Website</a><a href="/#texting">2 · AI texting</a><a href="/#ads">3 · Google marketing</a><a href="/#story">About</a></div>
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
<span class="kicker">What we offer</span><h2>More calls. More jobs. Less hassle.</h2>
<p class="lead">Three services, each built to bring you more customers. Start with one, add the others anytime. Every plan is month-to-month.</p>
<div class="plans" style="text-align:left">

<article class="plan featured">
<span class="ptag">Start here · Managed website</span>
<h3>Get found and get the call.</h3>
<div class="amt">$150<small>&nbsp;/ month</small></div>
<p class="why">When a homeowner searches for a ${esc(w.one)}, your site is your first impression. Ours are built to make calling you the obvious next step.</p>
<ul>
<li><span><b>More calls from your site</b>: tap-to-call and an estimate button on every screen</span></li>
<li><span><b>Trust at first glance</b>: your real Google reviews, shown live</span></li>
<li><span><b>Looks sharp on phones</b>, where most homeowners find you</span></li>
<li><span><b>Zero work for you</b>: hosting, security, updates and free edits included</span></li>
<li><span>No setup fee · keep your domain · cancel anytime</span></li>
</ul>
<a class="btn" href="#get">Get my free preview</a>
</article>

<article class="plan">
<span class="ptag">AI missed-call texting</span>
<h3>Never lose a job to voicemail.</h3>
<div class="amt">$200<small>&nbsp;/ month</small></div>
<p class="why">You're on a roof and the phone rings. Most callers won't leave a message. They call the next ${esc(w.one)}. This keeps that customer talking to you.</p>
<ul>
<li><span><b>Instant text-back</b> to callers you miss, while you're on the job</span></li>
<li><span><b>Answers common questions</b> using your approved info</span></li>
<li><span><b>Collects the job details</b> (address, problem, timing) and sends them to you</span></li>
<li><span><b>See the value</b>: a clear report of callers reached and jobs captured</span></li>
</ul>
<a class="btn ghost" href="#get">Start with a free preview</a>
</article>

<article class="plan">
<span class="ptag">Get More Calls · marketing</span>
<h3>Show up first when they search.</h3>
<div class="amt">$500<small>&nbsp;/ month</small></div>
<p class="why">When a roof leaks, homeowners grab their phone and search Google. The ${esc(w.many)} at the top of the map and the ads get the calls. We put you there and keep you there.</p>
<ul>
<li><span><b>Google Business Profile, managed</b>: services, areas, photos and updates tuned for the local map</span></li>
<li><span><b>More 5-star reviews</b>: automatic review requests to your customers after each job</span></li>
<li><span><b>Google ads that bring calls</b>: Local Services Ads (pay per lead) and search ads, within the budget you set</span></li>
<li><span><b>Know what's working</b>: calls, leads, cost per lead and new reviews every month</span></li>
<li><span>Ad spend is separate and always yours to control</span></li>
</ul>
<a class="btn ghost" href="#get">Start with a free preview</a>
</article>
</div>
<p class="fine">Every service is independent: buy one, cancel anytime, no bundles required. Results vary by market; we report real numbers, never guesses.</p>
</div></section>

<section id="story" style="background:#fff"><div class="wrap story">
<div class="portrait"><img src="/assets/cole.jpg" alt="Polaroid of ${PERSONA.first} in front of a house mid-reroof" width="960" height="1170" loading="lazy"></div>
<div><span class="kicker">Meet ${PERSONA.first}</span>
<h2>${W === "Roofer" ? "Roofing runs in the family." : `${W}s run in the family.`}</h2>
<p>${PERSONA.first}'s dad was a ${esc(w.one)}. So was his grandpa, and his great-grandpa before him.</p>
<p>${PERSONA.first}? He builds websites. Just for ${esc(w.many)}.</p>
<p>That's the whole idea behind ${esc(brand.name)}: one trade, done right. We know what a ${esc(w.one)}'s customers look for, so every site we build is made to turn visitors into calls. Smart automation does the heavy lifting, which is how we build your site before you ask and keep it at $150 a month.</p>
<p class="sig">${PERSONA.first} &amp; the ${esc(brand.name)} team</p></div></div></section>

<section id="how"><div class="wrap center">
<span class="kicker">How it works</span><h2>Already built. Live when you say go.</h2>
<div class="steps" style="text-align:left">
<div class="card"><h3>It's already built</h3><p>We've built a site for your business from your public info and real reviews. Free, no obligation.</p></div>
<div class="card"><h3>See it on your phone</h3><p>We text you the private link. Look it over, ask questions, request changes.</p></div>
<div class="card"><h3>Go live in one tap</h3><p>Subscribe, then connect your domain with one click. Your new site goes live right away.</p></div>
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

/* ------------------------------------------------------------------------ */
/* V2 landing page (test): outcome-first, three numbered steps.              */
/* ------------------------------------------------------------------------ */
import { pickPhoto, photoUrl } from "../build/photos.js";

function between(html: string, start: string, endTag = "</section>"): string {
  const a = html.indexOf(start); if (a < 0) return "";
  const b = html.indexOf(endTag, a); return b < 0 ? "" : html.slice(a, b + endTag.length);
}

export function renderHomeV2(brand: Brand, niche: string, opts: { sent?: boolean; error?: string } = {}): string {
  const w = words(niche);
  const v1 = renderHome(brand, niche, opts);
  const story = between(v1, '<section id="story"');
  const get = between(v1, '<section id="get" class="final">');
  const hero = pickPhoto("hero", "v2-hero"), home = pickPhoto("home", "v2-ads"), crew = pickPhoto("repair", "v2-sms");
  const img = (p: ReturnType<typeof pickPhoto>, w: number, h: number) => p ? esc(photoUrl(p, w, h)) : "";
  const tick = (t: string) => `<li><span>${t}</span></li>`;
  const step = (n: number, o: { id: string; tag: string; title: string; lead: string; how: string[]; price: string; per: string; note: string; cta: string; visual: string; flip?: boolean; soon?: boolean }) => `
<section id="${o.id}" class="step${o.flip ? " flip" : ""}"><div class="wrap step-grid">
<div class="step-copy">
<div class="step-num"><b>${n}</b><span>${o.tag}</span></div>
<h2>${o.title}</h2>
<p class="lead2">${o.lead}</p>
<h3 class="howh">How it does it</h3>
<ul class="how">${o.how.map(tick).join("")}</ul>
<div class="pricebox"><div><span class="amt2">${o.price}</span><span class="per">${o.per}</span></div><p>${o.note}</p>
<a class="btn accent" href="#get">${o.cta}</a></div>
</div>
<div class="step-visual">${o.visual}</div>
</div></section>`;

  const websiteVisual = `<div class="v-photo" style="background-image:url('${img(hero, 1400, 1100)}')"></div>
<div class="v-device laptop"><div class="bar"><i></i><i></i><i></i></div><div class="frame"><iframe src="/demo" title="Demo website" loading="lazy" tabindex="-1"></iframe></div></div>
<div class="v-device phone2"><div class="frame"><iframe src="/demo" title="Demo website on a phone" loading="lazy" tabindex="-1"></iframe></div></div>
<span class="v-tag">Demo business</span>`;

  const smsVisual = `<div class="v-photo" style="background-image:url('${img(crew, 1400, 1100)}')"></div>
<div class="v-device phone2 chat"><div class="chat-head"><b>(509) 555-0142</b><span>Text message</span></div>
<div class="bub them small">Missed call · 2:14 PM</div>
<div class="bub us">Hi, this is the assistant for Summit Ridge Roofing. Sorry we missed your call! What can we help with?</div>
<div class="bub them">Got a leak over the garage after last night's storm</div>
<div class="bub us">Sorry to hear that. What's the address, and is water coming in right now? Photos help too.</div>
</div>
<div class="v-card note right"><b>New lead for you</b><span>Leak over garage · 123 Pine St · urgent · 1 photo</span></div>
<span class="v-tag">Illustration</span>`;

  const adsVisual = `<div class="v-photo" style="background-image:url('${img(home, 1400, 1100)}')"></div>
<div class="v-device serp"><div class="q">roof repair near me</div>
<div class="ad"><span class="spons">Sponsored · <i>Google Guaranteed</i></span><b>Summit Ridge Roofing</b><span class="st">★★★★★ 4.9 (128) · Open now · Serves your area</span><span class="call">Call</span></div>
<div class="mappack"><div class="map"></div>
<div class="pin"><b>1. Summit Ridge Roofing</b><span>★ 4.9 (128) · Roofing contractor</span></div>
<div class="pin dim"><b>2. Another Roofer</b><span>★ 4.2 (31)</span></div></div></div>
<div class="v-card note"><b>This month</b><span>38 calls · 14 new reviews · $41 per lead</span></div>
<span class="v-tag">Illustration · example numbers</span>`;

  const css = `<style>
.hero2{position:relative;z-index:2;text-align:center;padding:64px 0 90px}
.hero2 h1{font-size:clamp(46px,8.4vw,108px);margin:20px auto 18px;max-width:11ch}
.hero2 p{font-size:clamp(18px,2vw,22px);color:var(--ink2);max-width:34em;margin:0 auto 30px}
.steps3{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:34px}
.steps3 a{display:flex;align-items:center;gap:10px;text-decoration:none;background:rgba(255,255,255,.8);border:1px solid #fff;border-radius:999px;padding:10px 18px 10px 10px;font-weight:600;box-shadow:0 6px 20px rgba(17,24,39,.06)}
.steps3 a b{width:30px;height:30px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font:800 14px "Inter Tight",sans-serif}
.steps3 a:first-child b{background:var(--accent)}
.step{padding:110px 0}.step:nth-of-type(even){background:#fff}
.step-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:64px;align-items:center}
.step.flip .step-copy{order:2}
.step-num{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.step-num b{width:56px;height:56px;border-radius:16px;background:var(--accent);color:#fff;display:grid;place-items:center;font:800 28px "Inter Tight",sans-serif}
.step-num span{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.step h2{font-size:clamp(34px,4.6vw,58px);margin:0 0 16px}
.lead2{font-size:19px;color:var(--ink2);margin:0 0 26px}
.howh{font:700 14px Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
.how{list-style:none;margin:0 0 28px;padding:0;display:grid;gap:12px}
.how li{display:flex;gap:12px;font-size:17px}.how li span{color:var(--ink2)}.how b{color:var(--ink)}
.how li::before{content:"";flex:none;width:24px;height:24px;border-radius:50%;margin-top:1px;background:var(--accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/14px no-repeat}
.pricebox{display:flex;flex-wrap:wrap;align-items:center;gap:16px 28px;background:var(--night);color:#fff;border-radius:22px;padding:24px 28px}
.pricebox .amt2{font:800 44px/1 "Inter Tight",sans-serif;letter-spacing:-.03em}.pricebox .per{font-size:16px;color:rgba(255,255,255,.7);margin-left:6px}
.pricebox p{flex:1 1 200px;margin:0;font-size:15px;color:rgba(255,255,255,.75)}
.step-visual{position:relative;height:560px;border-radius:28px;overflow:hidden;box-shadow:0 30px 70px rgba(17,24,39,.16)}
.v-photo{position:absolute;inset:0;background-size:cover;background-position:center}
.v-photo::after{content:"";position:absolute;inset:0;background:linear-gradient(160deg,rgba(15,22,33,.15),rgba(15,22,33,.55))}
.v-device{position:absolute;background:#fff;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.v-device .frame{position:relative;width:100%;height:100%;overflow:hidden}
.laptop{left:7%;top:12%;width:70%;height:62%;border-radius:12px}
.laptop .bar{height:24px;background:#f1f3f6;display:flex;gap:5px;align-items:center;padding:0 10px}.laptop .bar i{width:8px;height:8px;border-radius:50%;background:#d4d9e0}
.laptop .frame{height:calc(100% - 24px)}.laptop iframe{border:0;width:1440px;height:1000px;transform:scale(.36);transform-origin:0 0;pointer-events:none}
.phone2{right:7%;bottom:7%;width:200px;height:410px;border-radius:30px;background:#0b0f17;padding:8px}
.phone2 .frame{border-radius:23px}.phone2 iframe{border:0;width:390px;height:800px;transform:scale(.473);transform-origin:0 0;pointer-events:none}
.chat{left:50%;right:auto;top:8%;bottom:auto;transform:translateX(-50%);width:290px;height:auto;background:#f5f6f8;padding:14px;border-radius:30px;display:flex;flex-direction:column;gap:8px;font-size:14px}
.chat-head{text-align:center;padding:4px 0 8px;border-bottom:1px solid #e5e7eb;margin-bottom:4px}.chat-head b{display:block}.chat-head span{font-size:12px;color:var(--muted)}
.bub{max-width:82%;padding:9px 12px;border-radius:16px;line-height:1.35}
.bub.us{align-self:flex-end;background:#2f7cf6;color:#fff;border-bottom-right-radius:5px}
.bub.them{align-self:flex-start;background:#e3e6eb;color:var(--ink);border-bottom-left-radius:5px}
.bub.small{font-size:12px;background:#fde7dd;color:#9a3412}
.v-card{position:absolute;left:6%;bottom:7%;background:#fff;border-radius:16px;padding:14px 18px;box-shadow:0 18px 40px rgba(0,0,0,.25);display:grid;gap:2px;max-width:270px}
.v-card b{font:700 15px "Inter Tight",sans-serif}.v-card span{font-size:13.5px;color:var(--ink2)}
.v-card.right{left:auto;right:6%}
.v-card.note b::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:8px;vertical-align:middle}
.serp{left:8%;right:8%;top:9%;border-radius:18px;padding:18px;display:grid;gap:12px}
.serp .q{border:1px solid #dfe3e8;border-radius:999px;padding:10px 16px;color:var(--ink2)}
.serp .ad{display:grid;gap:3px;border:1px solid #e9ecf0;border-radius:14px;padding:12px 14px;position:relative}
.serp .spons{font-size:12px;color:var(--muted)}.serp .spons i{font-style:normal;color:#16a34a;font-weight:600}
.serp .ad b{color:#1a0dab;font-size:17px}.serp .st{font-size:13px;color:var(--ink2)}
.serp .call{position:absolute;right:12px;top:14px;background:#e8f0fe;color:#1a56db;font-weight:600;font-size:13px;border-radius:999px;padding:5px 12px}
.mappack{display:grid;gap:8px}.map{height:110px;border-radius:12px;background:linear-gradient(135deg,#e6efe3,#dfe9f3);position:relative}
.map::after{content:"";position:absolute;left:42%;top:30%;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#ea4335}
.pin{display:grid;font-size:13px}.pin b{font-size:14px}.pin.dim{opacity:.55}
.v-tag{position:absolute;right:14px;top:14px;background:rgba(15,22,33,.75);color:#fff;font-size:12px;font-weight:600;border-radius:999px;padding:5px 11px}
.soonband{background:var(--soft);padding:60px 0;text-align:center}
@media (max-width:900px){.step-grid{grid-template-columns:1fr;gap:36px}.step.flip .step-copy{order:0}.step-visual{height:460px}.laptop{width:84%;left:8%}.phone2{width:170px;height:350px}.phone2 iframe{transform:scale(.4)}.step{padding:72px 0}}
</style>`;

  const s1 = step(1, { id: "website", tag: "Managed website", title: "Turn searches into phone calls.",
    lead: `Most homeowners look you up on their phone before they call. A site built for ${w.many} makes calling you the obvious next step.`,
    how: ["<b>Tap-to-call and estimate buttons</b> on every screen, so calling takes one tap",
      "<b>Your real Google reviews</b>, shown live, so homeowners trust you before they call",
      "<b>Built for phones first</b>, fast and clean where your customers actually look",
      "<b>Already built for you</b>: we make it from your public info, you see it before you pay",
      "<b>Zero upkeep</b>: hosting, security and free edits whenever you ask"],
    price: "$150", per: "/ month", note: "No setup fee. Keep your domain. Cancel anytime.", cta: "See my free preview", visual: websiteVisual });
  const s2 = step(2, { id: "texting", tag: "AI missed-call texting", flip: true, title: "Never lose a job to voicemail.",
    lead: `You're on a roof when the phone rings. Most callers won't leave a message, they call the next ${w.one}. This keeps them talking to you.`,
    how: ["<b>Texts every missed caller back in seconds</b>, day or night",
      "<b>Answers common questions</b> using your approved info, never guesses prices",
      "<b>Collects the job details</b>: address, the problem, timing and photos",
      "<b>Sends you a ready-to-call lead</b> by text, with the whole conversation",
      "<b>A monthly report</b> of missed callers saved and jobs captured"],
    price: "$200", per: "/ month", note: "Works with your current number. Add it anytime, cancel anytime.", cta: "Start with my free preview", visual: smsVisual });
  const s3 = step(3, { id: "ads", tag: "Get More Calls · managed Google marketing", title: "Show up first when they search.",
    lead: `When a roof leaks, homeowners search Google and call the top results. We put you there and keep you there.`,
    how: ["<b>Google Business Profile, managed</b>: services, areas, photos and updates tuned for the local map",
      "<b>More 5-star reviews</b>: automatic review requests after every job",
      "<b>Google ads that bring calls</b>: Local Services Ads (pay per lead) and search ads within your budget",
      "<b>Know what's working</b>: calls, leads, cost per lead and new reviews every month"],
    price: "$500", per: "/ month", note: "Ad spend is separate, paid to Google, and always yours to set.", cta: "Start with my free preview", visual: adsVisual });

  return head(brand, `${brand.name} · Get more ${w.trade} clients`, `Get more ${w.trade} clients: a website that turns searches into calls, AI that texts back missed callers, and Google marketing that puts you first.`)
    .replace("</head>", `${css}</head>`) + `
<div class="sky">
<span class="cloud" style="width:520px;height:160px;left:6%;top:120px"></span>
<span class="cloud" style="width:420px;height:140px;right:4%;top:60px;animation-duration:80s"></span>
${navBar(brand)}
<div class="hero2"><div class="wrap">
<span class="pill"><b>For ${esc(w.many)}</b> Built before you even ask</span>
<h1>Get more ${esc(w.trade)} clients.</h1>
<p>Three simple steps that bring in more calls and more jobs. Start with step 1 today, add steps 2 and 3 whenever you're ready.</p>
<div class="cta"><a class="btn accent" href="#get">See my free preview</a><a class="btn ghost" href="#website">How it works</a></div>
<div class="steps3"><a href="#website"><b>1</b>Get found and called</a><a href="#texting"><b>2</b>Never miss a lead</a><a href="#ads"><b>3</b>Show up first</a></div>
</div></div></div>
${s1}${s2}${s3}
${story}
${get}
` + foot(brand).replace("</body>", `<script>/* test page */</script></body>`);
}
