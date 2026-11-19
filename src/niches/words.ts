/**
 * Per-niche wording used across the brand site, preview sites and emails.
 * Adding a niche = adding an entry here plus its NicheConfig (src/niches/<niche>.ts).
 */
export interface NicheWords {
  one: string; many: string; trade: string; person: string;
  site: {
    heroHeadline: string;           // preview-site hero
    statLabel: string;              // e.g. "Local roofer"
    reachOut: string; takeLook: string; ctaHeadline: string; msgPlaceholder: string;
    defaultServices: string[];      // only what the Google category clearly implies
  };
  demo: { problem: string; followUp: string; lead: string; searchQuery: string; category: string };
}

export const NICHE_WORDS: Record<string, NicheWords> = {
  roofing: {
    one: "roofer", many: "roofers", trade: "roofing", person: "roofer",
    site: {
      heroHeadline: "A roof you don't have to think about.", statLabel: "Local roofer",
      reachOut: "send a request with a few details about your roof.", takeLook: "We'll talk through what you're seeing and what your roof needs.",
      ctaHeadline: "Let's talk about your roof.", msgPlaceholder: "What's going on with your roof?",
      defaultServices: ["Roof repair", "Roof replacement"],
    },
    demo: { problem: "Got a leak over the garage after last night's storm", followUp: "Sorry to hear that. What's the address, and is water coming in right now? Photos help too.",
      lead: "Leak over garage · 123 Pine St · urgent · 1 photo", searchQuery: "roof repair near me", category: "Roofing contractor" },
  },
  leak_detection: {
    one: "leak detection company", many: "leak detection companies", trade: "leak detection", person: "leak detection tech",
    site: {
      heroHeadline: "Find the leak. Stop the damage.", statLabel: "Local leak detection",
      reachOut: "send a request with a few details about the leak.", takeLook: "We'll talk through what you're seeing and how to find the source.",
      ctaHeadline: "Let's find your leak.", msgPlaceholder: "What are you seeing? (water spot, high bill, sound of running water...)",
      defaultServices: ["Leak detection"],
    },
    demo: { problem: "Our water bill doubled and there's a damp spot in the hallway", followUp: "Sorry to hear that. What's the address, and is the spot growing? A photo helps too.",
      lead: "Possible slab leak · 88 Elm Ave · damp hallway · 1 photo", searchQuery: "leak detection near me", category: "Leak detection service" },
  },
};

const FALLBACK: NicheWords = { one: "business", many: "local businesses", trade: "local service", person: "tradesman",
  site: { heroHeadline: "Local service you can count on.", statLabel: "Local", reachOut: "send a request with a few details.",
    takeLook: "We'll talk through what you need.", ctaHeadline: "Let's talk.", msgPlaceholder: "How can we help?", defaultServices: [] },
  demo: { problem: "Can you help with a job this week?", followUp: "Sure. What's the address and what do you need?", lead: "New job request · 1 photo", searchQuery: "near me", category: "Local service" } };

export const words = (niche: string): NicheWords => NICHE_WORDS[niche] ?? FALLBACK;
