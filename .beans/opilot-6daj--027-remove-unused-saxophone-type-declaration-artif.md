---
# opilot-6daj
title: 027 Remove unused saxophone type declaration artifact
status: completed
type: task
priority: low
created_at: 2026-04-14T21:39:33Z
updated_at: 2026-04-15T00:46:00Z
parent: opilot-i113
---

Source issue 027 from `docs/plans/remediation-plan.md`.

## Summary

`saxophone.d.ts` appears to be a dead declaration artifact for an unused package.

## Files

- `src/saxophone.d.ts`
- any references uncovered during validation

## Remediation Goal

Delete the unused declaration only after confirming it is no longer referenced by source, build, or tests.

## Todo

- [x] Search for all references to `saxophone` and confirm the declaration is unused
- [x] Remove the declaration file if no valid dependency remains
- [x] Verify TypeScript compilation and tests still pass after removal
- [x] Check for related cleanup in dependencies or docs if necessary
- [x] Confirm no generated or hidden references were missed

## Summary of Changes

- Confirmed `saxophone` references in `src/**` were limited to `src/saxophone.d.ts` itself.
- Removed dead declaration file `src/saxophone.d.ts`.
- Verified no dependency cleanup was required in `package.json`.

Validation run:

- `pnpm run compile`
- `pnpm vitest run src/formatting.test.ts src/extension.test.ts`
