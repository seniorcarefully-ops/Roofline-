/**
 * Branding helpers. Everything comes from the business's own website; when a
 * signal is weak we fall back to the standard design instead of guessing.
 */

const DEFAULT_LINK = new Set(["#0000ee", "#551a8b", "#0000ff", "#1a0dab", "#0645ad"]);

export interface RGB { r: number; g: number; b: number }

export function parseColor(s: string): RGB | null {
  const m = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i);
  if (m) { if (m[4] !== undefined && Number(m[4]) < 0.6) return null; return { r: +m[1]!, g: +m[2]!, b: +m[3]! }; }
  const h = s.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!h) return null;
  const x = h[1]!.length === 3 ? h[1]!.split("").map((c) => c + c).join("") : h[1]!;
  return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16) };
}

export const hex = (c: RGB) => "#" + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

function hsl(c: RGB) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { s, l };
}

const lum = (c: RGB) => {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
export const contrastWithWhite = (c: RGB) => 1.05 / (lum(c) + 0.05);
const mix = (a: RGB, b: RGB, t: number): RGB => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });

/**
 * Pick the brand accent from colors sampled on their site (buttons, header, links).
 * Only clearly colored, frequently used values count; greys, near-black and
 * near-white are ignored. Returns null when nothing qualifies.
 */
export function pickBrandColor(samples: string[]): string | null {
  const counts = new Map<string, { c: RGB; n: number }>();
  for (const s of samples) {
    const c = parseColor(s); if (!c) continue;
    const { s: sat, l } = hsl(c);
    if (sat < 0.35 || l < 0.18 || l > 0.82) continue;
    const k = hex(c);
    if (DEFAULT_LINK.has(k)) continue; // browser default link colors are not branding
    const e = counts.get(k) ?? { c, n: 0 }; e.n++; counts.set(k, e);
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  return best && best.n >= 2 ? hex(best.c) : null;
}

/** Accent set that always reads well with white button text. */
export function accentPalette(brandHex: string): { accent: string; accent2: string; tint: string; light: string } {
  let c = parseColor(brandHex)!;
  for (let i = 0; i < 12 && contrastWithWhite(c) < 3.2; i++) c = mix(c, { r: 0, g: 0, b: 0 }, 0.1);
  return { accent: hex(c), accent2: hex(mix(c, { r: 0, g: 0, b: 0 }, 0.14)), tint: hex(mix(c, { r: 255, g: 255, b: 255 }, 0.9)),
    light: hex(mix(c, { r: 255, g: 255, b: 255 }, 0.55)) };
}

/** Display name: drop legal suffixes and join spaced initials ("M G Wagner Co Inc Roofing" -> "MG Wagner Roofing"). */
export function displayName(name: string): string {
  // Google names often carry keyword stuffing after a separator: "Go Excel Construction : Roof Replacement Specialist".
  let n = name.split(/\s+[:|\u2013\u2014-]\s+|\s*[:|]\s*/)[0]!.trim() || name;
  n = n.replace(/,?\s*\b(inc|llc|l\.l\.c|corp|corporation|ltd|pllc)\b\.?/gi, "").replace(/\s+/g, " ").trim();
  n = n.replace(/\bco\b\.?(?=\s+(roofing|construction|exteriors)\b)/i, "").replace(/\s+/g, " ").trim();
  n = n.replace(/\b([A-Z])\s+(?=[A-Z]\b)/g, "$1");
  return n || name;
}

const DIY = /^(wix|squarespace|godaddy|weebly|site123|jimdo|webnode|strikingly|yola)$/;
export const isDiyBuilder = (b: string | null) => !!b && DIY.test(b);

/** Known roofing/contractor marketing agencies (footer links or credits). */
export const AGENCY_HINTS = /(scorpion|roofing ?webmasters|hook agency|contractor ?gorilla|blue ?corona|footbridge|roofer ?marketers|roofing ?marketing|rooferseo|contractor ?growth|webfx|hibu|thryv|yodle|reach ?local|lmsites|cdk|rooftop ?marketing|1sync|bluehat|semper ?fi web|the ?contractor ?marketing)/i;

/** Pull an agency credit out of footer text, ignoring site builders. */
export function agencyCredit(footer: string, links: string[]): string | null {
  const m = footer.match(/\b(?:website|site|web ?design|web ?development|designed|developed|built|created|marketing|seo)(?:\s+(?:and|&)\s+\w+)?\s+by[:\s]+([A-Z0-9][\w&.' -]{2,40})/i);
  if (m && !/^(wix|squarespace|godaddy|wordpress|weebly|shopify|duda|site123|jimdo|the owner)/i.test(m[1]!.trim())) return m[0].trim().slice(0, 80);
  const l = links.find((h) => AGENCY_HINTS.test(h));
  if (l) return `footer link: ${l.slice(0, 80)}`;
  if (AGENCY_HINTS.test(footer)) return (footer.match(AGENCY_HINTS)?.[0] ?? "agency").slice(0, 80);
  return null;
}

/** Logo passes only if it's a real image of usable size and shape. */
export function logoUsable(w: number, h: number, type: string, bytes: number): boolean {
  if (!/^image\/(png|jpe?g|webp|svg\+xml|gif)$/.test(type) || bytes < 300 || bytes > 600_000) return false;
  if (type === "image/svg+xml") return true;
  const ratio = w / h;
  return w >= 160 && h >= 40 && ratio >= 0.8 && ratio <= 7;
}
