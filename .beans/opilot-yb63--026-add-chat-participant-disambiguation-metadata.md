---
# opilot-yb63
title: 026 Add chat participant disambiguation metadata
status: completed
type: task
priority: low
created_at: 2026-04-14T21:39:33Z
updated_at: 2026-04-15T00:55:00Z
parent: opilot-9ycj
---

Source issue 026 from `docs/plans/remediation-plan.md`.

## Summary

The `@ollama` chat participant lacks disambiguation configuration, which limits VS Code's ability to auto-route relevant prompts.

## Files

- `package.json`
- any participant registration helpers if needed

## Remediation Goal

Improve participant discoverability and routing by adding a useful category, description, and examples.

## Todo

- [x] Review the current chat participant contribution in `package.json`
- [x] Draft disambiguation metadata that accurately reflects the participant's strengths
- [x] Add examples that help VS Code route the right requests automatically
- [x] Verify the wording is specific enough to avoid over-routing unrelated prompts
- [x] Validate the manifest contribution and resulting participant behavior

## Summary of Changes

- Added `disambiguation` metadata to the `opilot.ollama` chat participant contribution in `package.json`.
- Included a focused category, routing description, and concrete examples for Ollama-specific prompt routing.

Validation run:

- `pnpm vitest run src/contributes.test.ts`
- `pnpm run compile`
