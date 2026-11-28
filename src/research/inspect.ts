import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, devices, type Browser } from "playwright";

export interface Finding { code: string; detail: string; sourceUrl: string; evidencePath: string }
export interface Branding { builder: string | null; footer: string; footerLinks: string[]; colors: string[]; logo: { src: string; w: number; h: number } | null }
export interface Inspection { ok: boolean; finalUrl: string | null; error?: string; findings: Finding[]; screenshot?: string; branding?: Branding; pages?: string[] }

/** Launch Chromium through the environment proxy when one is set, so DNS matches the public internet. */
export function launchBrowser(): Promise<Browser> {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  // The proxy only carries HTTPS; plain-HTTP pages are loaded directly.
  const p = proxy?.replace(/^https?:\/\//, "");
  return chromium.launch(p ? { args: [`--proxy-server=https=${p}`] } : {});
}

/** Ask Google public DNS whether a hostname exists. true = NXDOMAIN confirmed. */
export async function confirmedNoDns(hostname: string): Promise<boolean> {
  for (const type of ["A", "CNAME"]) {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`);
    const d: any = await r.json();
    if (d.Status !== 3) return false; // anything but NXDOMAIN: not confirmed broken
  }
  return true;
}

const ESTIMATE = /(free\s+)?(estimate|quote|inspection|bid)/i;

interface PageMetrics { telCount: number; ctaCount: number; overflow: number; viewportMeta: boolean; links: string[];
  copyrightYear: number | null; reviewsShown: boolean; smallTextRatio: number; textNodes: number; pageText: string; branding: Branding; lang: string; formCount: number }

export interface Expect { name: string; phone: string | null; domain: string | null }

const GENERIC = new Set(["roof","roofs","roofing","roofers","roofer","repair","repairs","llc","inc","co","company","the","and","of","services","service","construction","contractors","contractor","exteriors","exterior","home","homes","pros","pro","group","solutions","gutters","gutter","siding","windows","corp","&"]);

/** Share of common English function words; US business sites are well above 4%. */
export function looksEnglish(text: string): boolean {
  const w = text.toLowerCase().match(/[a-z\u00c0-\u024f']+/g) ?? [];
  if (w.length < 40) return true; // too little text to judge
  const common = new Set(["the", "and", "to", "of", "a", "in", "for", "your", "we", "our", "you", "with", "is", "are", "on", "or", "us", "that", "it", "be"]);
  return w.filter((x) => common.has(x)).length / w.length >= 0.04;
}

/** True only if the loaded page plausibly belongs to this business (name word, phone, or domain text). */
export function pageMatchesBusiness(text: string, e: Expect): boolean {
  const t = text.toLowerCase();
  const digits = t.replace(/\D/g, "");
  const ph = (e.phone ?? "").replace(/\D/g, "").slice(-10);
  if (ph.length === 10 && (digits.includes(ph) || digits.includes(ph.slice(3)))) return true;
  const words = e.name.toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length >= 3 && !GENERIC.has(w));
  if (words.length && words.some((w) => new RegExp(`\\b${w}\\b`).test(t))) return true;
  if (!words.length && t.includes(e.name.toLowerCase())) return true;
  return false;
}

// Runs inside the page. Plain JS string so bundlers cannot inject helpers.
const PAGE_METRICS = `function (estimateSrc) {
  var est = new RegExp(estimateSrc, "i");
  function visible(el) {
    var r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  }
  var tel = Array.from(document.querySelectorAll('a[href^="tel:"]')).filter(visible);
  var ctas = Array.from(document.querySelectorAll("a, button, input[type=submit]")).filter(visible)
    .filter(function (e) { return est.test(e.innerText || e.value || ""); });
  var host = location.hostname, seen = {};
  var links = Array.from(document.querySelectorAll("a[href]")).map(function (a) { try { return new URL(a.getAttribute("href"), location.href).href.split("#")[0]; } catch (e) { return ""; } })
    .filter(function (h) {
      try { var u = new URL(h); if (u.hostname !== host || !/^https?:$/.test(u.protocol) || seen[h]) return false; seen[h] = 1; return true; }
      catch (e) { return false; }
    }).slice(0, 25);
  var text = document.body ? document.body.innerText : "";
  var years = [], re = /(?:\\u00a9|&copy;|copyright)\\s*(?:\\d{4}\\s*[-\\u2013]\\s*)?(\\d{4})/gi, mm;
  while ((mm = re.exec(text))) years.push(parseInt(mm[1], 10));
  var revRe = /(testimonial|reviews?\\b|what (our )?(customers|clients) say|\\u2605)/i;
  var reviewsShown = revRe.test(text) || Array.from(document.querySelectorAll("a[href]")).some(function (a) {
    return /(review|testimonial)/i.test((a.getAttribute("href") || "") + " " + (a.textContent || ""));
  });
  var small = 0, total = 0, walker = document.createTreeWalker(document.body || document, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    var n = walker.currentNode, el = n.parentElement;
    if (!el || n.textContent.trim().length < 20 || !visible(el)) continue;
    total++; if (parseFloat(getComputedStyle(el).fontSize) < 12) small++;
  }
  return { telCount: tel.length, ctaCount: ctas.length,
    copyrightYear: years.length ? Math.max.apply(null, years) : null, reviewsShown: reviewsShown,
    smallTextRatio: total ? small / total : 0, textNodes: total,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    viewportMeta: !!document.querySelector('meta[name="viewport"]'), links: links,
    lang: document.documentElement.lang || "", formCount: Array.from(document.querySelectorAll("form")).filter(function (f) { return visible(f) && f.querySelectorAll("input:not([type=hidden]),textarea").length >= 2; }).length, pageText: (document.title + "\\n" + text).slice(0, 50000), branding: branding() };
  function branding() {
    var html = document.documentElement.outerHTML.slice(0, 400000).toLowerCase();
    var gen = ((document.querySelector('meta[name="generator"]') || {}).content || "").toLowerCase();
    var builder = /wix/.test(gen) || html.indexOf("static.wixstatic.com") >= 0 ? "wix"
      : /squarespace/.test(gen) || html.indexOf("squarespace") >= 0 ? "squarespace"
      : html.indexOf("img1.wsimg.com") >= 0 || /godaddy|website builder/.test(gen) ? "godaddy"
      : html.indexOf("weebly") >= 0 ? "weebly" : html.indexOf("site123") >= 0 ? "site123"
      : /duda/.test(gen) || html.indexOf("multiscreensite") >= 0 || html.indexOf("dudaone") >= 0 ? "duda"
      : /wordpress/.test(gen) || html.indexOf("wp-content") >= 0 ? "wordpress" : null;
    var f = document.querySelector("footer") || document.body;
    var footer = (f.innerText || "").slice(-1500);
    var footerLinks = Array.from(f.querySelectorAll("a[href]")).map(function (a) { return a.href; }).filter(function (h) {
      try { return new URL(h).hostname !== location.hostname && /^https?:/.test(h); } catch (e) { return false; } }).slice(0, 30);
    var colors = [];
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc && tc.content) { colors.push(tc.content, tc.content); }
    Array.from(document.querySelectorAll("header, nav, button, .btn, .button, a[class*=btn], a[class*=button], input[type=submit], [class*=cta]")).slice(0, 80).forEach(function (el) {
      if (!visible(el)) return; var cs = getComputedStyle(el); colors.push(cs.backgroundColor); colors.push(cs.borderTopColor); });
    Array.from(document.querySelectorAll("a, h1, h2, h3")).slice(0, 120).forEach(function (el) { if (visible(el)) colors.push(getComputedStyle(el).color); });
    var logo = null, best = 0;
    Array.from(document.images).forEach(function (im) {
      var r = im.getBoundingClientRect(); if (!im.currentSrc && !im.src) return;
      var key = ((im.currentSrc || im.src) + " " + im.alt + " " + im.className + " " + im.id + " " + ((im.parentElement && im.parentElement.className) || "")).toLowerCase();
      var inHeader = !!im.closest("header, nav, [class*=header], [id*=header]");
      var score = (key.indexOf("logo") >= 0 ? 3 : 0) + (inHeader ? 2 : 0) + (r.top < 250 ? 1 : 0);
      if (score >= 3 && score > best && im.naturalWidth > 0) { best = score; logo = { src: im.currentSrc || im.src, w: im.naturalWidth, h: im.naturalHeight }; }
    });
    return { builder: builder, footer: footer, footerLinks: footerLinks, colors: colors, logo: logo };
  }
}`;

/**
 * Load a site as an iPhone and run deterministic checks. Read-only: never
 * submits forms or clicks anything that could contact the business.
 */
async function inspectOne(url: string, outDir: string, browser?: Browser, expect?: Expect): Promise<Inspection> {
  const own = !browser;
  const b = browser ?? (await launchBrowser());
  await mkdir(outDir, { recursive: true });
  const ctx = await b.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const findings: Finding[] = [];
  let bytes = 0;
  page.on("response", (r) => { const l = Number(r.headers()["content-length"]); if (l > 0) bytes += l; });
  try {
    let res;
    try {
      res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e) {
      return { ok: false, finalUrl: null, error: e instanceof Error ? e.message.split("\n")[0] : String(e), findings };
    }
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    const finalUrl = page.url();
    if (!res || res.status() >= 400) return { ok: false, finalUrl, error: `HTTP ${res?.status()}`, findings };

    const shot = join(outDir, "mobile-top.png");
    await page.screenshot({ path: shot });
    const full = join(outDir, "mobile-full.png");
    await page.screenshot({ path: full, fullPage: true }).catch(() => {});
    const add = (code: string, detail: string, evidencePath = shot) =>
      findings.push({ code, detail, sourceUrl: finalUrl, evidencePath });

    if (new URL(finalUrl).protocol !== "https:")
      add("no_https", `Site loads over plain HTTP (${finalUrl}); browsers mark it "Not secure".`);

    const m: PageMetrics = await page.evaluate(`(${PAGE_METRICS})(${JSON.stringify(ESTIMATE.source)})`);
    // Never audit a page that isn't this business (parked domain, placeholder, other company).
    // A US roofer's site in another language is almost always hijacked or not theirs.
    if (expect && !looksEnglish(m.pageText))
      return { ok: false, finalUrl, error: `site_mismatch: page is not in English${m.lang ? ` (${m.lang})` : ""}`, findings: [] };
    if (expect && !pageMatchesBusiness(m.pageText, expect))
      return { ok: false, finalUrl, error: "site_mismatch: page does not show this business's name or phone", findings: [] };

    // Check the whole site, not just the homepage: a thing is "missing" only if no page has it.
    const KEY = /(contact|estimate|quote|about|service|roof|review|testimonial|gallery|project|area|repair|replace)/i;
    const sub = [...new Set(m.links.map((l) => l.split("#")[0]!))].filter((l) => l && l !== finalUrl && !/\.(pdf|jpe?g|png|gif|webp|zip)$/i.test(l))
      .sort((a, b) => Number(KEY.test(b)) - Number(KEY.test(a))).slice(0, 7);
    const pages: { url: string; m: PageMetrics }[] = [{ url: finalUrl, m }];
    for (const url of sub) {
      try {
        const r = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        if (!r || r.status() >= 400) continue;
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
        if (new URL(page.url()).hostname.replace(/^www\./, "") !== new URL(finalUrl).hostname.replace(/^www\./, "")) continue;
        pages.push({ url: page.url(), m: await page.evaluate(`(${PAGE_METRICS})(${JSON.stringify(ESTIMATE.source)})`) as PageMetrics });
      } catch { /* skip pages that fail to load */ }
    }
    const n = pages.length, onN = n > 1 ? `any of the ${n} pages we checked` : "the homepage";
    if (pages.every((p) => p.m.telCount === 0)) add("no_tap_to_call", `No tap-to-call (tel:) link on ${onN} on a phone.`);
    if (pages.every((p) => p.m.ctaCount === 0 && p.m.formCount === 0))
      add("no_estimate_cta", `No button, link or form to request an estimate, quote, or inspection on ${onN}.`, full);
    const wide = pages.filter((p) => p.m.overflow > 8 || !p.m.viewportMeta);
    if (wide.some((p) => p.url === finalUrl))
      add("mobile_overflow", m.viewportMeta
        ? `Homepage is ${m.overflow}px wider than an iPhone screen, causing sideways scrolling${wide.length > 1 ? ` (${wide.length} of ${n} pages checked have this problem)` : ""}.`
        : "Homepage has no mobile viewport setting, so phones show a shrunken desktop layout.");

    const year = new Date().getFullYear();
    const newest = Math.max(0, ...pages.map((p) => p.m.copyrightYear ?? 0));
    if (newest && newest <= year - 3)
      add("stale_copyright", `Footer copyright says ${newest}, suggesting the site has not been updated in years.`, full);
    if (pages.every((p) => !p.m.reviewsShown))
      add("no_reviews_shown", `No customer reviews or testimonials on ${onN}.`, full);
    if (m.textNodes >= 5 && m.smallTextRatio >= 0.4)
      add("small_text", `${Math.round(m.smallTextRatio * 100)}% of text blocks on the homepage are smaller than 12px on a phone, hard to read without zooming.`);
    if (bytes > 6_000_000)
      add("heavy_page", `Homepage downloads ${(bytes / 1e6).toFixed(1)} MB, slow on mobile data.`);

    const broken: string[] = [];
    const allLinks = [...new Set(pages.flatMap((p) => p.m.links))].slice(0, 60);
    for (const l of allLinks) {
      try {
        const r = await ctx.request.get(l, { timeout: 10000, maxRedirects: 5 });
        if (r.status() === 404 || r.status() === 410 || r.status() >= 500) broken.push(`${l} (${r.status()})`);
      } catch { /* network flake: not evidence of a broken link */ }
    }
    if (broken.length) add("broken_links", `Broken links: ${broken.slice(0, 5).join(", ")}`);

    return { ok: true, finalUrl, findings, screenshot: shot, branding: m.branding, pages: pages.map((p) => p.url) };
  } finally {
    await ctx.close();
    if (own) await b.close();
  }
}

function altUrl(url: string): string {
  const u = new URL(url);
  u.hostname = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
  u.protocol = "https:";
  return u.toString();
}

/** Inspect a listed site; if the listed URL fails, try the www/bare variant and record that. */
export async function inspectSite(url: string, outDir: string, browser?: Browser, expect?: Expect): Promise<Inspection> {
  const first = await inspectOne(url, outDir, browser, expect);
  if (first.error?.startsWith("site_mismatch")) return first;
  if (first.ok || first.finalUrl) return first;
  const alt = altUrl(url);
  const second = await inspectOne(alt, outDir, browser, expect);
  if (!second.ok) return first;
  // Only claim the listing link is broken if public DNS confirms it, or the site itself errors.
  const dnsFail = /ERR_NAME_NOT_RESOLVED/.test(first.error ?? "");
  if (dnsFail && !(await confirmedNoDns(new URL(url).hostname).catch(() => false))) return second;
  second.findings.unshift({
    code: "listing_link_broken",
    detail: `The website link on the Google Business listing (${url}) does not load (${first.error}); the site only works at ${second.finalUrl}.`,
    sourceUrl: url,
    evidencePath: second.screenshot!,
  });
  return second;
}
