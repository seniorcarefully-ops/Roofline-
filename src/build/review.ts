import { pathToFileURL } from "node:url";
import { chromium, devices, type Browser } from "playwright";
import type { BuildBrief } from "./brief.js";

export interface ReviewCheck { name: string; pass: boolean; detail?: string }
export interface ReviewResult { verdict: "approved" | "edits"; checks: ReviewCheck[] }

/** Claims we never make unless a verified source supports them. */
const UNSUPPORTED = /\b(repairs?|replacements?|inspections?|residential|commercial|emergency|24\/7|licensed|insured|bonded|warrant(y|ies)|guarantee[ds]?|years of experience|since (19|20)\d\d|award[- ]winning|certified|#1|best in|family[- ]owned|free estimates?)\b/i;

/**
 * Independent automated review of a rendered preview. Separate from the builder:
 * it only reads the output and the brief, and reports concrete failures.
 */
export async function reviewPreview(htmlPath: string, brief: BuildBrief, purchaseUrl: string, browser?: Browser): Promise<ReviewResult> {
  const own = !browser;
  const b = browser ?? (await chromium.launch());
  const checks: ReviewCheck[] = [];
  const check = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, ...(pass ? {} : { detail }) });
  try {
    for (const [label, dev] of [["mobile", devices["iPhone 13"]], ["desktop", { viewport: { width: 1280, height: 800 } }]] as const) {
      const ctx = await b.newContext({ ...dev, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(pathToFileURL(htmlPath).href);
      const m = await page.evaluate(`({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        title: document.title,
        h1: (document.querySelector("h1")||{}).innerText || "",
        robots: (document.querySelector('meta[name=robots]')||{}).content || "",
        tels: Array.from(document.querySelectorAll('a[href^="tel:"]')).map(function(a){return a.getAttribute("href")}),
        imgsBroken: Array.from(document.images).filter(function(i){return !i.complete || i.naturalWidth===0}).length,
        siteText: (document.querySelector("main")||document.body).innerText + " " + (document.querySelector("header")||{}).innerText,
        forms: Array.from(document.forms).map(function(f){return {preview: f.dataset.preview, action: f.getAttribute("action")}}),
        buy: (document.querySelector('#rl-bar a')||{}).href || "",
        barVisible: (function(){var e=document.querySelector('#rl-bar'); if(!e) return false; var r=e.getBoundingClientRect(); return r.height>0 && r.top < window.innerHeight})()
      })`) as any;
      check(`${label}: no horizontal overflow`, m.overflow <= 1, `${m.overflow}px overflow`);
      check(`${label}: no script errors`, errors.length === 0, errors.join("; "));
      check(`${label}: purchase bar visible`, m.barVisible);
      if (label === "desktop") {
        check("business name in title and heading", m.title.includes(brief.businessName) && m.h1.includes(brief.businessName));
        check("noindex set", /noindex/.test(m.robots));
        check("no broken images", m.imgsBroken === 0, `${m.imgsBroken} broken`);
        const telsOk = brief.phoneE164 ? m.tels.length > 0 && m.tels.every((t: string) => t === `tel:${brief.phoneE164}`) : m.tels.length === 0;
        check("tap-to-call matches verified phone", telsOk, `found ${m.tels.join(",")}`);
        check("contact form disabled for preview", m.forms.every((f: any) => f.preview === "true" && !f.action));
        check("purchase link tied to this prospect", m.buy === purchaseUrl, m.buy);
        // Service words are allowed only when they appear in the verified services list.
        const verified = brief.services.join(" ").toLowerCase();
        const bad = [...m.siteText.matchAll(new RegExp(UNSUPPORTED.source, "gi"))].map((x) => x[0])
          .find((w) => !verified.includes(w.toLowerCase()));
        check("no unsupported claims", !bad, bad);
        if (brief.rating && brief.reviewCount)
          check("rating matches Google listing", m.siteText.includes(`${brief.rating.toFixed(1)} from ${brief.reviewCount} Google reviews`));
        else check("no rating shown without data", !/Google reviews/.test(m.siteText));
      }
      await ctx.close();
    }
  } finally {
    if (own) await b.close();
  }
  return { verdict: checks.every((c) => c.pass) ? "approved" : "edits", checks };
}
