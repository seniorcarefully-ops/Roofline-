import type { NicheConfig } from "./schema.js";

export const roofing: NicheConfig = {
  niche: "roofing",
  brand: {
    name: "Roofline Websites",
    domain: "rooflinewebsites.com",
    colors: { primary: "#1F2A37", accent: "#E4572E" },
    tagline: "Websites built for roofing companies.",
  },
  prospecting: {
    placeTypes: ["roofing_contractor"],
    searchTerms: ["roofing contractor", "roofer", "roof repair"],
    minRating: 3.5,
    minReviews: 5,
  },
  audit: {
    priorities: [
      { code: "listing_link_broken", phrase: "a working website link on your Google listing" },
      { code: "no_tap_to_call", phrase: "a tap-to-call button on mobile" },
      { code: "no_estimate_cta", phrase: "a clear way to request an estimate" },
      { code: "mobile_overflow", phrase: "a layout that fits phone screens" },
      { code: "broken_form", phrase: "a working contact form" },
      { code: "unclear_services", phrase: "a clear list of roofing services" },
      { code: "unclear_service_area", phrase: "the areas you serve" },
      { code: "no_https", phrase: "a secure (HTTPS) connection" },
      { code: "broken_links", phrase: "working links" },
      { code: "small_text", phrase: "text that is readable on a phone" },
      { code: "no_reviews_shown", phrase: "customer reviews or testimonials" },
      { code: "stale_copyright", phrase: "signs that the site is kept up to date" },
      { code: "heavy_page", phrase: "a page that loads quickly on mobile data" },
    ],
    requiredFindings: 3,
  },
  builder: {
    requiredSections: ["hero", "services", "service_area", "about", "contact"],
    templates: ["ridge", "shingle"],
  },
  sales: {
    terminology: { job: "roofing job", customer: "homeowner" },
    faqs: [
      { q: "How much is it?", a: "$150/month. No setup fee, no long-term commitment, cancel anytime." },
      { q: "Do I keep my domain?", a: "Yes. We connect your existing domain; it stays in your account." },
      { q: "Can I request changes?", a: "Yes. Routine updates to text, photos, services, and hours are included." },
    ],
  },
};
