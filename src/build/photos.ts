import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Photo { id: string; tag: string; alt: string | null; raw: string; author: string; authorUrl: string; page: string }

const LIB: Photo[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "photo-library.json"), "utf8"));

/** Unsplash requires hotlinking; size/crop via its image CDN parameters. */
export const photoUrl = (p: Photo, w: number, h?: number) =>
  `${p.raw}&w=${w}${h ? `&h=${h}&fit=crop` : ""}&q=72&auto=format`;

/** Deterministic pick per business so each site differs but stays stable across rebuilds. */
export function pickPhoto(tag: string, seed: string, skip: Set<string> = new Set()): Photo | null {
  const pool = LIB.filter((p) => p.tag === tag && !skip.has(p.id));
  if (!pool.length) return null;
  const n = parseInt(createHash("sha1").update(`${seed}:${tag}`).digest("hex").slice(0, 8), 16);
  return pool[n % pool.length]!;
}

export function serviceTag(service: string): string {
  const s = service.toLowerCase();
  if (s.includes("repair")) return "repair";
  if (s.includes("replace") || s.includes("new roof") || s.includes("install")) return "replacement";
  if (s.includes("inspect")) return "inspection";
  if (s.includes("gutter")) return "gutters";
  if (s.includes("metal")) return "metal";
  return "shingles";
}
