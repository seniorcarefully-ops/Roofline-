import { describe, expect, it } from "vitest";
import { fitScore } from "../src/research/score.js";
const base = { licenseStatus: "ACTIVE", rating: 4.8, reviews: 30, findings: 3, hasWebsite: true, emailVerified: true, ownerName: true, name: "Acme Roofing" };
describe("fit score", () => {
  it("ideal prospect scores 100", () => expect(fitScore(base).score).toBe(100));
  it("inactive license excluded", () => expect(fitScore({ ...base, licenseStatus: "EXPIRED" }).score).toBe(0));
  it("no website counts as a strong signal", () => expect(fitScore({ ...base, hasWebsite: false, findings: 0 }).score).toBe(100));
  it("unreachable prospect scores lower", () => expect(fitScore({ ...base, emailVerified: false }).score).toBe(80));
});
