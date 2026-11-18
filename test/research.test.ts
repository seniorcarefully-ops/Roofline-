import { createServer, type Server } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium } from "playwright";
import { inspectSite } from "../src/research/inspect.js";
import { fitReason } from "../src/research/discover.js";
import { cleanUrl, normalizeDomain } from "../src/research/places.js";

const BAD = `<html><body style="margin:0"><div style="width:1200px">Acme Roofing. Call (509) 555-0100.
  <a href="/missing">Gallery</a></div></body></html>`;
const GOOD = `<html><head><meta name="viewport" content="width=device-width"></head><body>
  <a href="tel:+15095550100">Call now</a> <a href="/estimate">Get a free estimate</a></body></html>`;

let server: Server; let base: string;
beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/bad") { res.end(BAD); return; }
    if (req.url === "/good" || req.url === "/estimate") { res.end(GOOD); return; }
    res.statusCode = 404; res.end("nope");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(() => server.close());

describe("inspector", () => {
  it("finds real problems on a bad page", async () => {
    const b = await chromium.launch();
    const r = await inspectSite(`${base}/bad`, await mkdtemp(join(tmpdir(), "ev-")), b);
    await b.close();
    const codes = r.findings.map((f) => f.code).sort();
    expect(codes).toEqual(["broken_links", "mobile_overflow", "no_estimate_cta", "no_https", "no_tap_to_call"]);
    expect(r.findings.every((f) => f.evidencePath.endsWith(".png"))).toBe(true);
  });
  it("does not invent problems on a good page (aside from local http)", async () => {
    const b = await chromium.launch();
    const r = await inspectSite(`${base}/good`, await mkdtemp(join(tmpdir(), "ev-")), b);
    await b.close();
    expect(r.findings.map((f) => f.code)).toEqual(["no_https"]);
  });
});

describe("discovery helpers", () => {
  const crit = { placeTypes: ["roofing_contractor"], minRating: 3.5, minReviews: 5 };
  const p = { id: "x", name: "A", website: "https://a.com", phone: null, address: null, rating: 4.5, reviews: 10,
    status: "OPERATIONAL", types: ["roofing_contractor"] };
  it("fit rules", () => {
    expect(fitReason(p, crit)).toBeNull();
    expect(fitReason({ ...p, website: null }, crit)).toBe("no_website");
    expect(fitReason({ ...p, reviews: 2 }, crit)).toBe("few_reviews");
    expect(fitReason({ ...p, status: "CLOSED_PERMANENTLY" }, crit)).toBe("not_operational");
  });
  it("normalizes and cleans urls", () => {
    expect(normalizeDomain("https://WWW.Acme.com/x")).toBe("acme.com");
    expect(cleanUrl("http://a.com/?utm_source=google&page=2")).toBe("http://a.com/?page=2");
  });
});
