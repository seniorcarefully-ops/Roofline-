/** Google Places API (New) text search. Key is injected by the network proxy. */
export interface Place {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  rating: number | null;
  reviews: number;
  status: string | null;
  types: string[];
}

const FIELDS = [
  "places.id", "places.displayName", "places.websiteUri", "places.nationalPhoneNumber",
  "places.formattedAddress", "places.rating", "places.userRatingCount", "places.businessStatus",
  "places.types", "nextPageToken",
].join(",");

export async function searchPlaces(query: string, maxPages = 3): Promise<Place[]> {
  const out: Place[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const headers: Record<string, string> = { "Content-Type": "application/json", "X-Goog-FieldMask": FIELDS };
    if (process.env.GOOGLE_PLACES_KEY) headers["X-Goog-Api-Key"] = process.env.GOOGLE_PLACES_KEY;
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST", headers, body: JSON.stringify({ textQuery: query, pageSize: 20, pageToken }),
    });
    const body: any = await res.json();
    if (!res.ok) throw new Error(`Places ${res.status}: ${body?.error?.message}`);
    for (const p of body.places ?? []) {
      out.push({
        id: p.id, name: p.displayName?.text ?? "", website: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null, address: p.formattedAddress ?? null,
        rating: p.rating ?? null, reviews: p.userRatingCount ?? 0, status: p.businessStatus ?? null,
        types: p.types ?? [],
      });
    }
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

/** Lowercase host without www, used for deduplication. */
export function normalizeDomain(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

/** Strip tracking params (e.g. utm_*) from a website URL. */
export function cleanUrl(url: string): string {
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|gclid|fbclid)/.test(k)) u.searchParams.delete(k);
  return u.toString();
}
