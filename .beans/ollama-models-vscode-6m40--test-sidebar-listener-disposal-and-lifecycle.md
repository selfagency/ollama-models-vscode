---
# ollama-models-vscode-6m40
title: Test sidebar listener disposal and lifecycle
status: todo
type: task
priority: normal
created_at: 2026-03-08T16:40:16Z
updated_at: 2026-03-08T16:40:16Z
---

Add unit tests confirming that disposables registered by sidebar event listeners are properly cleaned up when their parent tree-view or context is disposed.

## Context

`src/sidebar.ts` registers several `onDidChangeX` listeners (e.g., workspace folder changes, configuration changes, Ollama events) and pushes disposables to `context.subscriptions`. There are currently no tests verifying that all listeners are unregistered on deactivation, which could cause memory leaks or stale callbacks in tests.

## Todo

- [ ] Identify all event listener registrations in `src/sidebar.ts`
- [ ] Add tests in `src/sidebar.test.ts` verifying dispose is called on each subscription
- [ ] Verify debounce timer (`refreshDebounceTimer`) is cleared on dispose
- [ ] Run `task unit-test-coverage` and confirm `src/sidebar.ts` coverage improves

## Files

- `src/sidebar.test.ts`
- `src/sidebar.ts` (reference only)
