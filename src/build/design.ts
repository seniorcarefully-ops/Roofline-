import { createHash } from "node:crypto";

/**
 * Per-business design choices so no two previews look alike. Deterministic:
 * the same business always gets the same design (stable across rebuilds).
 */
export type Layout = "bold" | "light" | "split" | "classic";
export const LAYOUTS: Layout[] = ["bold", "light", "split", "classic"];

export const FONT_PAIRS = [
  { head: "Inter Tight", body: "Inter", url: "family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800" },
  { head: "Fraunces", body: "Inter", url: "family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700" },
  { head: "Archivo", body: "Archivo", url: "family=Archivo:wght@400;500;600;700;800" },
  { head: "Manrope", body: "Manrope", url: "family=Manrope:wght@400;500;600;700;800" },
];

/** Curated accents used only when the business has no usable brand color of its own. */
export const FALLBACK_ACCENTS = ["#e2561b", "#1f4e79", "#2f6b3a", "#9a3b26", "#3d5a73", "#7a4b16", "#0f766e"];

const h = (seed: string, salt: string) => parseInt(createHash("sha1").update(`${seed}:${salt}`).digest("hex").slice(0, 8), 16);

export interface DesignFacts { rating: number | null; count: number | null; city: string | null; licensedSince: number | null; state: string | null }

/** Headlines built only from verified facts; empty when facts are thin. */
export function factHeadlines(f: DesignFacts, one: string): string[] {
  const out: string[] = [];
  if (f.rating && f.count && f.rating >= 4.7 && f.count >= 10) out.push(`Rated ${f.rating.toFixed(1)} stars by ${f.count} customers.`);
  if (f.rating && f.count && f.rating >= 4.5 && f.count >= 25 && f.city) out.push(`${f.count} reviews. One ${f.city} ${one}.`);
  if (f.licensedSince && f.licensedSince <= new Date().getFullYear() - 5) out.push(`Licensed in ${f.state ?? "Washington"} since ${f.licensedSince}.`);
  return out;
}

export function chooseDesign(seed: string, bank: string[], facts: string[]) {
  const layout = LAYOUTS[h(seed, "layout") % LAYOUTS.length]!;
  const fonts = FONT_PAIRS[h(seed, "fonts") % FONT_PAIRS.length]!;
  // Prefer a fact headline when one exists (more personal), otherwise a general one.
  const pool = facts.length && h(seed, "fact") % 3 !== 0 ? facts : bank;
  const headline = pool[h(seed, "headline") % pool.length]!;
  const accent = FALLBACK_ACCENTS[h(seed, "accent") % FALLBACK_ACCENTS.length]!;
  const heroTag = layout === "light" || layout === "split" ? (h(seed, "herotag") % 2 ? "home" : "hero") : "hero";
  return { layout, fonts, headline, accent, heroTag };
}
