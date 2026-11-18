import { SERVICES } from "./catalog.js";
import { stripe } from "./stripe.js";

/**
 * Idempotently ensure one product + monthly price per service, found by lookup_key.
 * If a price exists with a different amount it is NOT changed; an error is raised.
 */
export async function ensureCatalog(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [service, s] of Object.entries(SERVICES)) {
    const found = await stripe("GET", "/v1/prices", { "lookup_keys[]": s.lookupKey, active: "true" });
    const existing = found.data[0];
    if (existing) {
      if (existing.unit_amount !== s.cents || existing.recurring?.interval !== "month")
        throw new Error(`price ${s.lookupKey} differs from approved catalog; resolve manually`);
      out[service] = existing.id;
      continue;
    }
    const product = await stripe("POST", "/v1/products", { name: s.name, metadata: { service } },
      `product:${s.lookupKey}`);
    const price = await stripe("POST", "/v1/prices", {
      product: product.id, currency: "usd", unit_amount: s.cents,
      recurring: { interval: "month" }, lookup_key: s.lookupKey, metadata: { service },
    }, `price:${s.lookupKey}`);
    out[service] = price.id;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureCatalog().then((c) => console.log(c));
}
