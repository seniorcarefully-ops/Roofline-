import { z } from "zod";

/**
 * Everything the builder may put on a preview. Every field must come from a
 * verified source (Google listing or the business's own site); nothing is invented.
 */
export const BuildBrief = z.object({
  prospectId: z.number().int(),
  version: z.number().int().min(1),
  businessName: z.string().min(1),
  phone: z.string().nullable(),            // display format, from Google listing
  phoneE164: z.string().nullable(),
  city: z.string().nullable(),             // from listing address
  serviceArea: z.array(z.string()),        // only places verified from listing/site
  services: z.array(z.string()),           // only services found on their own site; may be empty
  hours: z.array(z.string()).nullable(),   // from Google listing
  rating: z.number().nullable(),
  reviewCount: z.number().int().nullable(),
  googleMapsUrl: z.string().url().nullable(),
  placeId: z.string().nullable(),
  license: z.object({ number: z.string(), bonded: z.boolean().nullable(), insured: z.boolean().nullable() }).nullable(),
  servicesSource: z.enum(["website", "category"]).nullable(), // category = Google says roofing_contractor
  sources: z.array(z.string()),            // URLs the facts came from
});
export type BuildBrief = z.infer<typeof BuildBrief>;
