---
title: Command Reference
---

All Opilot commands are accessible via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`). Type **"Ollama"** to filter to extension commands. Most commands are also accessible through the sidebar panels and context menus.

## Authentication

### `Ollama: Manage Ollama Auth Token`

Opens a prompt to set a bearer token sent as `Authorization: Bearer <token>` with every Ollama API request.

Use this when your remote Ollama instance is behind an authentication proxy. Leave blank to clear the token.

## Model Lifecycle

### `Ollama: Start Ollama Model`

Starts (warms up) a local model so it is ready to respond without a cold-start delay. Also available via the **▶** button on a local model item.

### `Ollama: Stop Ollama Model`

Unloads a running model from memory to free VRAM/RAM. Also available via the **■** button on running model items.

### `Ollama: Pull Ollama Model`

Downloads a model from the Ollama library by name (e.g. `llama3.2:3b`). Opens a progress notification with live download progress. Available via the **↙** button in the panel header or the library context menu.

### `Ollama: Delete Ollama Model`

Permanently removes an installed model and its weights from disk. Prompts for confirmation. Available via the **🗑** context menu on a local model item.

## Model Parameters

### `Ollama: Open Model Settings`

Opens the per-model settings webview panel. Also available via the **⚙** toolbar button in the **Local Models** view.

Use it to tune model-specific generation options:

- Temperature
- Top-P
- Top-K
- Context window (`num_ctx`)
- Max tokens (`num_predict`)
- Thinking toggle (`think`)
- Thinking budget (`think_budget`)

Changes are applied immediately and persisted per model.

## Sidebar — Local Models

### `Ollama: Refresh Local Ollama Models`

Re-fetches the list of locally installed models from the Ollama API. Triggered automatically every `ollama.localModelRefreshInterval` seconds.

### `Ollama: Filter Local Models`

Opens an input box to filter the local models list by model name. The filter persists until cleared.

### `Ollama: Clear Local Models Filter`

Removes the active filter from the local models list.

### `Ollama: Show as Flat List` / `Show as Tree` (Local)

Toggles local model grouping between:

- **Flat list** — all models in alphabetical order
- **Tree view** — models grouped by model family (e.g. llama, qwen, mistral)

The current mode is reflected by the icon in the panel header.

### `Ollama: Collapse All Local Models`

Collapses all expanded model family groups in the local models panel (tree view only).

## Sidebar — Ollama Library

### `Ollama: Refresh Ollama Library`

Re-fetches the public model list from the Ollama Library API.

### `Ollama: Filter Library Models`

Opens an input box to filter the library model list by name or tag.

### `Ollama: Clear Library Models Filter`

Removes the active filter from the library list.

### `Ollama: Show as Flat List` / `Show as Tree` (Library)

Toggles library model view between flat list and family-grouped tree.

### `Ollama: Collapse All Library Models`

Collapses all expanded groups in the library panel.

### `Ollama: Pull Ollama Model` (from Library)

Downloads the selected library model tag to your local Ollama instance. Equivalent to `ollama pull <model>:<tag>` in the terminal.

### `Ollama: Open Ollama Model Page`

Opens the model's page on [ollama.com/library](https://ollama.com/library) in your browser.

## Sidebar — Ollama Cloud

### `Ollama: Login to Ollama Cloud`

Opens the Ollama Cloud authentication flow in your browser. Required to access private cloud models.

### `Ollama: Refresh Ollama Cloud Models`

Re-fetches your Ollama Cloud model catalog.

### `Ollama: Filter Cloud Models`

Opens an input box to filter the cloud models list.

### `Ollama: Clear Cloud Models Filter`

Removes the active filter from the cloud models list.

### `Ollama: Show as Flat List` / `Show as Tree` (Cloud)

Toggles cloud model view between flat list and grouped tree.

### `Ollama: Collapse All Cloud Models`

Collapses all expanded groups in the cloud panel.

### `Ollama: Run Ollama Cloud Model`

Starts the selected cloud model.

### `Ollama: Stop Ollama Cloud Model`

Stops the selected running cloud model.

### `Ollama: Open Ollama Cloud Model Page`

Opens the model's page on the Ollama Cloud web interface.

## Sidebar — Modelfiles

### `Ollama: New Modelfile`

Opens an interactive wizard to create a new Modelfile, then opens it in the editor. See [Modelfile Manager](./modelfiles) for details.

### `Ollama: Edit Modelfile`

Opens the selected Modelfile in the VS Code editor.

### `Ollama: Build Model from Modelfile`

Runs `ollama create` for the currently active or selected Modelfile. Progress is shown in a streaming VS Code notification.

### `Ollama: Open Modelfiles Folder`

Reveals the modelfiles directory (`ollama.modelfilesPath` or `~/.ollama/modelfiles`) in your OS file manager.

### `Ollama: Refresh Modelfiles`

Rescans the modelfiles directory and updates the panel.

## Diagnostics

### `Ollama: Check Server Health`

Runs an immediate connectivity check against the configured `ollama.host` and reports whether the server is reachable. The same check is available from the status bar heartbeat item.

### `Ollama: Dump Performance Snapshot`

Outputs a performance timing snapshot to the **Opilot** output channel. Useful when profiling response latency or troubleshooting provider initialization timing.

### `Ollama: Refresh Ollama Models`

Re-fetches all model lists (local + library + cloud) in one operation.
