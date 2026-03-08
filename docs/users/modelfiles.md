---
title: Modelfile Manager
---

The Modelfile Manager allows you to create, edit, and build custom Ollama models using [Ollama Modelfiles](https://github.com/ollama/ollama/blob/main/docs/modelfile.md) — without leaving VS Code.

## What Is a Modelfile?

A Modelfile is a text file that defines a custom Ollama model variant. It specifies:

- **Base model** (`FROM`) — which model to build on top of
- **System prompt** (`SYSTEM`) — default behavior, persona, or instructions
- **Inference parameters** (`PARAMETER`) — temperature, context length, sampling settings
- **Chat template** (`TEMPLATE`) — custom prompt structure (advanced)
- **Training messages** (`MESSAGE`) — example conversations for few-shot prompting
- **Adapters** (`ADAPTER`) — LoRA adapter paths (advanced)

```modelfile
# Modelfile — code-reviewer
FROM qwen2.5-coder:7b

SYSTEM """You are an expert code reviewer. Focus on:
- Security vulnerabilities (OWASP Top 10)
- Performance bottlenecks
- Readability and maintainability
Always provide specific, actionable feedback."""

PARAMETER temperature 0.3
PARAMETER num_ctx 8192
```

## Opening the Modelfile Manager

Click the 🦙 Ollama icon in the activity bar, then open the **Modelfiles** panel at the bottom of the sidebar.

## Creating a New Modelfile

Click the **+** (New Modelfile) button in the panel header. An interactive wizard prompts you for:

1. **Name** — the name for the custom model (e.g., `pirate-bot`, `strict-reviewer`)
2. **Base model** — pick from your locally installed Ollama models
3. **System prompt** — describe the persona or task

The wizard creates a `.modelfile` file at your configured modelfiles path (default: `~/.ollama/modelfiles/<name>.modelfile`), pre-populates it with the chosen settings, and opens it in the editor.

## Editing a Modelfile

Click the **Edit** (✏) button next to any modelfile in the panel, or open the file directly. The editor provides:

- **Syntax highlighting** for Modelfile keywords and parameter names
- **Hover documentation** — hover over `FROM`, `PARAMETER temperature`, etc. to see inline docs
- **Autocomplete** — `Ctrl+Space` / `Cmd+Space` suggests Modelfile keywords and common parameter names

## Building a Model from a Modelfile

After editing a Modelfile, build it into a runnable Ollama model:

1. Right-click the modelfile in the panel → **Build Model from Modelfile**
2. Or open Command Palette → **"Ollama: Build Model from Modelfile"**

A streaming VS Code notification shows the build progress from `ollama create`. The built model appears in the **Local Models** panel immediately after a successful build.

## Modelfile Syntax Reference

### `FROM <model>`

Specifies the base model. Required.

```modelfile
FROM llama3.2:3b
FROM qwen2.5-coder:7b
```

### `SYSTEM <prompt>`

Sets the system message injected at the beginning of every conversation.

```modelfile
SYSTEM "You are a helpful assistant."

# Multi-line (triple-quoted):
SYSTEM """
You are an expert TypeScript developer.
You always write clean, type-safe code.
You prefer functional patterns over mutable state.
"""
```

### `PARAMETER <name> <value>`

Overrides model inference defaults. Common parameters:

| Parameter        | Type   | Description                                  |
| ---------------- | ------ | -------------------------------------------- |
| `temperature`    | float  | Randomness (0 = deterministic, 1 = creative) |
| `num_ctx`        | int    | Context window size in tokens                |
| `top_p`          | float  | Nucleus sampling threshold                   |
| `top_k`          | int    | Top-k sampling                               |
| `repeat_penalty` | float  | Penalty for repeating tokens                 |
| `num_predict`    | int    | Max tokens to generate (-1 = unlimited)      |
| `stop`           | string | Stop sequence string                         |

```modelfile
PARAMETER temperature 0.2
PARAMETER num_ctx 16384
PARAMETER stop "<|im_end|>"
```

### `MESSAGE <role> <content>`

Adds example conversation turns for few-shot prompting.

```modelfile
MESSAGE user "What is 2+2?"
MESSAGE assistant "4."
```

### `TEMPLATE <template>`

Custom Go template for prompt formatting (advanced — only needed for unusual model architectures).

### `ADAPTER <path>`

Path to a LoRA adapter to apply on top of the base model.

### `LICENSE <text>`

License text for the custom model.

## Modelfiles Storage Location

By default, modelfiles are stored in `~/.ollama/modelfiles/`. Change this with the `ollama.modelfilesPath` setting.

Use the **Open Modelfiles Folder** (📁) button in the panel header to reveal the folder in your OS file manager.

## External Reference

Full Modelfile specification: [github.com/ollama/ollama/blob/main/docs/modelfile.md](https://github.com/ollama/ollama/blob/main/docs/modelfile.md)
