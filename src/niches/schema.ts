import { z } from "zod";

/** Everything that changes when the owner switches the active niche. */
export const NicheConfig = z.object({
  niche: z.string().regex(/^[a-z_]+$/),
  brand: z.object({
    name: z.string().min(1),
    domain: z.string().nullable(),          // null until purchased
    colors: z.object({ primary: z.string(), accent: z.string() }),
    tagline: z.string(),
  }),
  prospecting: z.object({
    placeTypes: z.array(z.string()).min(1),
    searchTerms: z.array(z.string()).min(1),
    minRating: z.number().min(0).max(5),
    minReviews: z.number().int().min(0),
  }),
  audit: z.object({
    // Finding codes in priority order, with the email phrase for each.
    priorities: z.array(z.object({ code: z.string(), phrase: z.string() })).min(3),
    requiredFindings: z.literal(3),
  }),
  builder: z.object({
    requiredSections: z.array(z.string()).min(1),
    templates: z.array(z.string()).min(1),
  }),
  sales: z.object({
    terminology: z.record(z.string(), z.string()),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
});
export type NicheConfig = z.infer<typeof NicheConfig>;
