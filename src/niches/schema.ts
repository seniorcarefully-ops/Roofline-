import { z } from "zod";

/** Everything that changes when the owner switches the active niche. */
/** Landing-page offer for a niche: headline plus any number of numbered steps. */
export const OfferStep = z.object({
  id: z.string().regex(/^[a-z-]+$/), chip: z.string(), tag: z.string(), title: z.string(), lead: z.string(),
  how: z.array(z.string()).min(1), price: z.string(), per: z.string(), note: z.string(), cta: z.string(),
  visual: z.enum(["website", "sms", "search", "photo"]),
});
export const Offer = z.object({ headline: z.string(), subhead: z.string(), steps: z.array(OfferStep).min(1).max(6) });
export type Offer = z.infer<typeof Offer>;

export const NicheConfig = z.object({
  niche: z.string().regex(/^[a-z_]+$/),
  brand: z.object({
    name: z.string().min(1),
    domain: z.string().nullable(),          // null until purchased
    colors: z.object({ primary: z.string(), accent: z.string() }),
    tagline: z.string(),
    // Required in every commercial email footer (CAN-SPAM). Null blocks sending.
    postalAddress: z.string().nullable().default(null),
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
  offer: Offer.nullable().default(null),
  sales: z.object({
    terminology: z.record(z.string(), z.string()),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
});
export type NicheConfig = z.infer<typeof NicheConfig>;
