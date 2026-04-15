---
# opilot-hz24
title: 006 Make journalctl invocation more robust to environment differences
status: completed
type: task
priority: low
created_at: 2026-04-14T21:38:28Z
updated_at: 2026-04-14T23:55:00Z
parent: opilot-yva4
id: opilot-hz24
---

Source issue 006 from `docs/plans/remediation-plan.md`.

## Summary

The current `journalctl` execution path assumes command availability via PATH, which may fail silently or confusingly on systems with different environments.

## Files

- `src/sidebar.ts`

## Remediation Goal

Detect command availability more explicitly and fail gracefully when the expected logging tools are unavailable.

## Todo

- [x] Review how `journalctl` is located and invoked today
- [x] Add explicit availability detection or fallback behavior before execution
- [x] Improve user-facing diagnostics when the command is unavailable
- [x] Add or update tests for supported and unsupported environments
- [x] Verify Linux log streaming still works normally when the command exists

## Summary of Changes

Improved Linux log-read robustness in `src/sidebar.ts`:

- Added `readLinuxJournalctlLogs()` helper using non-shell execution with explicit args.
- Detects missing `journalctl` (`ENOENT`) and returns `null` instead of throwing.
- `extractModelPidFromLogs()` now logs a clear warning and exits gracefully when `journalctl` is unavailable.

Added tests in `src/sidebar.test.ts` for:

- successful `journalctl` log read path
- missing-command (`ENOENT`) fallback path

Validation run:

- `pnpm vitest run src/sidebar.test.ts`
- `pnpm run compile`
