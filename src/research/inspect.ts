import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, devices, type Browser } from "playwright";

export interface Finding { code: string; detail: string; sourceUrl: string; evidencePath: string }
export interface Inspection { ok: boolean; finalUrl: string | null; error?: string; findings: Finding[]; screenshot?: string }

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

interface PageMetrics { telCount: number; ctaCount: number; overflow: number; viewportMeta: boolean; links: string[] }

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
  return { telCount: tel.length, ctaCount: ctas.length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    viewportMeta: !!document.querySelector('meta[name="viewport"]'), links: links };
}`;

/**
 * Load a site as an iPhone and run deterministic checks. Read-only: never
 * submits forms or clicks anything that could contact the business.
 */
async function inspectOne(url: string, outDir: string, browser?: Browser): Promise<Inspection> {
  const own = !browser;
  const b = browser ?? (await launchBrowser());
  await mkdir(outDir, { recursive: true });
  const ctx = await b.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const findings: Finding[] = [];
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

    if (m.telCount === 0) add("no_tap_to_call", "No tap-to-call (tel:) link found on the mobile homepage.");
    if (m.ctaCount === 0) add("no_estimate_cta", "No visible button or link to request an estimate, quote, or inspection.", full);
    if (m.overflow > 8 || !m.viewportMeta)
      add("mobile_overflow", m.viewportMeta
        ? `Page is ${m.overflow}px wider than an iPhone screen, causing sideways scrolling.`
        : "Page has no mobile viewport setting, so phones show a shrunken desktop layout.");

    const broken: string[] = [];
    for (const l of m.links) {
      try {
        const r = await ctx.request.get(l, { timeout: 10000, maxRedirects: 5 });
        if (r.status() === 404 || r.status() === 410 || r.status() >= 500) broken.push(`${l} (${r.status()})`);
      } catch { /* network flake: not evidence of a broken link */ }
    }
    if (broken.length) add("broken_links", `Broken links: ${broken.slice(0, 5).join(", ")}`);

    return { ok: true, finalUrl, findings, screenshot: shot };
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
export async function inspectSite(url: string, outDir: string, browser?: Browser): Promise<Inspection> {
  const first = await inspectOne(url, outDir, browser);
  if (first.ok || first.finalUrl) return first;
  const alt = altUrl(url);
  const second = await inspectOne(alt, outDir, browser);
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
