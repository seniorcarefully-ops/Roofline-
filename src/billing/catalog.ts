/** Approved prices (plan section 4). Changing these requires Micah's approval. */
export const SERVICES = {
  website: { name: "Roofline Managed Website", cents: 15000, lookupKey: "roofline_website_monthly" },
  sms: { name: "Roofline AI Missed-Call Response", cents: 20000, lookupKey: "roofline_sms_monthly" },
  marketing: { name: "Roofline Automated Marketing", cents: 50000, lookupKey: "roofline_marketing_monthly" },
} as const;
export type Service = keyof typeof SERVICES;

export function serviceForLookupKey(key: string | null | undefined): Service | null {
  for (const [s, v] of Object.entries(SERVICES)) if (v.lookupKey === key) return s as Service;
  return null;
}
