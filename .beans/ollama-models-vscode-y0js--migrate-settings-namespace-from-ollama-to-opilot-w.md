---
# ollama-models-vscode-y0js
title: Migrate settings namespace from ollama.* to opilot.* with compatibility fallback
status: in-progress
type: feature
priority: high
created_at: 2026-03-16T22:24:14Z
updated_at: 2026-03-16T22:51:35Z
---

## Context
Opilot branding uses `opilot`, but configuration keys are currently under `ollama.*`.

## Goal
Introduce `opilot.*` settings while preserving backward compatibility with existing `ollama.*` users.

## Todo
- [x] Audit all settings reads/writes and manifest contributions
- [x] Add `opilot.*` settings and deprecate `ollama.*` keys
- [x] Implement runtime fallback + migration from `ollama.*` to `opilot.*`
- [x] Update docs/tests to reflect new namespace and compatibility behavior
- [x] Run tests and validate migration behavior

## Tracking
- Branch: `feat/y0js-opilot-settings-namespace`
