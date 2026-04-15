---
# opilot-2kl7
title: 014 Remove the as never escape hatch
status: completed
type: task
priority: low
created_at: 2026-04-14T21:39:09Z
updated_at: 2026-04-15T07:50:00Z
parent: opilot-qi3q
---

Source issue 014 from `docs/plans/remediation-plan.md`.

## Summary

An `as never` cast is suppressing type checking, which hides a mismatch rather than solving it.

## Files

- `src/extension.ts`

## Remediation Goal

Model the actual type relationship correctly so the compiler can validate the code without forced impossibilities.

## Todo

- [x] Locate the `as never` cast and document what type mismatch it is masking
- [x] Refactor the surrounding types or control flow to remove the cast
- [x] Add or update tests if the fix changes behavior-sensitive code paths
- [x] Confirm the compiler now enforces the intended type guarantees
- [x] Verify no new escape-hatch casts were introduced nearby

## Summary of Changes

- Removed the production `as never` escape hatch from `src/extension.ts` in the native tool-loop path.
- Introduced an explicit local `OllamaToolResultMessage` type and typed `ollamaMessages` as `Array<Message | OllamaToolResultMessage>` so tool-result pushes are type-safe without impossible casts.

Validation run:

- `pnpm vitest run src/extension.test.ts`
- `pnpm run compile`
