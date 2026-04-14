---
# opilot-5o5n
title: 005 Harden direct config file writes against races
status: completed
type: bug
priority: normal
created_at: 2026-04-14T21:38:28Z
updated_at: 2026-04-14T23:44:24Z
parent: opilot-yva4
id: opilot-5o5n
---

Source issue 005 from `docs/plans/remediation-plan.md`.

## Summary

`removeBuiltInOllamaFromChatLanguageModels` performs an unlocked read-modify-write cycle on VS Code configuration files, which risks lost updates under concurrent access.

## Files

- `src/extension.ts`

## Remediation Goal

Make the configuration update logic resilient to concurrent edits by adding safe retry or change-detection behavior.

## Todo

- [x] Review the current file-mutation flow and confirm where race windows exist
- [x] Choose a safe strategy such as compare-and-retry or API-based mutation where available
- [x] Implement the hardened write path with bounded retry behavior
- [x] Add tests that cover unchanged and concurrently changed file scenarios
- [x] Verify the function preserves user configuration while removing only the intended entries

## Summary of Changes

Hardened `removeBuiltInOllamaFromChatLanguageModels` in `src/extension.ts` with bounded compare-and-retry logic:

- Added `MAX_WRITE_RETRIES` (3 attempts)
- Before writing filtered content, re-reads file and retries if the source changed between read and write
- Preserves existing behavior when no Ollama entries exist or files are unavailable

Added coverage in `src/extension.test.ts` for a concurrent-change scenario during fallback file mutation.

Validation run:

- `pnpm vitest run src/extension.test.ts`
- `pnpm run compile`
