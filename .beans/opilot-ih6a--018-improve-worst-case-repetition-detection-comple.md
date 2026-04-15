---
# opilot-ih6a
title: 018 Improve worst-case repetition detection complexity
status: completed
type: task
priority: low
created_at: 2026-04-14T21:39:09Z
updated_at: 2026-04-15T08:20:00Z
parent: opilot-wn59
---

Source issue 018 from `docs/plans/remediation-plan.md`.

## Summary

Repetition detection in `src/contextUtils.ts` can degrade to O(n^2) behavior in the worst case.

## Files

- `src/contextUtils.ts`

## Remediation Goal

Use a more efficient approach for repetition detection while preserving current output quality.

## Todo

- [x] Profile or reason through the current repetition-detection logic and hot cases
- [x] Choose a clearer or more efficient algorithmic approach
- [x] Refactor the implementation with benchmarks or representative tests where sensible
- [x] Add regression coverage for edge cases and large inputs
- [x] Verify the output quality remains acceptable after the optimization

## Summary of Changes

- Replaced suffix repetition scan in `src/contextUtils.ts` with a rolling-hash based detection pass plus exact-string verification.
- This reduces worst-case detection work from repeated substring comparisons toward linear-time hashing over the active window.
- Added long-buffer regression coverage in `src/contextUtils.test.ts` to preserve output quality expectations.

Validation run:

- `pnpm vitest run src/contextUtils.test.ts`
- `pnpm run compile`
