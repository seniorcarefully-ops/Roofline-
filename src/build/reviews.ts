/**
 * Live Google reviews for a place. Fetched at page-render time and not stored,
 * per Google Maps Platform terms; shown with Google and author attribution.
 */
export interface LiveReview { author: string; authorUrl: string | null; photo: string | null; rating: number; text: string; when: string }
export interface LiveReviews { rating: number | null; count: number | null; mapsUrl: string | null; reviews: LiveReview[] }

export const MIN_RATING_FOR_REVIEWS = 3.5;

export async function fetchLiveReviews(placeId: string): Promise<LiveReviews> {
  const headers: Record<string, string> = { "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews" };
  if (process.env.GOOGLE_PLACES_KEY) headers["X-Goog-Api-Key"] = process.env.GOOGLE_PLACES_KEY;
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, { headers });
  const d: any = await r.json();
  if (!r.ok) throw new Error(`Places reviews ${r.status}`);
  const reviews: LiveReview[] = (d.reviews ?? [])
    .filter((x: any) => (x.rating ?? 0) >= 4 && (x.text?.text ?? x.originalText?.text))
    .map((x: any) => ({
      author: x.authorAttribution?.displayName ?? "Google user",
      authorUrl: x.authorAttribution?.uri ?? null,
      photo: x.authorAttribution?.photoUri ?? null,
      rating: x.rating,
      text: x.text?.text ?? x.originalText?.text,
      when: x.relativePublishTimeDescription ?? "",
    }));
  return { rating: d.rating ?? null, count: d.userRatingCount ?? null, mapsUrl: d.googleMapsUri ?? null, reviews };
}
