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
