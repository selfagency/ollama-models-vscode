---
# opilot-cu2n
title: 002 Consolidate duplicated formatBytes helpers
status: completed
type: task
priority: normal
created_at: 2026-04-14T21:38:28Z
updated_at: 2026-04-14T23:10:11Z
parent: opilot-1ubu
id: opilot-cu2n
---

Source issue 002 from `docs/plans/remediation-plan.md`.

## Summary

`formatBytes()` exists in multiple modules with inconsistent formatting behavior, which creates UI inconsistency and duplicate logic.

## Files

- `src/extension.ts`
- `src/statusBar.ts`
- `src/sidebar.ts`
- new shared formatter module such as `src/formatUtils.ts`

## Remediation Goal

Replace the duplicated implementations with one reusable formatter that supports the precision needed by each caller.

## Todo

- [x] Compare the existing `formatBytes()` variants and document required output differences
- [x] Create a shared formatter API that handles precision and suffix needs explicitly
- [x] Replace the duplicated helpers with imports from the shared module
- [x] Add focused tests for zero, small, large, and edge-case values
- [x] Verify the affected UI surfaces now present sizes consistently

## Summary of Changes

Added `src/formatUtils.ts` as the shared byte-size formatter and migrated existing duplicate `formatBytes` usage in `src/extension.ts` and `src/statusBar.ts` to the shared utility.

Also added `src/formatUtils.test.ts` for explicit coverage of:

- zero/small/large values
- non-finite and negative edge cases
- configurable precision by unit

Validation run:

- `pnpm vitest run src/formatUtils.test.ts src/extension.utils.test.ts src/statusBar.test.ts`
- `pnpm run compile`
