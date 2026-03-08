---
title: Getting Started
---

## Prerequisites

### Install Ollama

Download and install Ollama from [ollama.ai/download](https://ollama.ai/download).

After installation, start the Ollama server:

```bash
# Option A: open the Ollama desktop app (macOS / Windows)
# Option B: run from the terminal
ollama serve
```

Verify it's running:

```bash
curl http://localhost:11434
# Expected: "Ollama is running"
```

### (Optional) Log in to Ollama Cloud

Cloud models are hosted by Ollama and require authentication:

```bash
ollama login
```

Follow the prompts in your browser. Once logged in, Cloud models appear in the sidebar's **Cloud Models** panel.

### Install GitHub Copilot Chat

The extension integrates with the [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension. Make sure it is installed and signed in.

### Install Opilot

Search for **"Opilot"** in the VS Code Extensions panel, or run:

```bash
code --install-extension selfagency.opilot
```

The Ollama activity bar icon (🦙) will appear automatically on next startup.

---

## Step 1: Pull Your First Model

Click the Ollama icon in the activity bar to open the sidebar. Navigate to the **Library** panel, find a model, and click the **Pull** (⬇) button on any variant.

Recommended starter models:

| Use Case         | Model                | Size  |
| ---------------- | -------------------- | ----- |
| General chat     | `llama3.2:3b`        | ~2 GB |
| Code chat (fast) | `qwen2.5-coder:7b`   | ~5 GB |
| Code completions | `qwen2.5-coder:1.5b` | ~1 GB |
| Vision           | `llava:7b`           | ~5 GB |
| Reasoning        | `deepseek-r1:7b`     | ~5 GB |

While a model is pulling you'll see streaming progress inside a VS Code notification. You can continue working — pulls happen in the background.

---

## Step 2: Start a Conversation

### Via the Model Picker

1. Open **GitHub Copilot Chat** (`Ctrl+Alt+I` / `Cmd+Alt+I`)
2. Click the **model selector** dropdown in the chat input
3. Select any model prefixed with **🦙 Ollama**
4. Start chatting normally

The model picker shows all locally cached Ollama models alongside the standard Copilot models.

### Via the `@ollama` Chat Participant

Type `@ollama` at the beginning of a Copilot Chat message to direct it straight to your local Ollama instance:

```text
@ollama explain the design of this TypeScript module
```

The `@ollama` participant is _sticky_ — once you invoke it in a thread, subsequent messages in the thread continue using it automatically.

→ See [`@ollama` Chat Participant](./users/chat-participant) for the full guide.

---

## Step 3: (Optional) Enable Inline Completions

To get real-time code suggestions as you type, configure a completion model:

1. Open Settings (`Ctrl+,` / `Cmd+,`) and search for `ollama.completionModel`
2. Enter a small, fast model name (e.g. `qwen2.5-coder:1.5b`)
3. Make sure `ollama.enableInlineCompletions` is `true`

Smaller quantized models (1–3 B parameters) respond quickly enough for a smooth completion experience. See [Inline Completions](./users/completions) for tuning tips.

---

## Step 4: (Optional) Create a Custom Modelfile

Modelfiles let you define a custom model persona, system prompt, and inference parameters. Click the **+** button in the **Modelfiles** sidebar panel to launch the wizard.

→ See [Modelfile Manager](./users/modelfiles) for the full guide.

---

## Remote Ollama Instances

To connect to a remote Ollama server, update the `ollama.host` setting:

1. Open Settings and search for `ollama.host`
2. Enter your remote URL (e.g., `http://my-server:11434`)
3. If the server requires authentication, run **"Ollama: Manage Ollama Auth Token"** from the Command Palette to store your bearer token securely

→ See [Settings](./users/settings) for all available configuration options.
