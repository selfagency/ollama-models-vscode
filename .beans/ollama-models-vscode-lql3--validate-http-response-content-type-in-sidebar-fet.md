---
# ollama-models-vscode-lql3
title: Validate HTTP response Content-Type in sidebar fetch calls
status: todo
type: task
priority: normal
created_at: 2026-03-08T16:40:40Z
updated_at: 2026-03-08T16:40:40Z
---

Harden the four `fetch()` call sites in `src/sidebar.ts` against malformed or unexpected server responses by validating the `Content-Type` header before attempting JSON parsing.

## Context

`src/sidebar.ts` calls `fetch(...)` at four places (approx. lines 353, 1511, 1633, 1893). All check `response.ok` but none validate the response `Content-Type`. If the Ollama server (or a proxy) returns HTML error pages or plain-text responses, `response.json()` silently throws a `SyntaxError` that is caught at a distance, making debugging difficult.

## Todo

- [ ] Review each of the four `fetch` call sites in `src/sidebar.ts`
- [ ] Add `Content-Type` validation: confirm response is `application/json` before calling `.json()`
- [ ] Throw or handle an informative error when the content-type is unexpected (e.g., `reportError(...)`)
- [ ] Add/extend tests in `src/sidebar.test.ts` covering unexpected content-type responses
- [ ] Run `task unit-tests` to verify no regressions

## Files

- `src/sidebar.ts` (lines ~353, ~1511, ~1633, ~1893)
- `src/sidebar.test.ts`
