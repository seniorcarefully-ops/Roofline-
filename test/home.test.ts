import { describe, expect, it } from "vitest";
import { renderHomeV2 } from "../src/server/home.js";
import { roofing } from "../src/niches/roofing.js";

describe("per-niche offer page", () => {
  it("renders any number of steps from config", () => {
    const offer = { headline: "Keep your schedule full.", subhead: "Two steps.",
      steps: [roofing.offer!.steps[0]!, { ...roofing.offer!.steps[1]!, id: "marketing", chip: "Get booked" }] };
    const html = renderHomeV2(roofing.brand, "roofing", {}, offer);
    expect(html).toContain("<h1>Keep your schedule full.</h1>");
    expect(html).toContain('<a href="#marketing"><b>2</b>Get booked</a>');
    expect(html).not.toContain('id="texting"');
    expect(html.match(/class="step-num"/g)?.length).toBe(2);
  });
  it("roofing config renders the approved two steps with prices", () => {
    const html = renderHomeV2(roofing.brand, "roofing", {}, roofing.offer);
    for (const p of ["$150", "$200"]) expect(html).toContain(`<span class="amt2">${p}</span>`);
    expect(html).not.toContain("$500");
  });
});

describe("persona photo per niche", () => {
  it("each niche shows only its own polaroid", async () => {
    const { leakDetection } = await import("../src/niches/leak_detection.js");
    expect(renderHomeV2(roofing.brand, "roofing", {}, roofing.offer)).toContain('/assets/persona/roofing.jpg');
    const leak = renderHomeV2(leakDetection.brand, "leak_detection", {}, leakDetection.offer);
    expect(leak).not.toContain("/assets/persona/roofing.jpg");
    expect(leak).toContain("/assets/persona/leak_detection.jpg");
  });
});
