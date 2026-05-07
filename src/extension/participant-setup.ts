/**
 * Chat participant setup and registration
 * Handles the creation and registration of the chat participant for the extension
 */

import * as vscode from 'vscode';
import { type ChatClient } from '../client.js';
import { type DiagnosticsLogger } from '../diagnostics.js';
import { type ModelSettingsStore } from '../modelSettings.js';
import { resolvePromptReferences } from '../participantFeatures.js';

/**
 * Setup context for chat participant registration
 */
export type ParticipantSetupContext = {
  context: vscode.ExtensionContext;
  handler: vscode.ChatRequestHandler;
  diagnostics: DiagnosticsLogger;
  client: ChatClient;
  modelSettingsStore: ModelSettingsStore;
};

/**
 * Creates and registers the task chat participant
 * @param _ context Extension context (unused, kept for backward compatibility)
 * @param handler Chat request handler function
 * @param _ chatParticipantDetectionProvider Optional chat participant detection provider (not used)
 * @param client Ollama client
 * @param diagnostics Diagnostics logger
 * @returns Promise that resolves to the chat participant disposable
 */
export async function setupChatParticipant(
  context: vscode.ExtensionContext,
  handler: vscode.ChatRequestHandler,
  _chatParticipantDetectionProvider?: vscode.Disposable,
  client?: ChatClient,
  diagnostics?: DiagnosticsLogger,
): Promise<vscode.Disposable> {
  const additionalWelcomeMessage = 'Welcome to Opilot! Ask me anything or run /task to use open-ended planning.';
  const helpTextPrefix = '\n\nThis is a secure, local-only chat participant. All processing happens on your machine.';

  const participant = vscode.chat.createChatParticipant('opilot', {
    name: 'Opilot',
    shortName: 'opilot',
    description: 'Chat with your Ollama models',
    fullName: 'Opilot',
    isSticky: true,
    iconPath: vscode.Uri.joinPath(context.extensionUri, 'assets', 'opilot-icon.svg'),
    // eslint-disable-next-line @typescript-eslint/require-await
    async prompt(context) {
      const prompt = context.prompt;
      const resolvedPrompt = await resolvePromptReferences(prompt);
      return resolvedPrompt;
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async welcome() {
      return new vscode.ChatResponseAnchorPart({
        value: `${additionalWelcomeMessage}${helpTextPrefix}`,
      });
    },
  });

  participant.onDidReceiveMessage(async (message: vscode.ChatMessage) => {
    if (message.command === 'refresh-models') {
      if (client && diagnostics) {
        try {
          await client.ps();
          diagnostics.info('[chat-participant] models refreshed via chat command');
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          diagnostics.error(`[chat-participant] failed to refresh models: ${msg}`);
        }
      }
    }
  });

  participant.onDidReceiveMessage(handler);

  const subscriptions: vscode.Disposable[] = [participant];

  context.subscriptions.push(...subscriptions);

  return {
    dispose: () => {
      for (const sub of subscriptions) {
        sub.dispose();
      }
    },
  };
}