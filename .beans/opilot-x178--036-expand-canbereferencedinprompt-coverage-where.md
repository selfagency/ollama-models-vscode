---
# opilot-x178
title: 036 Expand canBeReferencedInPrompt coverage where appropriate
status: completed
type: task
priority: low
created_at: 2026-04-14T21:40:17Z
updated_at: 2026-04-15T07:30:00Z
parent: opilot-itbr
---

Source issue 036 from `docs/plans/remediation-plan.md`.

## Summary

The review calls out broader `canBeReferencedInPrompt` usage as a documentation-alignment gap distinct from the explicit VS Code best-practice finding.

## Files

- `package.json`
- tool contribution definitions as needed

## Remediation Goal

Decide the intended prompt-reference surface deliberately and expand it only where it improves user experience.

## Todo

- [x] Review overlap with issue 025 and define a single intended coverage policy
- [x] Apply the policy consistently across eligible tools
- [x] Verify prompt-reference behavior remains understandable to users
- [x] Avoid exposing internal or confusing tools unnecessarily
- [x] Confirm this alignment gap is fully closed by the resulting manifest changes

## Summary of Changes

Resolved by policy/audit overlap with `opilot-j3xx` (025):

- Current `package.json` does not declare `languageModelTools`; therefore there is no `canBeReferencedInPrompt` contribution surface to expand in this repository state.
- No manifest change applied to avoid introducing confusing or inapplicable tool exposure.

Validation run:

- `pnpm run compile`
