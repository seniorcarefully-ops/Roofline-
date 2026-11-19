import type { NicheConfig } from "./schema.js";
import { roofing } from "./roofing.js";

/**
 * DRAFT niche for testing the multi-niche engine. Brand name is a placeholder
 * (not approved); no domain yet. Prices are the approved $150/$200/$500.
 */
export const leakDetection: NicheConfig = {
  niche: "leak_detection",
  brand: {
    name: "Leak Detection Websites",
    domain: null,
    colors: { primary: "#12263A", accent: "#1E88E5" },
    tagline: "Websites built for leak detection companies.",
    postalAddress: roofing.brand.postalAddress,
  },
  prospecting: {
    placeTypes: ["plumber"],
    searchTerms: ["leak detection", "water leak detection", "slab leak detection"],
    minRating: 3.5,
    minReviews: 5,
  },
  audit: {
    priorities: [
      { code: "listing_link_broken", phrase: "a working website link on your Google listing" },
      { code: "no_tap_to_call", phrase: "a tap-to-call button on mobile" },
      { code: "no_estimate_cta", phrase: "a clear way to request service" },
      { code: "mobile_overflow", phrase: "a layout that fits phone screens" },
      { code: "broken_form", phrase: "a working contact form" },
      { code: "unclear_services", phrase: "a clear list of the leaks you find and fix" },
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
  builder: { requiredSections: ["hero", "services", "service_area", "about", "contact"], templates: ["ridge"] },
  offer: {
    headline: "Get more leak detection jobs.",
    subhead: "Three simple steps that bring in more calls from people with leaks. Start with step 1 today, add steps 2 and 3 whenever you're ready.",
    steps: [
      { id: "website", chip: "Get found and called", tag: "Managed website", title: "Turn worried homeowners into calls.",
        lead: "Someone with a high water bill or a damp wall searches on their phone and calls the first company that looks trustworthy. Be that company.",
        how: ["<b>Tap-to-call and request buttons</b> on every screen, for people who need help now",
          "<b>Your real Google reviews</b>, shown live, so they trust you before they call",
          "<b>Clear services</b>: slab leaks, water lines, pools, non-invasive detection, whatever you actually do",
          "<b>Already built for you</b>: we make it from your public info, you see it before you pay",
          "<b>Zero upkeep</b>: hosting, security and free edits whenever you ask"],
        price: "$150", per: "/ month", note: "No setup fee. Keep your domain. Cancel anytime.", cta: "See my free preview", visual: "website" },
      { id: "texting", chip: "Never miss a leak call", tag: "AI missed-call texting", title: "Every leak is urgent. Answer like it.",
        lead: "You're under a house or on a job when the phone rings. A homeowner watching water spread won't wait. They call the next company. This keeps them with you.",
        how: ["<b>Texts every missed caller back in seconds</b>, day or night",
          "<b>Asks the right questions</b>: water bill, wet spots, sounds of running water",
          "<b>Collects the details and photos</b> so you show up prepared",
          "<b>Sends you a ready-to-call lead</b>, flagged urgent when water is active",
          "<b>A monthly report</b> of missed callers saved and jobs captured"],
        price: "$200", per: "/ month", note: "Works with your current number. Add it anytime, cancel anytime.", cta: "Start with my free preview", visual: "sms" },
      { id: "ads", chip: "Show up first", tag: "Get More Calls · managed Google marketing", title: "Be the first call when they search.",
        lead: "\"Leak detection near me\" is searched by people ready to hire today. We put you at the top of the map and the ads.",
        how: ["<b>Google Business Profile, managed</b>: services, areas, photos and updates for the local map",
          "<b>More 5-star reviews</b>: automatic review requests after every job",
          "<b>Google ads that bring calls</b>: Local Services Ads and search ads within your budget",
          "<b>Know what's working</b>: calls, leads, cost per lead and new reviews every month"],
        price: "$500", per: "/ month", note: "Ad spend is separate, paid to Google, and always yours to set.", cta: "Start with my free preview", visual: "search" },
    ],
  },
  sales: {
    terminology: { job: "leak detection job", customer: "homeowner" },
    faqs: roofing.sales.faqs,
  },
};
