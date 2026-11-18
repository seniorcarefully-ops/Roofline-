import { SERVICES, type Service } from "./catalog.js";
import { stripe } from "./stripe.js";

/** Create a hosted Checkout session for one independent subscription. */
export async function createCheckout(opts: {
  service: Service;
  prospectId: number;
  previewVersion?: number;
  email?: string | null;
  baseUrl: string;
  previewToken?: string;
}): Promise<{ id: string; url: string }> {
  const prices = await stripe("GET", "/v1/prices", { "lookup_keys[]": SERVICES[opts.service].lookupKey, active: "true" });
  const price = prices.data[0];
  if (!price) throw new Error(`no active price for ${opts.service}; run billing setup`);
  const meta = { prospect_id: String(opts.prospectId), service: opts.service,
    preview_version: opts.previewVersion?.toString(), preview_token: opts.previewToken };
  const s = await stripe("POST", "/v1/checkout/sessions", {
    mode: "subscription",
    line_items: { 0: { price: price.id, quantity: 1 } },
    client_reference_id: String(opts.prospectId),
    customer_email: opts.email ?? undefined,
    allow_promotion_codes: "true",
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: `${opts.baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.baseUrl}/purchase/canceled${opts.previewToken ? `?t=${opts.previewToken}` : ""}`,
  });
  return { id: s.id, url: s.url };
}

/** Self-service billing (cancel, update card, invoices). */
export async function createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<string> {
  const s = await stripe("POST", "/v1/billing_portal/sessions", { customer: stripeCustomerId, return_url: returnUrl });
  return s.url;
}
