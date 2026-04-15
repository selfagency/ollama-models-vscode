---
# opilot-j3xx
title: 025 Enable canBeReferencedInPrompt for applicable tools
status: completed
type: task
priority: low
created_at: 2026-04-14T21:39:33Z
updated_at: 2026-04-15T00:53:00Z
parent: opilot-9ycj
---

Source issue 025 from `docs/plans/remediation-plan.md`.

## Summary

Not all tools that should be directly referenceable expose `canBeReferencedInPrompt`, reducing discoverability in chat.

## Files

- `package.json`
- any supporting tool contribution helpers

## Remediation Goal

Enable prompt references on the right tools while avoiding noisy or misleading exposure for inappropriate ones.

## Todo

- [x] Audit current tool contributions and identify which ones should support `#tool` references
- [x] Update the applicable manifest entries consistently
- [x] Verify tool descriptions still make sense when exposed directly in prompts
- [x] Confirm no unsuitable tools are exposed accidentally
- [x] Validate the extension manifest remains well-formed after the update

## Summary of Changes

Audit result:

- `package.json` currently does not declare any `languageModelTools` contributions.
- There are therefore no manifest tool entries where `canBeReferencedInPrompt` could be applied in this repository state.

Outcome:

- No code or manifest changes were required for this issue at this time.
- This bean is closed as satisfied-by-audit, with no accidental tool exposure introduced.
