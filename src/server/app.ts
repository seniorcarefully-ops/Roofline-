import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type pg from "pg";
import { createCheckout } from "../billing/checkout.js";
import { handleEvent, verifyWebhook } from "../billing/events.js";
import { BuildBrief } from "../build/brief.js";
import { APP_BASE_URL, purchaseUrlFor } from "../build/pipeline.js";
import { renderRidge } from "../build/render.js";
import { fetchLiveReviews } from "../build/reviews.js";
import { NicheConfig } from "../niches/schema.js";
import { activeNiche } from "../niches/registry.js";
import { stripe } from "../billing/stripe.js";
import { canceledPage, messagePage, successPage, type Brand } from "./pages.js";
import { previewUrlFor } from "../build/pipeline.js";
import { consentText, loadOptin, renderOptin } from "./optin.js";
import { brandPage } from "./pages.js";
import { grantSms, toE164 } from "../outreach/consent.js";
import { demoBrief, renderDoc, renderHome, renderHomeV2, words } from "./home.js";
import { unsubscribeByToken } from "../outreach/unsubscribe.js";
import { roofing } from "../niches/roofing.js";
import { nicheForHost, nicheFromSlug } from "../niches/index.js";
const roofingOffer = roofing.offer;
import { handleInstantlyEvent } from "../outreach/replies.js";
import { timingSafeEqual } from "node:crypto";

