---
# opilot-8j4e
title: 042 Make abort semantics and client isolation explicit
status: completed
type: task
priority: low
created_at: 2026-04-14T21:40:18Z
updated_at: 2026-04-15T07:43:00Z
parent: opilot-itbr
---

Source issue 042 from `docs/plans/remediation-plan.md`.

## Summary

The Ollama SDK abort model can affect all streams on a client instance, so client isolation strategy should be explicit.

## Files

- `src/provider.ts`
- `src/client.ts`

## Remediation Goal

Choose and document a client lifecycle strategy that handles abort behavior safely and predictably.

## Todo

- [x] Review how client instances are currently created, shared, and aborted
- [x] Confirm the actual SDK abort semantics relevant to this extension
- [x] Decide whether per-request clients or another isolation strategy is the safest approach
- [x] Update implementation and tests if a lifecycle change is needed
- [x] Document the rationale so future maintainers do not reintroduce unsafe sharing

## Summary of Changes

This issue is satisfied by the explicit strategy already documented in `src/provider.ts`:

- per-request client isolation for generation streams
- explicit note to avoid `abort()` on cancellation to prevent destabilizing shared connections

No additional lifecycle code changes were required in this slice.

Validation run:

- `pnpm run compile`
