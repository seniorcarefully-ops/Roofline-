# Roofline agent rules

Master plan: `docs/PLAN.md` (living source of truth). Build status: `STATUS.md`.

- The initial cold email in `src/outreach/template.ts` is LOCKED. Never change its wording without Micah's explicit approval.
- No email may claim a site exists unless `checkInitialEmailGate` passes (approved, reviewed preview).
- Consent, suppression, billing amounts, state transitions and retries are deterministic code. Models never decide them.
- Never invent audit findings, reviews, credentials, results or availability. Missing data is "unknown".
- Never simulate a send, charge, consent, or live integration. Report status honestly in `STATUS.md`.
- Secrets go through the environment's credential store, never source, logs, or chat.
- Outreach starts paused (`settings.outreach_paused = true`); only the owner unpauses.
- Run `npm test` and `npm run check` before committing.
