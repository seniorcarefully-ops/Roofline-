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

const FALLBACK_BRAND: Brand = { name: "Roofline", domain: null, colors: { primary: "#1F2A37", accent: "#E4572E" }, tagline: "Websites built for roofing companies." };
async function currentBrand(pool: pg.Pool): Promise<Brand> {
  return (await activeNiche(pool).catch(() => null))?.config.brand ?? FALLBACK_BRAND;
}

export function createApp(pool: pg.Pool) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      const m = url.pathname.match(/^\/p\/([A-Za-z0-9_-]{16,64})(\/buy)?\/?$/);

      if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, "ok", "text/plain");

      if (req.method === "GET" && m && !m[2]) {
        const pv = await approvedPreview(pool, m[1]!);
        if (!pv) return send(res, 404, messagePage(await currentBrand(pool), "Not found", "This link isn't available.", "The preview may have been replaced with a newer version."));
        const brief = BuildBrief.parse(pv.brief);
        const live = brief.placeId ? await fetchLiveReviews(brief.placeId).catch(() => null) : null;
        const html = renderRidge(brief, NicheConfig.parse(pv.config).brand, { purchaseUrl: purchaseUrlFor(pv.token), live });
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

      if (req.method === "POST" && url.pathname === "/stripe/webhook") {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return send(res, 503, "webhook not configured", "text/plain");
        const body = await readBody(req);
        if (!verifyWebhook(body, String(req.headers["stripe-signature"] ?? ""), secret)) return send(res, 400, "bad signature", "text/plain");
        await handleEvent(pool, JSON.parse(body));
        return send(res, 200, "ok", "text/plain");
      }

      return send(res, 404, messagePage(await currentBrand(pool), "Not found", "Page not found.", "This page doesn't exist."));
    } catch (e) {
      console.error("request failed:", e instanceof Error ? e.message : e);
      if (!res.headersSent) send(res, 500, messagePage(FALLBACK_BRAND, "Something went wrong", "Something went wrong.", "Please try again in a moment."));
    }
  });
}
