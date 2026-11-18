/**
 * Minimal Stripe REST client. The API key is injected by the environment's
 * network proxy (or STRIPE_SECRET_KEY when running elsewhere); it is never logged.
 */
type Params = Record<string, unknown>;

function encode(p: Params, prefix = "", out: string[] = []): string[] {
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v as Params, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

export class StripeError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Stripe ${status}: ${JSON.stringify((body as any)?.error?.message ?? body)}`);
  }
}

export async function stripe<T = any>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Params = {},
  idempotencyKey?: string,
): Promise<T> {
  const qs = encode(params).join("&");
  const headers: Record<string, string> = { "Stripe-Version": "2025-03-31.basil" };
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const url = `https://api.stripe.com${path}${method !== "POST" && qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { method, headers, body: method === "POST" ? qs : undefined });
  const body = await res.json();
  if (!res.ok) throw new StripeError(res.status, body);
  return body as T;
}