const send = (res: ServerResponse, status: number, body: string, type = "text/html; charset=utf-8", extra: Record<string, string> = {}) => {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", ...extra });
  res.end(body);
};
const page = (title: string, msg: string) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title}</title><body style="font:17px/1.6 system-ui;max-width:560px;margin:15vh auto;padding:0 20px;color:#111827">
<h1 style="font-size:28px">${title}</h1><p>${msg}</p></body>`;

async function readBody(req: IncomingMessage, limit = 1_000_000): Promise<string> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error("body too large"); chunks.push(c as Buffer); }
  return Buffer.concat(chunks).toString("utf8");
}

/** Load an approved, current preview by its public token. */
async function approvedPreview(pool: pg.Pool, token: string) {
  const r = await pool.query(
    `SELECT pv.*, p.prospect_state, p.contact_email, v.config,
            (SELECT verdict FROM reviews WHERE preview_id = pv.id ORDER BY id DESC LIMIT 1) AS verdict,
            (SELECT MAX(version) FROM previews WHERE prospect_id = pv.prospect_id) AS latest
     FROM previews pv JOIN prospects p ON p.id = pv.prospect_id JOIN niche_versions v ON v.id = p.niche_version_id
     WHERE pv.token = $1`, [token]);
  const row = r.rows[0];
  if (!row || row.verdict !== "approved" || !row.brief) return null;
  return row;
}

const FALLBACK_BRAND: Brand = { name: "Roofline Websites", domain: "rooflinewebsites.com", colors: { primary: "#1F2A37", accent: "#E4572E" }, tagline: "Websites built for roofing companies.", postalAddress: "Roofline Websites, PO Box 2106, Woodinville, WA 98072" };
async function currentBrand(pool: pg.Pool): Promise<Brand> {
  return (await activeNiche(pool).catch(() => null))?.config.brand ?? FALLBACK_BRAND;
}

export function createApp(pool: pg.Pool) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      const m = url.pathname.match(/^\/p\/([A-Za-z0-9_-]{16,64})(\/buy)?\/?$/);

      if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, "ok", "text/plain");
      // Persona (Cole) polaroid per niche: /assets/persona/<niche>.jpg; old URL kept for roofing.
      const pm = url.pathname === "/assets/cole.jpg" ? ["", "roofing"] : url.pathname.match(/^\/assets\/persona\/([a-z_]{2,40})\.jpg$/);
      if (req.method === "GET" && pm) {
        const { readFile } = await import("node:fs/promises");
        const { fileURLToPath } = await import("node:url");
        const img = await readFile(fileURLToPath(new URL(`../assets/persona/${pm[1]}.jpg`, import.meta.url))).catch(() => null);
        return img ? send(res, 200, img as any, "image/jpeg", { "Cache-Control": "public, max-age=86400" }) : send(res, 404, "", "text/plain");
      }

      // Draft/test niche sites, not yet on their own domain: /n/<niche-slug> (noindex).
      const nm = url.pathname.match(/^\/n\/([a-z-]{2,40})\/?$/);
      if (req.method === "GET" && nm) {
        const cfg = nicheFromSlug(nm[1]!);
        if (!cfg || !cfg.offer) return send(res, 404, messagePage(await currentBrand(pool), "Not found", "Page not found.", "This page doesn't exist.", "/"));
        return send(res, 200, renderHomeV2(cfg.brand, cfg.niche, {}, cfg.offer), undefined, { "X-Robots-Tag": "noindex, nofollow" });
      }

      // Public brand site (indexable).
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/v1" || url.pathname === "/v2" || url.pathname === "/privacy" || url.pathname === "/terms" || url.pathname === "/demo")) {
        const byHost = nicheForHost(req.headers.host);
        const an = byHost ? { config: byHost } : await activeNiche(pool).catch(() => null);
        const brand = an?.config.brand ?? FALLBACK_BRAND, niche = an?.config.niche ?? "roofing";
        if (url.pathname === "/") return send(res, 200, renderHomeV2(brand, niche, { sent: url.searchParams.get("sent") === "1" }, an?.config.offer ?? roofingOffer));
        if (url.pathname === "/v2") return send(res, 301, "", "text/plain", { Location: "/" });
        if (url.pathname === "/v1") return send(res, 200, renderHome(brand, niche, { sent: url.searchParams.get("sent") === "1" }), undefined, { "X-Robots-Tag": "noindex" });
        if (url.pathname === "/demo") {
          const dn = nicheFromSlug(url.searchParams.get("n") ?? "") ?? an?.config ?? roofing;
          const html = renderRidge(demoBrief(dn.niche), dn.brand, { purchaseUrl: "/#get", niche: dn.niche })
            .replace("</head>", "<style>#rl-bar,#rl-fade{display:none!important}body{padding-bottom:0!important}</style></head>");
          return send(res, 200, html, undefined, { "X-Robots-Tag": "noindex" });
        }
        return send(res, 200, renderDoc(brand, url.pathname === "/privacy" ? "privacy" : "terms"));
      }
      if (req.method === "POST" && url.pathname === "/request") {
        const an = await activeNiche(pool).catch(() => null);
        const brand = an?.config.brand ?? FALLBACK_BRAND, niche = an?.config.niche ?? "roofing";
        const f = new URLSearchParams(await readBody(req, 10_000));
        const business = (f.get("business") ?? "").trim().slice(0, 120), city = (f.get("city") ?? "").trim().slice(0, 80);
        const website = (f.get("website") ?? "").trim().slice(0, 200) || null, phone = toE164(f.get("phone") ?? "");
        if (!business || !city || !phone) return send(res, 400, renderHome(brand, niche, { error: "Please fill in your business, city and a valid US cell number." }));
        if (f.get("consent") !== "yes") return send(res, 400, renderHome(brand, niche, { error: "Please check the box to agree to receive texts." }));
        const consent = `I agree to receive text messages from ${brand.name} about my website preview, including follow-up questions and offers. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.`;
        const r = await pool.query(`INSERT INTO inbound_requests(business_name, city, website, phone_e164, consent_text, niche, user_agent)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [business, city, website, phone, consent, niche, String(req.headers["user-agent"] ?? "").slice(0, 200)]);
        await pool.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('inbound_request',$1,$2)`,
          [String(r.rows[0].id), `inbound preview request: ${business}, ${city} (${words(niche).one})`]);
        return send(res, 303, "", "text/plain", { Location: "/?sent=1#get" });
      }

      // One-click unsubscribe. GET shows a confirm button (link scanners open GETs);
      // POST (button or List-Unsubscribe-Post one-click) performs it.
      const u = url.pathname.match(/^\/u\/([a-f0-9]{32})\/?$/);
      if (u) {
        const brand = await currentBrand(pool);
        if (req.method === "POST") {
          await readBody(req, 10_000).catch(() => "");
          const r = await unsubscribeByToken(pool, u[1]!, "link");
          return send(res, r.ok ? 200 : 404, r.ok
            ? brandPage(brand, { title: "Unsubscribed", icon: "check", tone: "success", heading: "You're unsubscribed.", lead: "You won't get any more emails from us. Sorry for the bother." })
            : messagePage(brand, "Not found", "This link isn't valid.", "If you keep getting emails, just reply \"unsubscribe\"."));
        }
        if (req.method === "GET") return send(res, 200, brandPage(brand, { title: "Unsubscribe", icon: "info", heading: "Unsubscribe from our emails?",
          lead: "One tap and you won't hear from us again.",
          body: `<form method="post" style="background:none;padding:0;box-shadow:none"><button class="btn primary" type="submit" style="border:0;cursor:pointer;font:600 17px Inter,sans-serif;padding:15px 26px;border-radius:999px;background:var(--accent);color:#fff">Unsubscribe me</button></form>` }), undefined, { "Cache-Control": "no-store" });
      }

      // Audit + SMS opt-in page (the link in the email).
      const s = url.pathname.match(/^\/s\/([A-Za-z0-9_-]{16,64})(?:\/(optin|thumb\.jpg|img\/([A-Za-z0-9._-]{1,80})))?\/?$/);
      if (s) {
        const token = s[1]!;
        if (req.method === "GET" && s[2] === "thumb.jpg") {
          const r = await pool.query(`SELECT thumb FROM previews WHERE token = $1 AND thumb IS NOT NULL`, [token]);
          return r.rowCount ? send(res, 200, r.rows[0].thumb, "image/jpeg", { "Cache-Control": "private, max-age=3600" }) : send(res, 404, "", "text/plain");
        }
        if (req.method === "GET" && s[3]) {
          const r = await pool.query(`SELECT e.png FROM evidence_images e JOIN previews pv ON pv.prospect_id = e.prospect_id
            WHERE pv.token = $1 AND e.key = $2`, [token, decodeURIComponent(s[3])]);
          return r.rowCount ? send(res, 200, r.rows[0].png, "image/png", { "Cache-Control": "private, max-age=3600" }) : send(res, 404, "", "text/plain");
        }
        const d = await loadOptin(pool, token);
        if (!d) return send(res, 404, messagePage(await currentBrand(pool), "Not found", "This link isn't available.", "It may have expired or been replaced."));
        if (req.method === "GET" && !s[2]) {
          const pv = (await pool.query(`SELECT prospect_id FROM previews WHERE token = $1`, [token])).rows[0];
          await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'optin_view','visitor',$2)`,
            [String(pv.prospect_id), { ua: String(req.headers["user-agent"] ?? "").slice(0, 200) }]);
          return send(res, 200, renderOptin(d), undefined, { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" });
        }
        if (req.method === "POST" && s[2] === "optin") {
          const form = new URLSearchParams(await readBody(req, 10_000));
          const phone = (form.get("phone") ?? "").slice(0, 40);
          if (!toE164(phone)) return send(res, 400, renderOptin(d, { error: "Please enter a valid US cell number.", phone }));
          if (form.get("consent") !== "yes") return send(res, 400, renderOptin(d, { error: "Please check the box to agree to receive texts.", phone }));
          const pv = (await pool.query(`SELECT prospect_id FROM previews WHERE token = $1`, [token])).rows[0];
          const pid = Number(pv.prospect_id);
          try {
            await grantSms(pool, pid, phone, `${consentText(d.brand.name)} [checked; number entered: ${phone}]`, `optin_page:${token}`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/suppressed/.test(msg)) return send(res, 400, renderOptin(d, { error: "This number opted out of our texts earlier. Text START to us to opt back in.", phone }));
            if (!/not allowed/.test(msg)) throw e; // already granted: fine, continue
          }
          const st = (await pool.query(`SELECT prospect_state FROM prospects WHERE id = $1`, [pid])).rows[0]?.prospect_state;
          if (st === "contacted") await (await import("../state.js")).transition(pool, pid, "prospect_state", "interested", "optin_page");
          const twilioReady = !!process.env.TWILIO_FROM_NUMBER;
          if (twilioReady) {
            await (await import("../jobs.js")).enqueue(pool, "sms.send_preview", { prospect_id: pid, token }, { key: `sms.send_preview:${pid}:${token}` });
            return send(res, 200, brandPage(d.brand, { title: "Check your texts", kicker: "On its way", icon: "check", tone: "success",
              heading: "Check your texts.", lead: `I just texted the link to your new ${d.company} website. Reply anytime with questions.`,
              actions: [{ href: previewUrlFor(token), label: "Or open it here", primary: true }] }));
          }
          // Texting is not switched on yet: show the preview right away instead of promising a text.
          return send(res, 200, brandPage(d.brand, { title: "Your new site", kicker: "Thanks", icon: "check", tone: "success",
            heading: "Here's your new site.", lead: `Thanks! Tap below to see the website I built for ${d.company}.`,
            actions: [{ href: previewUrlFor(token), label: "See your new site", primary: true }] }));
        }
      }

      if (req.method === "GET" && m && !m[2]) {
        const pv = await approvedPreview(pool, m[1]!);
        if (!pv) return send(res, 404, messagePage(await currentBrand(pool), "Not found", "This link isn't available.", "The preview may have been replaced with a newer version."));
        const brief = BuildBrief.parse(pv.brief);
        const live = brief.placeId ? await fetchLiveReviews(brief.placeId).catch(() => null) : null;
        const pc = NicheConfig.parse(pv.config);
        const html = renderRidge(brief, pc.brand, { purchaseUrl: purchaseUrlFor(pv.token), live, niche: pc.niche });
        await pool.query(`INSERT INTO events(subject_type, subject_id, track, actor, detail) VALUES ('prospect',$1,'preview_view','visitor',$2)`,
          [String(pv.prospect_id), { version: pv.version, ua: String(req.headers["user-agent"] ?? "").slice(0, 200) }]);
        return send(res, 200, html, undefined, { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" });
      }

      if (req.method === "GET" && m && m[2]) {
        const pv = await approvedPreview(pool, m[1]!);
        if (!pv) return send(res, 404, messagePage(await currentBrand(pool), "Not found", "This link isn't available.", "The preview may have been replaced with a newer version."));
        const pBrand = NicheConfig.parse(pv.config).brand;
        if (pv.prospect_state === "closed") return send(res, 410, messagePage(pBrand, "Not available", "This offer is no longer available.", "This preview is no longer open for purchase."));
        if (pv.prospect_state === "purchased") return send(res, 200, messagePage(pBrand, "Already purchased", "This site is already yours.", "Your subscription is active. Check your email for next steps.", previewUrlFor(pv.token)));
        const co = await createCheckout({ service: "website", prospectId: pv.prospect_id, previewVersion: pv.version,
          email: pv.contact_email, baseUrl: APP_BASE_URL, previewToken: pv.token });
        return send(res, 303, "", "text/plain", { Location: co.url });
      }

      if (req.method === "GET" && url.pathname === "/purchase/success") {
        const sid = url.searchParams.get("session_id") ?? "";
        let info = { business: null as string | null, email: null as string | null, amount: null as string | null, previewUrl: null as string | null };
        let brand = await currentBrand(pool);
        if (/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) {
          const cs = await stripe("GET", `/v1/checkout/sessions/${sid}`).catch(() => null);
          if (cs && cs.status === "complete") {
            const p = cs.client_reference_id ? (await pool.query(
              `SELECT p.business_name, v.config FROM prospects p JOIN niche_versions v ON v.id = p.niche_version_id WHERE p.id = $1`,
              [Number(cs.client_reference_id)])).rows[0] : null;
            if (p) brand = NicheConfig.parse(p.config).brand;
            info = { business: p?.business_name ?? null, email: cs.customer_details?.email ?? null,
              amount: cs.amount_total != null ? `$${(cs.amount_total / 100).toFixed(0)}` : null,
              previewUrl: cs.metadata?.preview_token ? previewUrlFor(cs.metadata.preview_token) : null };
          }
        }
        return send(res, 200, successPage(brand, info), undefined, { "Cache-Control": "no-store" });
      }
      if (req.method === "GET" && url.pathname === "/purchase/canceled") {
        const t = url.searchParams.get("t");
        const valid = t && /^[A-Za-z0-9_-]{16,64}$/.test(t) ? await approvedPreview(pool, t) : null;
        return send(res, 200, canceledPage(valid ? NicheConfig.parse(valid.config).brand : await currentBrand(pool), valid ? previewUrlFor(valid.token) : null));
      }

      if (req.method === "POST" && url.pathname === "/instantly/webhook") {
        const secret = process.env.INSTANTLY_WEBHOOK_SECRET ?? "";
        const got = String(req.headers["x-roofline-secret"] ?? "");
        const ok = secret.length >= 32 && got.length === secret.length && timingSafeEqual(Buffer.from(got), Buffer.from(secret));
        if (!ok) return send(res, 401, "unauthorized", "text/plain");
        const ev = JSON.parse(await readBody(req, 1_000_000));
        send(res, 200, "ok", "text/plain"); // acknowledge first; process after
        handleInstantlyEvent(pool, ev).catch(async (e) => {
          console.error("instantly event failed:", e instanceof Error ? e.message : e);
          await pool.query(`INSERT INTO exceptions(subject_type, subject_id, reason) VALUES ('instantly_event',$1,$2)`,
            [String(ev?.event_type ?? "?"), `processing failed: ${e instanceof Error ? e.message : e}`]).catch(() => {});
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/stripe/webhook") {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return send(res, 503, "webhook not configured", "text/plain");
        const body = await readBody(req);
        if (!verifyWebhook(body, String(req.headers["stripe-signature"] ?? ""), secret)) return send(res, 400, "bad signature", "text/plain");
        await handleEvent(pool, JSON.parse(body));
        return send(res, 200, "ok", "text/plain");
      }

      return send(res, 404, messagePage(await currentBrand(pool), "Not found", "Page not found.", "This page doesn't exist.", "/"));
    } catch (e) {
      console.error("request failed:", e instanceof Error ? e.message : e);
      if (!res.headersSent) send(res, 500, messagePage(FALLBACK_BRAND, "Something went wrong", "Something went wrong.", "Please try again in a moment."));
    }
  });
}
