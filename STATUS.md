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

Not yet: owner dashboard/auth, hosting, deployment.

## Connections
| Vendor | Status |
|---|---|
| GitHub repo | Connected |
| Cloud environment `roofline` | Created; allows Anthropic, Stripe, Twilio, Instantly, Google Places |
| Google Places | Waiting on account + key |
| Stripe | Waiting on account (existing entity + Roofline DBA) |
| Twilio | Waiting on account; A2P registration needs DBA + address |
| Instantly + sending domains | Waiting on account/domains |
| Anthropic (production key) | Needed once hosting is chosen |

No integration has been live-tested. Nothing has been sent or charged.
