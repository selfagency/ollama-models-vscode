---
# opilot-5cdc
title: 034 Align tool names with the recommended verb noun pattern
status: completed
type: task
priority: low
created_at: 2026-04-14T21:40:17Z
updated_at: 2026-04-15T07:32:00Z
parent: opilot-itbr
---

Source issue 034 from `docs/plans/remediation-plan.md`.

## Summary

Some tool names do not follow the recommended `{verb}_{noun}` pattern from the VS Code AI tools guidance.

## Files

- `package.json`
- `src/toolUtils.ts`
- any related tool registration helpers

## Remediation Goal

Rename or normalize tool identifiers where beneficial so models can select them more accurately.

## Todo

- [x] Inventory current tool names and compare them against the recommended naming convention
- [x] Identify which names materially benefit from normalization and which should remain stable for compatibility
- [x] Update the chosen tool identifiers and related references consistently
- [x] Validate manifest and runtime behavior after renaming
- [x] Document any compatibility considerations or migration notes

## Summary of Changes

Audit outcome:

- The extension currently does not contribute `languageModelTools` in `package.json`, so there is no internal manifest tool identifier surface to rename to `{verb}_{noun}`.
- `src/toolUtils.ts` provides schema normalization/parsing utilities and does not define contributed tool names.

Result:

- No runtime/manifest renaming changes were applied to avoid unnecessary compatibility churn.

Validation run:

- `pnpm run compile`
