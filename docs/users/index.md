---
title: User's Guide
---

## Overview

The Opilot extension brings the full Ollama model ecosystem into VS Code. After installation and a model pull, you can use local AI models in Copilot Chat, as inline code completions, and in a dedicated `@ollama` chat participant — all without leaving the editor.

## Sidebar Layout

The Ollama activity bar icon opens a sidebar with four panels:

- **Local Models** — Models downloaded to your machine. Shows running state, VRAM usage, and capability badges.
- **Cloud Models** — Models streamed from Ollama Cloud (requires `ollama login`).
- **Library** — The full [ollama.ai/library](https://ollama.ai/library) catalog for browsing and pulling.
- **Modelfiles** — Your custom `.modelfile` files for building personalized models.

Each panel has toolbar icons for filtering, grouping, collapsing, and refreshing. See [Sidebar & Model Management](./sidebar) for the full panel reference.

## Copilot Chat Integration

### Model Picker

Open Copilot Chat and click the model selector dropdown. All locally installed Ollama models appear under a **🦙 Ollama** group. Select one to use it for the current conversation — no `@ollama` needed.

### `@ollama` Chat Participant

Type `@ollama` at the start of any message to use the dedicated Ollama chat participant, which uses the currently-selected default model. The participant is sticky once activated in a thread.

```text
@ollama refactor this function to use async/await
```

See [@ollama Chat Participant](./chat-participant) for all the details.

## Tool Calling

Compatible models (those flagged with the 🛠 tools badge) can invoke VS Code tools, MCP servers, and custom skills during a conversation:

```text
@ollama what files in this project have the most test coverage gaps?
```

Tool calling follows the VS Code Language Model API tool loop: the model emits tool call requests, VS Code invokes the tool, and the result is fed back for the next response turn. If a model rejects tool schemas, the extension automatically retries the request without tools.

## Vision

Models with the 👁 vision badge accept image attachments in Copilot Chat. Drag an image into the chat input or paste from clipboard. Images are automatically stripped for non-vision models to avoid prompt overflow.

## Thinking Models

Models like DeepSeek-R1, Qwen QwQ, and Kimi that expose chain-of-thought reasoning display responses in two collapsible sections:

- **Thinking** — the model's internal reasoning steps
- **Response** — the final answer

The extension detects thinking models by model ID pattern and automatically applies the split-view format.

## Privacy & Security

- Local model conversations are processed entirely on your machine.
- No usage data, telemetry, or conversation content is collected.
- Auth tokens for remote instances are stored in VS Code's encrypted secrets API.
- The extension communicates only with `ollama.host` (default: `http://localhost:11434`).
