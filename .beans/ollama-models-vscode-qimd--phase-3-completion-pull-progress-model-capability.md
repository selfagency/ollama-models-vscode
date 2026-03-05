---
# ollama-models-vscode-qimd
title: 'Phase 3 completion: pull progress & model capability badges'
status: in-progress
type: feature
priority: high
created_at: 2026-03-05T20:06:05Z
updated_at: 2026-03-05T20:06:37Z
---

Complete the remaining Phase 3 sidebar items: streaming pull progress indicator and model capability badges.

## Todo

- [ ] Extract shared `pullModelWithProgress` helper in sidebar.ts
- [ ] Update `handlePullModel` to use streaming progress
- [ ] Update `handlePullModelFromLibrary` to be async and show streaming progress
- [ ] Import `fetchModelCapabilities` in sidebar.ts and add async badge display
- [ ] Update `withProgress` mock in sidebar.test.ts to pass (progress, token)
- [ ] Update pull mock to return an async iterable
- [ ] Add tests for pull progress reporting and capability badges
- [ ] Run all tests and verify they pass
