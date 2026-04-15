---
# opilot-bcub
title: 020 Clean up legacy settings after successful migration
status: completed
type: task
priority: normal
created_at: 2026-04-14T21:39:09Z
updated_at: 2026-04-15T01:09:00Z
parent: opilot-dfc1
---

Source issue 020 from `docs/plans/remediation-plan.md`.

## Summary

Legacy settings remain after migration, which can keep the configuration surface messy and harder to reason about.

## Files

- `src/settings.ts`

## Remediation Goal

Remove or retire legacy settings at the right time without surprising existing users or breaking migration safety.

## Todo

- [x] Review the current migration flow and confirm when cleanup is safe
- [x] Define the conditions that prove a user has migrated successfully
- [x] Implement legacy cleanup with clear safeguards against accidental data loss
- [x] Add tests for first-run, migrated-user, and partially migrated scenarios
- [x] Verify settings behavior remains stable across extension upgrades

## Summary of Changes

- Updated `migrateLegacySettings` in `src/settings.ts` to clear legacy `ollama.*` values only when the corresponding value was successfully migrated to `opilot.*` at that same scope (global/workspace/workspaceFolder).
- Preserved safeguards: legacy values are not removed where `opilot.*` already had explicit values (no migration needed).
- Added tests in `src/settings.test.ts` for:
  - migrated scopes being cleaned up
  - non-migrated explicit-opilot scopes retaining legacy values

Validation run:

- `pnpm vitest run src/settings.test.ts src/contributes.test.ts`
- `pnpm run compile`
