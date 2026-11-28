import { words } from "../niches/words.js";
import type { Db } from "../db.js";
import type { BuildBrief } from "./brief.js";

/** Fetch verified listing details for a place (hours, maps link, city, phone). */
export async function placeDetails(placeId: string): Promise<any> {
  const headers: Record<string, string> = {
    "X-Goog-FieldMask": "displayName,nationalPhoneNumber,internationalPhoneNumber,addressComponents,regularOpeningHours.weekdayDescriptions,googleMapsUri,rating,userRatingCount,websiteUri",
  };
  if (process.env.GOOGLE_PLACES_KEY) headers["X-Goog-Api-Key"] = process.env.GOOGLE_PLACES_KEY;
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, { headers });
  const body: any = await r.json();
  if (!r.ok) throw new Error(`Places details ${r.status}: ${body?.error?.message}`);
  return body;
}

/** Build a brief from the prospect record plus a fresh Google listing lookup. Nothing invented. */
export async function assembleBrief(db: Db, prospectId: number, version: number): Promise<BuildBrief> {
  const p = (await db.query(`SELECT p.*, v.niche_id FROM prospects p JOIN niche_versions v ON v.id = p.niche_version_id WHERE p.id = $1`, [prospectId])).rows[0];
  if (!p) throw new Error("prospect not found");
  if (!p.place_id) throw new Error("prospect has no Google place id; cannot verify facts");
  const niche: string = p.niche_id;
  const d = await placeDetails(p.place_id);
  const comp = (t: string) => d.addressComponents?.find((c: any) => c.types?.includes(t));
  const city = comp("locality")?.longText ?? null;
  const state = comp("administrative_area_level_1")?.shortText ?? null;
  const e164 = d.internationalPhoneNumber ? "+" + d.internationalPhoneNumber.replace(/\D/g, "") : null;
  return {
    prospectId,
    version,
    businessName: d.displayName?.text ?? p.business_name,
    phone: d.nationalPhoneNumber ?? null,
    phoneE164: e164,
    city: city && state ? `${city}, ${state}` : city,
    serviceArea: [],
    // Without a verified service list, use only what the Google category implies.
    services: words(niche).site.defaultServices,
    servicesSource: "category",
    placeId: p.place_id,
    license: p.license_status === "ACTIVE"
      ? { number: p.license_number, bonded: p.license_bonded, insured: p.license_insured,
          since: p.license_since ? new Date(p.license_since).getUTCFullYear() : null } : null,
    hours: d.regularOpeningHours?.weekdayDescriptions ?? null,
    rating: d.rating ?? null,
    reviewCount: d.userRatingCount ?? null,
    googleMapsUrl: d.googleMapsUri ?? null,
    branding: p.brand_color ? {
      accent: p.brand_color ?? null,
      logoDataUri: null, // owner decision 2026-11-28: use their name, not their logo
    } : null,
    sources: [d.googleMapsUri ?? `place:${p.place_id}`, ...(p.license_number ? [`wa-lni:${p.license_number}`] : [])],
  };
}
