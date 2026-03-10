---
title: Inline Code Completions
---

The extension can provide real-time inline code completions powered by a locally running Ollama model as you type.

## Enabling Completions

1. Open Settings (`Cmd+,` / `Ctrl+,`) and search for `ollama.completionModel`
2. Enter the name of a locally installed model (e.g., `qwen2.5-coder:1.5b`)
3. Ensure `ollama.enableInlineCompletions` is set to `true`

Completions will appear as grey ghost text in the editor. Press `Tab` to accept, `Escape` to dismiss.

## Recommended Models

Smaller, faster models work best for completions — they respond quickly enough to be non-intrusive:

| Model                 | Size  | Notes                               |
| --------------------- | ----- | ----------------------------------- |
| `qwen2.5-coder:1.5b`  | ~1 GB | Excellent code quality for its size |
| `qwen2.5-coder:3b`    | ~2 GB | Good balance of speed and quality   |
| `deepseek-coder:1.3b` | ~1 GB | Fast, solid for common patterns     |
| `starcoder2:3b`       | ~2 GB | Broad language support              |

Larger models (7B+) can be used but may introduce noticeable latency between keystrokes.

## Fill-in-the-Middle (FIM)

When a model supports FIM (fill-in-the-middle), the extension passes both the text _before_ and _after_ the cursor, giving the model bidirectional context. This produces much better multi-line completions.

All of the recommended models above support FIM.

## Disabling Completions

Toggle `ollama.enableInlineCompletions` to `false` in Settings at any time. You can also disable it temporarily via the status bar language selector menu.

## Troubleshooting

**No completions appearing**

- Verify `ollama.completionModel` is set to a model that is installed locally
- Verify Ollama is running (`curl http://localhost:11434`)
- Check the **Ollama output channel** (`Ctrl+Shift+U` then select "Opilot") for errors

**Completions are slow**

- Switch to a smaller quantized model (1–3 B parameters)
- Verify no other processes are competing for GPU/RAM
- Consider switching to a smaller quantized model (1–3 B parameters) to reduce the model's working context
