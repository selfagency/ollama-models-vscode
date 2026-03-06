---
# ollama-models-vscode-4vps
title: Inline code completion provider with configurable model
status: todo
type: feature
priority: medium
created_at: 2026-03-06T05:50:22Z
updated_at: 2026-03-06T05:50:22Z
id: ollama-models-vscode-4vps
---

## Summary

The extension currently provides a chat participant (`@ollama`) and a language model provider for Copilot chat, but has no inline code completion support. This feature would add:

1. **`InlineCompletionItemProvider`** — registers with `vscode.languages.registerInlineCompletionItemProvider` (or `*` for all languages), calls Ollama with the surrounding code context (prefix/suffix), and returns inline completions.
2. **Configuration setting** — `ollama.completionModel` (string) lets the user pick a different model for completions (e.g. a smaller/faster fill-in-the-middle model like `qwen2.5-coder:1.5b`) independently of the chat model.
3. **Enable/disable toggle** — `ollama.enableInlineCompletions` (boolean, default `true`) so users can turn it off without uninstalling.
4. **FIM (fill-in-the-middle) support** — use Ollama's `/api/generate` with `suffix` for models that support FIM (e.g. `deepseek-coder`, `qwen2.5-coder`); fall back to prefix-only for models that don't.

## Todo

- [ ] Add `ollama.completionModel` and `ollama.enableInlineCompletions` settings to `package.json` contributes
- [ ] Create `src/completions.ts` with `OllamaInlineCompletionProvider` class
- [ ] Write tests in `src/completions.test.ts` (TDD first)
- [ ] Register provider in `src/extension.ts` `activate()`
- [ ] Document in README
