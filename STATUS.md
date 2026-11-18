# Roofline build status

Updated 2026-11-18.

## Phase 1: Foundation (in progress)
Done and tested (`npm test`, 12 tests, local Postgres):
- Schema: prospects with separate lifecycle tracks, audits, previews, reviews, consents, suppressions, messages, jobs, exceptions, append-only events.
- Immutable niche config versions; switching the active niche preserves existing prospects' brand version.
- State machine with allowed transitions; every transition logged.
- Postgres job queue: idempotent enqueue, SKIP LOCKED claim, backoff retry, exception after max attempts.
- Locked email renderer (exact wording; refuses missing/padded findings).
- Initial-email send gate (paused, state, suppression, approved review, audit attachment, 3 verified findings, no duplicate).
- SMS consent capture with verbatim evidence; STOP suppression.

Billing (Stripe sandbox, verified with real API calls via `npm run test:stripe`):
- Three independent monthly products/prices created idempotently by lookup key ($150 / $200 / $500).
- Hosted Checkout session per service (promotion codes allowed), Customer Portal session.
- Event processing exactly once: checkout completion marks prospect purchased and cancels queued outreach jobs; subscription create/update/delete mirrored; failed payment opens an exception.
- Webhook signature verification; event polling sync works without a public URL.

## Phase 2: Research (in progress)
- Discovery (`npm run cli -- discover "<area>"`): Google Places search with niche terms, fit rules (operational, has website, roofing type, rating >= 3.5, reviews >= 5), dedupe by place id and domain. Live run, Spokane WA: 56 found, 38 stored.
- Mobile inspector (`npm run cli -- audit`): iPhone viewport, read-only. Deterministic checks with screenshot evidence: tap-to-call, estimate/quote CTA, mobile overflow/no viewport, HTTPS, broken internal links, broken Google-listing link (only when Google public DNS confirms).
- Audit v1/v2 produced false positives caused by sandbox DNS/proxy; discarded and logged. v3 results on 38 Spokane prospects: 0 reach 3 findings; Barton Roofing has 2 (verified by screenshot); 6 sites could not be checked (exceptions).
- No-website email variant approved and locked (`renderNoWebsiteEmail`); send gate uses verified Google rating/reviews instead of an audit and still requires an approved preview. Discovery now stores no-website businesses (5+ reviews) as `no_website` prospects.
- Finding: with only objective checks, few established roofers have 3 problems. Targeting/checks need a decision (see owner questions).

- Audit v4 added: stale copyright, no reviews/testimonials shown, small text, heavy page (>6 MB). Region run (Spokane + 8 nearby towns): 105 prospects (96 with sites, 9 without); 8 reached 3+ verified findings; 15 unreachable. v5 tightens the reviews check to also accept a reviews/testimonials page link (re-audit pending).

## Phase 2b: Builder and reviewer (in progress)
- Brief from a fresh Google listing lookup (name, phone, city, hours, rating, maps link). Services/service area are empty unless verified.
- One-page "ridge" template: noindex, preview-only disabled form, separate Roofline purchase bar ($150/mo) tied to prospect+version.
- Independent automated reviewer (mobile + desktop): overflow, script errors, purchase bar, name, noindex, images, tap-to-call equals verified phone, form disabled, purchase link, unsupported claims (service words allowed only if verified), rating matches listing.
- Pipeline with logged state transitions and revision cap (2) then exception.
- First real preview: Stay Dry Solutions LLC approved. Visual design is functional but too plain; design upgrade is next.

- WA L&I license enrichment (data.wa.gov, phone or exact-name match only): 50 active, 6 inactive (closed, not targeted), 16 not matched (no license claims), 33 Idaho (not yet checked). Owner first names stored for greetings.
- Redesigned "ridge" template with complete sections: hero, trust bar, services, why-us (verified facts only), live Google reviews (only if rating >= 3.5; fetched at render, not stored; attributed), how it works, service area + map + hours, FAQ, estimate form (preview-disabled), purchase bar showing $150/month.
- Preview server (`npm run serve`): unguessable token links; serves only reviewer-approved versions; noindex/no-store; /buy creates Stripe Checkout (verified 303 to checkout.stripe.com in sandbox); Stripe webhook endpoint with signature verification. Not yet hosted publicly.
- Premium template v2 (Dribbble-informed patterns, original layout): full-bleed photo hero, glass rating badge, verified stats strip (rating, reviews, WA licensed since), photo service cards, why-us split, dark reviews section, steps, area/map/hours, FAQ, photo-backed estimate CTA, floating purchase bar.
- Photo library: 31 curated Unsplash photos (hotlinked + photographer credit per Unsplash API guidelines; download endpoint triggered). Never captioned as the roofer's work. Owner/crew photos from the roofer's own site: not yet implemented.
- License "since" year stored from L&I effective date (may be a re-licensing date; can only understate).
- Reviewer now scrolls the page and waits for every image before judging.
- Open: map embed shows blank in this sandbox; verify once publicly hosted.

