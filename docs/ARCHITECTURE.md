# Ollama for Copilot — Architecture Overview

This document gives a high-level overview of the extension architecture and key runtime flows.

Key components

- `src/extension.ts` — Extension entrypoint. Handles activation, configuration, log streaming, and the VS Code chat participant glue for the `@ollama` participant.
- `src/provider.ts` — Language Model provider implementation. Responsible for the provider-based LM API path: handling generate/chat requests, tool invocation, model capability tracking, and vision/tool guards.
- `src/sidebar.ts` — Sidebar UI and model lifecycle management (list, pull, run, stop, delete). Implements tree data providers and commands used by the UI.
- `src/modelfiles.ts` — Modelfile parsing and the Modelfiles tree; handles building models from Modelfiles.
- `src/formatting.ts` — Helper utilities to safely filter XML-like system context tags from streamed model output.
- `src/diagnostics.ts` — Centralized Diagnostics logger abstraction used across the extension.

Flows

- Activation: `activate()` in `extension.ts` creates the diagnostics logger, obtains an Ollama client, registers the LM provider and chat participant, and wires the sidebar and modelfile managers.
- Chat request (direct Ollama client path): `handleChatRequest()` in `extension.ts` converts VS Code chat history to Ollama messages, extracts leading XML context blocks and prepends them as a system message, optionally runs the VS Code tool invocation loop, and then streams responses through the Ollama client while filtering XML context tags.
- Chat request (provider path): `provider.ts` implements the LM provider path used when the VS Code LM API is used to query models provided by this extension.
- Sidebar & model lifecycle: `sidebar.ts` fetches local and library model lists, groups them into families, and exposes commands to the user to pull, run, stop, and delete models. Model capability detection (thinking, tools, vision, embedding) is cached per model.

Error handling and diagnostics

- Use `createDiagnosticsLogger()` from `src/diagnostics.ts` for structured logging to the VS Code output channel.
- Use `src/errorHandler.ts::reportError()` for standardized logging and optional user-visible error dialogs. This ensures stack traces are logged while user-visible messages remain concise.

Notes and conventions

- XML-like context tags are only extracted from the leading portion of user messages and are deduplicated by tag name (latest occurrence wins) to avoid elevating arbitrary user text to system message scope.
- Tool invocation uses the VS Code LM tools API when available and is guarded by model capabilities and error detection (e.g., models that reject tools will have tools disabled for the request).
- Platform-specific behavior (log path, streaming) is centralized in `extension.ts` and must be used consistently.

Where to look next

- `src/formatting.ts` — tests for incomplete XML tags across chunk boundaries are important to keep streaming robust.
- `src/provider.ts` — tool invocation and capability caching logic are central to provider correctness and should be covered by unit and integration tests.
