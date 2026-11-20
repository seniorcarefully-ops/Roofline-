import { describe, expect, it } from "vitest";
import { guardReply, type InboundContext } from "../src/ai/assistant.js";
import { roofing } from "../src/niches/roofing.js";

const ctx = (o: Partial<InboundContext> = {}): InboundContext => ({
  channel: "email", text: "", brand: roofing.brand, niche: "roofing", company: "Acme Roofing", firstName: null,
  previewUrl: "https://rooflinewebsites.com/p/tok", optInUrl: null, smsPermission: false, history: [], today: "2026-11-19", ...o });

describe("reply guard", () => {
  it("allows approved prices", () => expect(guardReply("It's $150/month, cancel anytime.", ctx())).toBeTruthy());
  it("blocks the retired $500 price", () => expect(() => guardReply("Marketing is $500/month.", ctx())).toThrow(/price/));
  it("blocks unapproved prices and discounts", () => {
    expect(() => guardReply("Only $99 this week!", ctx())).toThrow(/price/);
    expect(() => guardReply("I can give you a discount.", ctx())).toThrow(/forbidden/);
  });
  it("blocks claiming to be human, allows honest AI disclosure", () => {
    expect(() => guardReply("Yes, I'm a real person.", ctx())).toThrow();
    expect(guardReply("I'm not a real person, I'm an AI assistant.", ctx())).toBeTruthy();
    expect(guardReply("We never call you, everything happens by text.", ctx())).toBeTruthy();
    expect(() => guardReply("Someone will call you tomorrow.", ctx())).toThrow();
  });
  it("blocks preview link without SMS permission", () => {
    expect(() => guardReply("Here: https://rooflinewebsites.com/p/tok", ctx())).toThrow(/permission/);
    expect(guardReply("Here: https://rooflinewebsites.com/p/tok", ctx({ channel: "sms", smsPermission: true }))).toBeTruthy();
  });
  it("blocks long SMS", () => expect(() => guardReply("x".repeat(500), ctx({ channel: "sms" }))).toThrow(/long/));
});
