import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderRidge, writePreview } from "../src/build/render.js";
import { reviewPreview } from "../src/build/review.js";
import { roofing } from "../src/niches/roofing.js";

const brief = { prospectId: 7, version: 1, businessName: "Acme Roofing", phone: "(509) 555-0100", phoneE164: "+15095550100",
  city: "Spokane, WA", serviceArea: [], services: [], hours: ["Monday: 8:00 AM – 4:00 PM"], rating: 4.9, reviewCount: 31,
  googleMapsUrl: "https://maps.google.com/?cid=1", sources: [] };
const buy = "https://app.test/p/7/v1/buy";

describe("builder + reviewer", () => {
  it("approves a correct preview", async () => {
    const out = await writePreview(await mkdtemp(join(tmpdir(), "pv-")), renderRidge(brief, roofing.brand, buy));
    const r = await reviewPreview(out.path, brief, buy);
    expect(r.checks.filter((c) => !c.pass)).toEqual([]);
    expect(r.verdict).toBe("approved");
  }, 30000);

  it("catches an unsupported claim, wrong phone, and wrong purchase link", async () => {
    const html = renderRidge(brief, roofing.brand, buy)
      .replace("Talk to a local roofer", "Licensed and insured. Talk to a local roofer")
      .replace('href="tel:+15095550100"', 'href="tel:+15095559999"')
      .replace(buy, "https://app.test/p/8/v1/buy");
    const dir = await mkdtemp(join(tmpdir(), "pv-")); const path = join(dir, "index.html"); await writeFile(path, html);
    const r = await reviewPreview(path, brief, buy);
    expect(r.verdict).toBe("edits");
    const failed = r.checks.filter((c) => !c.pass).map((c) => c.name);
    expect(failed).toEqual(expect.arrayContaining(["no unsupported claims", "tap-to-call matches verified phone", "purchase link tied to this prospect"]));
  }, 30000);

  it("allows service words only when verified", async () => {
    const b2 = { ...brief, services: ["Roof repair", "Roof replacement"] };
    const out = await writePreview(await mkdtemp(join(tmpdir(), "pv-")), renderRidge(b2, roofing.brand, buy));
    expect((await reviewPreview(out.path, b2, buy)).verdict).toBe("approved");
  }, 30000);
});