## Hosting (Render, workspace "Roofline", region Oregon)
- Audit + SMS opt-in page /s/<preview token> (the email link): personal hero, blurred phone mockup of the approved preview, up to 3 findings with evidence screenshots (stored in DB), cell + explicit consent checkbox; consent stored verbatim with source. Until Twilio is configured, the page shows the preview link immediately instead of promising a text. Verified locally end to end (Barton Roofing).
- Heavy jobs (audit, build) run as Render one-off jobs on plan-srv-008 (larger, billed per second); Starter (512 MB) runs out of memory with Chromium. Live run 2026-11-18: 36 audited, 4 qualified, 6 unreachable; Barton Roofing preview + opt-in page live with 3 evidenced findings.
- `niche-refresh` moves not-yet-contacted prospects onto the latest niche config (fixes new audit checks being ignored for older records).
- Branded system pages (checkout success with business summary + next steps, canceled with link back to preview, already purchased, not found, error) live 2026-11-18. Purchases open an onboarding exception for the owner until onboarding is automated.
- Render auto-deploy on push is not firing (autoDeploy=yes); deploys are triggered via the Render API after pushes.
- Main domain rooflinewebsites.com (Cloudflare registrar; DNS via API token scoped to this zone). Root and www CNAME (DNS-only) to Render; both verified; HTTPS live. APP_BASE_URL and Stripe webhook URL switched to https://rooflinewebsites.com (2026-11-18).
- Postgres `roofline-db` (basic_256mb, 15 GB disk). Web service `roofline` (Docker, Playwright image, Starter $7/mo) at https://roofline-56l1.onrender.com, auto-deploys from branch claude/nice-newton-8sjsb5. Health check passing; migrations run on start.
- One-off jobs via Render Jobs API work (pipeline commands run on Render, not in a chat session).
- Stripe sandbox webhook endpoint created to /stripe/webhook; signing secret stored only as a Render env var.
- GOOGLE_PLACES_KEY and STRIPE_SECRET_KEY (sandbox) set on Render by owner.
- Verified live 2026-11-18: Render jobs ran discover (Spokane: 42 stored), licenses, and build for First Rate Roofing (approved). Public preview serves with noindex, live Google reviews, license number, working map. /buy redirects to Stripe Checkout (sandbox). Stripe sandbox webhook delivered to production and accepted (pending_webhooks=0); test subscription/customer deleted afterwards.
- Not verified: completing Checkout through the browser UI (Stripe blocks automated form fill); a human test-card purchase is still needed.
- This sandbox cannot reach Render Postgres directly (HTTPS-only egress); all production data work runs as Render jobs.

Not yet: owner dashboard/auth, hosting, deployment, public webhook endpoint, live-mode Stripe.

## Connections
| Vendor | Status |
|---|---|
| GitHub repo | Connected |
| Cloud environment `roofline` | Created; allows Anthropic, Stripe, Twilio, Instantly, Google Places |
| Google Places | Live: test search returned real results 2026-11-18 (key stored as network secret, header X-Goog-Api-Key) |
| Stripe | Sandbox promo code ROOFLINETEST (100% off forever, max 10 uses, sandbox only) for owner testing. Sandbox connected and tested 2026-11-18. Live: waiting on WA trade name + Stripe activation; final check = single-use 100%-off code, then delete it |
| Twilio | Waiting on account; A2P registration needs DBA + address |
| Instantly + sending domains | Instantly Outreach Growth ($47/mo) by owner; API key in env (proxy). DFY order placed via API 2026-11-18 (owner-approved $50): tryrooflinesites.com + gorooflinesites.com, 4 Google mailboxes (micah@, micah.u@), sender Micah Ulland; $20/mo + $30/yr. Provisioning pending; warm-up to enable via API once accounts appear. |
| Anthropic (production key) | Needed once hosting is chosen |

No integration has been live-tested. Nothing has been sent or charged.
