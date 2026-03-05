---
# ollama-models-vscode-wrze
title: 'Phase 4: Command Palette Commands'
status: todo
type: feature
priority: high
created_at: 2026-03-05T20:07:15Z
updated_at: 2026-03-05T20:07:25Z
---

Implement Phase 4: Command Palette Commands (Cmd+Shift+P) for the Ollama VS Code extension.

Commands to expose to users:

- `ollama-copilot.pullModel` — Pull / download a model by name
- `ollama-copilot.manageAuthToken` — Manage local Ollama auth token (already registered, needs palette title)
- `ollama-copilot.manageCloudApiKey` — Manage Ollama Cloud API key (already registered, needs palette title)
- `ollama-copilot.refreshSidebar` — Refresh all sidebar panes
- `ollama-copilot.sortLibraryByName` / `ollama-copilot.sortLibraryByRecency` — Toggle library sort

## Todo

- [ ] Audit `package.json` commands — ensure each palette-worthy command has a descriptive `title` and correct `category`
- [ ] Add `"category": "Ollama"` to all commands so they group under "Ollama:" in the palette
- [ ] Ensure `ollama-copilot.pullModel` triggers the pull input box (already implemented in sidebar.ts)
- [ ] Create `src/commands.ts` with any palette-only logic not already covered
- [ ] Register any missing commands in `extension.ts` `activate()`
- [ ] Add `contributes.test.ts` checks: every palette command has a `category` field
- [ ] Run all tests and verify they pass
