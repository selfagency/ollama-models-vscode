---
# opilot-3tlg
title: 043 Parse and surface mid stream OpenAI compatible errors
status: completed
type: task
priority: low
created_at: 2026-04-14T21:40:18Z
updated_at: 2026-04-15T07:54:00Z
parent: opilot-itbr
---

Source issue 043 from `docs/plans/remediation-plan.md`.

## Summary

The OpenAI-compatible layer should detect NDJSON mid-stream error objects and surface them instead of treating them as ordinary output or opaque failures.

## Files

- `src/openaiCompat.ts`

## Remediation Goal

Recognize mid-stream error payloads explicitly and translate them into clear diagnostics or failure handling.

## Todo

- [x] Review the current stream parsing path for OpenAI-compatible responses
- [x] Identify how mid-stream error objects are represented and currently handled
- [x] Add explicit error detection and propagation for NDJSON error chunks
- [x] Add tests covering normal chunks, partial output, and mid-stream error payloads
- [x] Verify users receive clear error messages when the upstream stream reports failure

## Summary of Changes

- Added explicit mid-stream error payload detection in `src/openaiCompat.ts` for SSE chunk parsing (`error` objects in streamed payloads).
- Stream parsing now throws actionable errors instead of silently yielding opaque objects.
- Added regression tests in `src/openaiCompat.test.ts` for:
  - mid-stream error in `chatCompletionsStream`
  - mid-stream error in `initiateChatCompletionsStream`

Validation run:

- `pnpm vitest run src/openaiCompat.test.ts src/extension.test.ts`
- `pnpm run compile`
