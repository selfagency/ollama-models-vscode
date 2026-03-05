import * as vscode from 'vscode';
import { getOllamaClient, testConnection } from './client.js';
import { OllamaChatModelProvider } from './provider.js';
import { registerSidebar } from './sidebar.js';

export async function activate(context: vscode.ExtensionContext) {
  const logOutputChannel =
    typeof vscode.window.createOutputChannel === 'function'
      ? vscode.window.createOutputChannel('Ollama for Copilot', { log: true })
      : undefined;

  const client = await getOllamaClient(context);
  const provider = new OllamaChatModelProvider(context, client, logOutputChannel!);
  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider('ollama', provider),
    vscode.commands.registerCommand('ollama-copilot.manageAuthToken', async () => {
      await provider.setAuthToken();
    }),
  );

  // Register sidebar view
  registerSidebar(context, client, logOutputChannel);

  // Test connection to Ollama server on startup (non-blocking)
  void (async () => {
    try {
      const isConnected = await testConnection(client);
      if (!isConnected) {
        const config = vscode.workspace.getConfiguration('ollama');
        const host = config.get<string>('host') || 'http://localhost:11434';
        const selection = await vscode.window.showErrorMessage(
          `Cannot connect to Ollama server at ${host}. Please check your ollama.host setting and authentication token.`,
          'Open Settings',
        );
        if (selection === 'Open Settings') {
          await vscode.commands.executeCommand('workbench.action.openSettings', 'ollama');
        }
      }
    } catch (error) {
      if (logOutputChannel) {
        const message = error instanceof Error ? error.message : String(error);
        logOutputChannel.error(`[Ollama] Connection test failed: ${message}`);
      }
    }
  })();

  if (logOutputChannel) {
    context.subscriptions.push(logOutputChannel);
  }

  const participantHandler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<void> => {
    const messages: vscode.LanguageModelChatMessage[] = [];

    for (const turn of chatContext.history) {
      if (turn instanceof vscode.ChatRequestTurn) {
        messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
      } else if (turn instanceof vscode.ChatResponseTurn) {
        const text = turn.response
          .filter((r): r is vscode.ChatResponseMarkdownPart => r instanceof vscode.ChatResponseMarkdownPart)
          .map(r => r.value.value)
          .join('');
        if (text) {
          messages.push(vscode.LanguageModelChatMessage.Assistant(text));
        }
      }
    }

    messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

    try {
      const response = await request.model.sendRequest(messages, {}, token);
      for await (const chunk of response.stream) {
        if (chunk instanceof vscode.LanguageModelTextPart) {
          stream.markdown(chunk.value);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      stream.markdown(`Error: ${message}`);
    }
  };

  const participant = vscode.chat.createChatParticipant('ollama-copilot.ollama', participantHandler);
  participant.iconPath = (vscode.Uri as any).joinPath(context.extensionUri, 'logo.png');
  context.subscriptions.push(participant);
}

export function deactivate() {}
