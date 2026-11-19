import type { NicheConfig } from "./schema.js";
import { roofing } from "./roofing.js";
import { leakDetection } from "./leak_detection.js";

/** All niche configs known to the code. Live/draft status is decided by routing + DB activation. */
export const NICHES: Record<string, NicheConfig> = { roofing, leak_detection: leakDetection };

/** Public path slug for a niche (used for /n/<slug> test sites). */
export const slugOf = (niche: string) => niche.replace(/_/g, "-");
export const nicheFromSlug = (slug: string) => NICHES[slug.replace(/-/g, "_")] ?? null;

/** Map a request's Host header to a niche (each live niche brand has its own domain). */
export function nicheForHost(host: string | undefined): NicheConfig | null {
  const h = (host ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
  return Object.values(NICHES).find((n) => n.brand.domain && n.brand.domain === h) ?? null;
}
