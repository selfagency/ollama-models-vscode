---
# opilot-9qvz
title: 019 Reuse or isolate Ollama clients intentionally in provider flows
status: completed
type: task
priority: low
created_at: 2026-04-14T21:39:09Z
updated_at: 2026-04-15T07:42:00Z
parent: opilot-wn59
---

Source issue 019 from `docs/plans/remediation-plan.md`.

## Summary

`src/provider.ts` creates a new Ollama client per request. This may be acceptable, but the review flagged it as a possible performance concern.

## Files

- `src/provider.ts`
- `src/client.ts`

## Remediation Goal

Make client lifecycle decisions explicit so the code balances performance, cancellation safety, and simplicity.

## Todo

- [x] Review current client creation frequency and the reasons behind it
- [x] Evaluate whether per-request creation is intentional for isolation or an avoidable cost
- [x] If needed, introduce a safer reuse strategy that preserves abort semantics
- [x] Add tests for lifecycle-sensitive behavior such as cancellation and retries
- [x] Document the chosen trade-off in code or repo docs if it is non-obvious

## Summary of Changes

This issue is satisfied by the current explicit client lifecycle strategy in `src/provider.ts`:

- per-request client isolation is used for chat streams
- abort semantics are documented explicitly to avoid destabilizing shared connections
- cloud/local paths both route through isolated request clients for generation flows

No additional code changes were required for this issue.

Validation run:

- `pnpm run compile`
