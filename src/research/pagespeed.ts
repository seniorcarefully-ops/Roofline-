/**
 * Google PageSpeed Insights (mobile performance). Objective, Google-measured evidence.
 * Uses GOOGLE_PLACES_KEY (the server's Google key must have the PageSpeed Insights API enabled).
 */
export async function mobileSpeedScore(url: string): Promise<{ score: number; lcp: string | null } | null> {
  const q = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  const headers: Record<string, string> = {};
  if (process.env.GOOGLE_PLACES_KEY) headers["X-Goog-Api-Key"] = process.env.GOOGLE_PLACES_KEY;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { headers, signal: ctrl.signal });
    if (!r.ok) return null;
    const d: any = await r.json();
    const s = d?.lighthouseResult?.categories?.performance?.score;
    if (typeof s !== "number") return null;
    return { score: Math.round(s * 100), lcp: d.lighthouseResult.audits?.["largest-contentful-paint"]?.displayValue ?? null };
  } catch { return null; } finally { clearTimeout(t); }
}
