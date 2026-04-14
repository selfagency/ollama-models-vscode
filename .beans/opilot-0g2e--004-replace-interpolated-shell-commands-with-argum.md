---
# opilot-0g2e
title: 004 Replace interpolated shell commands with argument arrays
status: completed
type: bug
priority: normal
created_at: 2026-04-14T21:38:28Z
updated_at: 2026-04-14T23:33:44Z
parent: opilot-yva4
id: opilot-0g2e
---

Source issue 004 from `docs/plans/remediation-plan.md`.

## Summary

`src/sidebar.ts` constructs process-kill commands with string interpolation. The current PID source is constrained, but the pattern is still fragile and avoidable.

## Files

- `src/sidebar.ts`

## Remediation Goal

Use non-shell execution with explicit argument arrays so process identifiers are never interpreted as shell syntax.

## Todo

- [x] Locate all shell-command construction paths related to force-kill behavior
- [x] Replace interpolated command strings with safe process execution APIs and argument arrays
- [x] Ensure Windows and Unix implementations both preserve current behavior
- [x] Add or update tests for the command construction and execution path
- [x] Verify no remaining process-control commands rely on shell interpolation

## Summary of Changes

Replaced interpolated force-kill shell strings in `src/sidebar.ts` with argument-array execution:

- Added `getForceKillCommand(pid, platform)` for explicit cross-platform command construction
- Switched process kill execution to `execFile` (via promisified `execFileAsync`) for non-shell invocation

Added test coverage in `src/sidebar.test.ts` for Windows and Unix command construction.

Validation run:

- `pnpm vitest run src/sidebar.test.ts`
- `pnpm run compile`
