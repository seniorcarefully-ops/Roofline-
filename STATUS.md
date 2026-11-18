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
- Finding: with only objective checks, few established roofers have 3 problems. Targeting/checks need a decision (see owner questions).

Not yet: owner dashboard/auth, hosting, deployment, public webhook endpoint, live-mode Stripe.

## Connections
| Vendor | Status |
|---|---|
| GitHub repo | Connected |
| Cloud environment `roofline` | Created; allows Anthropic, Stripe, Twilio, Instantly, Google Places |
| Google Places | Live: test search returned real results 2026-11-18 (key stored as network secret, header X-Goog-Api-Key) |
| Stripe | Sandbox connected and tested 2026-11-18. Live: waiting on WA trade name + Stripe activation; final check = single-use 100%-off code, then delete it |
| Twilio | Waiting on account; A2P registration needs DBA + address |
| Instantly + sending domains | Waiting on account/domains |
| Anthropic (production key) | Needed once hosting is chosen |

No integration has been live-tested. Nothing has been sent or charged.
