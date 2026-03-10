---
title: Settings Reference
---

All settings are in the `ollama.*` namespace. Open them via:

- **File → Preferences → Settings** then search "Ollama"
- Or edit `settings.json` directly

## Connection

### `ollama.host`

| Type     | Default                    |
| -------- | -------------------------- |
| `string` | `"http://localhost:11434"` |

The URL of your Ollama server. Supports local and remote instances.

**Examples:**

```json
"ollama.host": "http://localhost:11434"
"ollama.host": "https://my-ollama-server.example.com"
"ollama.host": "http://192.168.1.50:11434"
```

For remote instances that require authentication, also set `ollama.authToken` (via the **Manage Ollama Auth Token** command — it is stored securely in the VS Code secret store, not in settings.json).

## Model Parameters

### Per-model model settings (webview)

In addition to global settings, Opilot now supports per-model generation controls through **Ollama: Open Model Settings**.

These overrides are persisted as JSON in the extension global storage directory:

- `<globalStorage>/model-settings.json`
- Schema: `Record<modelId, Partial<ModelOptions>>`

Supported per-model fields include:

- `temperature`
- `top_p`
- `top_k`
- `num_ctx`
- `num_predict`
- `think`
- `think_budget`

Use the webview for these values rather than editing the file directly.

## Sidebar Refresh Intervals

### `ollama.localModelRefreshInterval`

| Type     | Default |
| -------- | ------- |
| `number` | `30`    |

How often (in seconds) to auto-refresh the **local models** and **running models** lists. Decrease for faster status updates; increase to reduce API polling.

This interval also drives the status bar heartbeat polling cadence.

### `ollama.libraryRefreshInterval`

| Type     | Default |
| -------- | ------- |
| `number` | `21600` |

How often (in seconds) to auto-refresh the **Ollama Library** and **Cloud** model catalogs. Default is 6 hours. These catalogs change infrequently, so aggressive polling is unnecessary.

## Logging

### `ollama.streamLogs`

| Type      | Default |
| --------- | ------- |
| `boolean` | `true`  |

When enabled, streams Ollama server log output to the **Opilot** output channel in real time.

- **macOS**: tails `~/.ollama/logs/server.log`
- **Windows**: tails `%LOCALAPPDATA%\Ollama\server.log`
- **Linux**: streams from `journalctl -u ollama`

Disable if stream output is noisy or you prefer a quiet channel.

### `ollama.diagnostics.logLevel`

| Type     | Default  | Options                                  |
| -------- | -------- | ---------------------------------------- |
| `string` | `"info"` | `"debug"`, `"info"`, `"warn"`, `"error"` |

Controls verbosity of extension diagnostic output in the **Opilot** output channel.

| Level   | Shows                                                |
| ------- | ---------------------------------------------------- |
| `debug` | All messages including internal timing and API calls |
| `info`  | Normal operation messages (default)                  |
| `warn`  | Warnings and errors only                             |
| `error` | Errors only                                          |

Use `"debug"` when troubleshooting connection or provider issues.

## Modelfiles

### `ollama.modelfilesPath`

| Type     | Default      |
| -------- | ------------ |
| `string` | `""` (empty) |

Path to the folder containing your Modelfiles. Leave empty to use the default: `~/.ollama/modelfiles`.

```json
"ollama.modelfilesPath": "/Users/yourname/projects/my-modelfiles"
```

## Inline Completions

### `ollama.completionModel`

| Type     | Default         |
| -------- | --------------- |
| `string` | `""` (disabled) |

The Ollama model to use for inline code completions. Must be a locally installed model. Leave empty to disable completions.

Best results with small, fast code models:

```json
"ollama.completionModel": "qwen2.5-coder:1.5b"
"ollama.completionModel": "deepseek-coder:1.3b"
"ollama.completionModel": "starcoder2:3b"
```

### `ollama.enableInlineCompletions`

| Type      | Default |
| --------- | ------- |
| `boolean` | `true`  |

Master toggle for inline code completions. Set to `false` to temporarily disable without clearing your `completionModel`.

```json
"ollama.enableInlineCompletions": false
```

## Recommended Configuration

A sensible starting configuration for local development:

```json
{
  "ollama.host": "http://localhost:11434",
  "ollama.localModelRefreshInterval": 30,
  "ollama.libraryRefreshInterval": 21600,
  "ollama.streamLogs": true,
  "ollama.diagnostics.logLevel": "info",
  "ollama.completionModel": "qwen2.5-coder:1.5b",
  "ollama.enableInlineCompletions": true
}
```
