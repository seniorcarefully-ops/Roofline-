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

## Daily automation (live)
- Render cron job roofline-daily (crn-dbvrq8mi0phs73aval20, Docker, Standard plan, 13:13 UTC daily): discover 6 new areas (240-area list: Washington first, then national), licenses, audit (v6 adds Google PageSpeed mobile score < 50 as a finding; 2 findings now qualify with the approved 2-finding email), find/guess/verify emails (published catch-all accepted, max 20% of queue), score, build+review previews, queue to the paused Instantly campaign. Live niche only.
- Cron and web service do not auto-deploy on push: redeploy both via the Render API after code changes.
- PageSpeed currently returns no score (shared quota exhausted): the server's Google key needs the PageSpeed Insights API enabled.
- First runs (Nov 19-20): Seattle-area run added 137+ roofers; 39 verified emails + 13 published catch-all; 3 prospects fully send-ready (blocked only by outreach paused).

## Multi-niche test: leak detection (draft, 2026-11-19)
- Niche config src/niches/leak_detection.ts (placeholder brand "Leak Detection Websites", no domain, approved prices), own wording (src/niches/words.ts) and photo library (27 Unsplash photos). Test site at /n/leak-detection (noindex). Roofing site unaffected; host-based routing ready for per-niche domains.
- Live run on Render: Spokane discovery 45 found / 36 stored; licenses 19 active, 5 inactive, 12 unmatched; audit 31 checked, 5 qualified. First preview built + approved: Tactical Plumbing & Piping (leak-detection wording, photos, opt-in page with 3 findings). No emails or campaign for this niche.
- Known gaps before a niche goes live: real brand name + domain, own sending domains/campaign, niche-specific Cole photo, preview-site accent color should follow brand color.

## Email finding (live)
- Own-site extraction (home/contact/about), ranking, Instantly verification (INSTANTLY_API_KEY on Render). Spokane run: 38 sites searched, 24 emails found; verification: 11 verified sendable (5 own-domain, 6 webmail), 8 catch-all (not sendable), 5 invalid (removed). Bug fixed: Instantly returns 'verified' (not 'valid') for good addresses.

## Outreach (live, paused)
- Main cold email = locked variant B (approved 2026-11-19; Instantly cannot attach per-lead files). Footer with PO box + one-click unsubscribe (/u/<token>, confirm-then-POST).
- Instantly campaign "Roofline Websites · roofing · main (B)" (id c1b1e8bf…), DRAFT: Cole mailboxes only, weekdays 8-5 Pacific (America/Boise 9-18), text-only, open+link tracking off, stop on reply/auto-reply, 40/day.
- queue-leads: only verified, fit>=60, gate-passing prospects; each lead carries its fully rendered email. Prospect marked contacted only on Instantly's email_sent event.
- Webhooks (reply_received, email_sent, email_bounced, lead_unsubscribed) -> /instantly/webhook with secret header (INSTANTLY_WEBHOOK_SECRET on Render); verified 401 without secret, 200 on Instantly test. Replies: fetch email, Cole's assistant decides, deterministic side effects (consent, unsubscribe, state, exceptions), reply sent via Instantly in-thread. Until texting is live, a prospect who gives their number gets the preview link by email.

## Compliance
- Email footer postal address: Roofline Websites, PO Box 2106, Woodinville, WA 98072 (owner's family business PO box, owner-approved 2026-11-19). Owner to confirm "Roofline Websites" is listed on the box's PS Form 1093. Send gate blocks email when no postal address is configured.

## Hosting (Render, workspace "Roofline", region Oregon)
- Audit + SMS opt-in page /s/<preview token> (the email link): personal hero, blurred phone mockup of the approved preview, up to 3 findings with evidence screenshots (stored in DB), cell + explicit consent checkbox; consent stored verbatim with source. Until Twilio is configured, the page shows the preview link immediately instead of promising a text. Verified locally end to end (Barton Roofing).
- Heavy jobs (audit, build) run as Render one-off jobs on plan-srv-008 (larger, billed per second); Starter (512 MB) runs out of memory with Chromium. Live run 2026-11-18: 36 audited, 4 qualified, 6 unreachable; Barton Roofing preview + opt-in page live with 3 evidenced findings.
- `niche-refresh` moves not-yet-contacted prospects onto the latest niche config (fixes new audit checks being ignored for older records).
- Brand site homepage (2026-11-19, owner-approved): outcome-first "Get more roofing clients" with three numbered steps (website $150, AI texting $200, Get More Calls $500), each with visual + how-it-works + price; illustrations labeled. Previous homepage archived at /v1 (noindex); /v2 redirects to /.
- Previous public brand site (now /v1): (light cloudy-grey theme; hero with live demo in browser+phone frames, offer + add-ons, Cole brand-legend story with photo slot /assets/cole.jpg, how it works, demo examples, free-preview request form with SMS consent), plus /privacy and /terms (SMS program terms for carrier registration) and /demo (fictional, labeled). Inbound requests stored in inbound_requests and raised as owner exceptions until automated.
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
| Twilio | Roofline subaccount created via API under owner's existing account (2026-11-18); subaccount-scoped API key stored only in Render env (TWILIO_ACCOUNT_SID/API_KEY/API_SECRET). Number (509) 390-8200 purchased with owner approval (2026-11-19). TWILIO_FROM_NUMBER intentionally NOT set until the SMS send/receive handlers exist. A2P 10DLC registration pending DBA. Owner's main-account admin key (roofline-admin) is still in the session environment; can be deleted by owner. |
| Instantly + sending domains | Instantly Outreach Growth ($47/mo) by owner; API key in env (proxy). DFY order placed via API 2026-11-18 (owner-approved $50): tryrooflinesites.com + gorooflinesites.com, 4 Google mailboxes (micah@, micah.u@), sender Micah Ulland; $20/mo + $30/yr. Original 4 micah@ mailboxes provisioned and warming 2026-11-19. Persona switch (owner-approved): 4 Cole Bennett mailboxes (cole@, cole.b@ on both domains) ordered 2026-11-19 ($20, $5/mo each). Cole mailboxes provisioned and warm-up enabled 2026-11-19 05:29 UTC (daily limit 30). Cancelling micah@ still refused by Instantly (no_delete_block) on second try; likely a minimum-term rule on new DFY mailboxes. Retry scheduled; owner may ask Instantly support. micah@ mailboxes must not be used for sending. |
| Anthropic (production key) | Needed once hosting is chosen |

No integration has been live-tested. Nothing has been sent or charged.
