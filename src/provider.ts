import { Ollama } from 'ollama';
import {
  CancellationToken,
  EventEmitter,
  ExtensionContext,
  LanguageModelChatInformation,
  LanguageModelChatMessageRole,
  LanguageModelChatProvider,
  LanguageModelChatRequestMessage,
  LanguageModelDataPart,
  LanguageModelResponsePart,
  LanguageModelTextPart,
  LanguageModelToolCallPart,
  LanguageModelToolResultPart,
  LogOutputChannel,
  Progress,
  ProvideLanguageModelChatResponseOptions,
  window,
} from 'vscode';
import { getContextLengthOverride, getOllamaClient } from './client';

/**
 * Ollama Chat Model Provider
 */
export class OllamaChatModelProvider implements LanguageModelChatProvider<LanguageModelChatInformation> {
  private models: Map<string, LanguageModelChatInformation> = new Map();
  private modelsChangeEventEmitter: EventEmitter<void> = new EventEmitter();
  private toolCallIdMap: Map<string, string> = new Map();
  private reverseToolCallIdMap: Map<string, string> = new Map();

  readonly onDidChangeLanguageModelChatInformation = this.modelsChangeEventEmitter.event;

  constructor(
    readonly context: ExtensionContext,
    private client: Ollama,
    private outputChannel: LogOutputChannel,
  ) {}

  /**
   * Provide information about available chat models
   */
  async provideLanguageModelChatInformation(
    _options: { silent: boolean },
    _token: CancellationToken,
  ): Promise<LanguageModelChatInformation[]> {
    try {
      const response = await this.client.list();
      const models: LanguageModelChatInformation[] = [];

      for (const model of response.models) {
        const info = await this.getChatModelInfo(model.name);
        if (info) {
          models.push(info);
          this.models.set(model.name, info);
        }
      }

      this.modelsChangeEventEmitter.fire();
      return models;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.error(`Failed to fetch models: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Get information about a specific model
   */
  private async getChatModelInfo(modelId: string): Promise<LanguageModelChatInformation | undefined> {
    try {
      const response = await this.client.show({ model: modelId });

      return {
        id: modelId,
        name: formatModelName(modelId),
        family: 'ollama',
        version: '1.0.0',
        maxInputTokens: getContextLengthOverride(),
        maxOutputTokens: getContextLengthOverride(),
        capabilities: {
          imageInput: this.isVisionModel(response),
          toolCalling: this.isToolModel(response),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.warn(`Failed to get model info for ${modelId}: ${errorMessage}`);
      return undefined;
    }
  }

  /**
   * Check if model supports tool use
   */
  private isToolModel(modelResponse: unknown): boolean {
    const response = modelResponse as Record<string, unknown>;
    const template = response.template as string | undefined;
    return template ? template.includes('{{ .Tools }}') : false;
  }

  /**
   * Check if model supports vision/image inputs
   */
  private isVisionModel(modelResponse: unknown): boolean {
    const response = modelResponse as Record<string, unknown>;
    const details = response.details as Record<string, unknown> | undefined;
    const families = details?.families as string[] | undefined;
    return families ? families.includes('clip') || families.includes('vision') : false;
  }

  /**
   * Provide language model chat response
   */
  async provideLanguageModelChatResponse(
    model: LanguageModelChatInformation,
    messages: readonly LanguageModelChatRequestMessage[],
    options: ProvideLanguageModelChatResponseOptions,
    progress: Progress<LanguageModelResponsePart>,
    token: CancellationToken,
  ): Promise<void> {
    try {
      this.clearToolCallIdMappings();

      // Convert VS Code messages to Ollama format
      const ollamaMessages = this.toOllamaMessages(messages);

      // Build tools array if supported
      let tools: Parameters<typeof this.client.chat>[0]['tools'] | undefined;
      if (options.tools && options.tools.length > 0 && model.capabilities.toolCalling) {
        tools = options.tools.map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description || '',
            parameters: tool.inputSchema as Record<string, unknown>,
          },
        }));
      }

      // Stream chat response
      const response = this.client.chat({
        model: model.id,
        messages: ollamaMessages,
        stream: true,
        tools,
      });

      let currentText = '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of response as any) {
        if (token.isCancellationRequested) {
          break;
        }

        if (chunk.message?.content) {
          currentText += chunk.message.content;
        }

        // Handle tool calls
        if (chunk.message?.tool_calls && Array.isArray(chunk.message.tool_calls)) {
          // Flush accumulated text
          if (currentText.trim()) {
            progress.report(new LanguageModelTextPart(currentText));
            currentText = '';
          }

          for (const toolCall of chunk.message.tool_calls) {
            // Map tool call ID and emit tool call
            const vsCodeId = this.generateToolCallId();
            this.mapToolCallId(vsCodeId, toolCall.id || '');

            progress.report(
              new LanguageModelToolCallPart(
                vsCodeId,
                toolCall.function?.name || '',
                toolCall.function?.arguments || {},
              ),
            );
          }
        }
      }

      // Flush any remaining text
      if (currentText.trim()) {
        progress.report(new LanguageModelTextPart(currentText));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.outputChannel.error(`Chat response failed: ${errorMessage}`);
      progress.report(new LanguageModelTextPart(`Error: ${errorMessage}`));
    }
  }

  /**
   * Convert VS Code messages to Ollama message format
   */
  private toOllamaMessages(
    messages: readonly LanguageModelChatRequestMessage[],
  ): Parameters<typeof this.client.chat>[0]['messages'] {
    const ollamaMessages: Parameters<typeof this.client.chat>[0]['messages'] = [];

    for (const msg of messages) {
      const role = msg.role === LanguageModelChatMessageRole.User ? 'user' : 'assistant';
      const ollamaMsg: Record<string, unknown> = { role };

      // Extract and assemble content
      const contentParts: (string | Record<string, unknown>)[] = [];
      let textContent = '';

      for (const part of msg.content) {
        if (part instanceof LanguageModelTextPart) {
          textContent += part.value;
        } else if (part instanceof LanguageModelDataPart) {
          const base64Data = typeof part.data === 'string' ? part.data : Buffer.from(part.data).toString('base64');

          contentParts.push({
            type: 'image',
            image: {
              url: `data:image/jpeg;base64,${base64Data}`,
            },
          });
        } else if (part instanceof LanguageModelToolCallPart) {
          ollamaMsg.tool_calls = ollamaMsg.tool_calls || [];
          (ollamaMsg.tool_calls as Record<string, unknown>[]).push({
            id: this.getOllamaToolCallId(part.callId),
            function: {
              name: part.name,
              arguments: part.input,
            },
          });
        } else if (part instanceof LanguageModelToolResultPart) {
          // Tool results become separate messages
          // Note: Ollama's Message type doesn't have tool_call_id field, so we only send role and content
          ollamaMessages.push({
            role: 'tool',
            content: JSON.stringify(part.content),
          });
        }
      }

      if (textContent) {
        contentParts.unshift(textContent);
      }

      if (contentParts.length === 1 && typeof contentParts[0] === 'string') {
        ollamaMsg.content = contentParts[0];
      } else if (contentParts.length > 0) {
        ollamaMsg.content = contentParts;
      }

      if (ollamaMsg.content || ollamaMsg.tool_calls) {
        ollamaMessages.push(ollamaMsg as never);
      }
    }

    return ollamaMessages;
  }

  /**
   * Generate a VS Code tool call ID (9 alphanumeric characters)
   */
  private generateToolCallId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 9; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Map VS Code tool call ID to Ollama tool call ID
   */
  private mapToolCallId(vsCodeId: string, ollamaId: string): void {
    this.toolCallIdMap.set(vsCodeId, ollamaId);
    this.reverseToolCallIdMap.set(ollamaId, vsCodeId);
  }

  /**
   * Get Ollama tool call ID from VS Code ID
   */
  private getOllamaToolCallId(vsCodeId: string): string {
    return this.toolCallIdMap.get(vsCodeId) || vsCodeId;
  }

  /**
   * Clear tool call ID mappings
   */
  public clearToolCallIdMappings(): void {
    this.toolCallIdMap.clear();
    this.reverseToolCallIdMap.clear();
  }

  /**
   * Provide token count estimate
   */
  async provideTokenCount(
    _model: LanguageModelChatInformation,
    text: string | LanguageModelChatRequestMessage,
    _token: CancellationToken,
  ): Promise<number> {
    // Ollama doesn't have a public tokenize endpoint, so use a heuristic
    // Estimate: ~1 token per 4 characters (varies by model, this is approximate)
    let textContent = '';
    if (typeof text === 'string') {
      textContent = text;
    } else {
      // Extract text from message parts
      textContent = text.content
        .map(part => {
          if (part instanceof LanguageModelTextPart) {
            return part.value;
          } else if (part instanceof LanguageModelToolCallPart) {
            return part.name + JSON.stringify(part.input);
          } else if (part instanceof LanguageModelToolResultPart) {
            return String(part.content);
          }
          return '';
        })
        .join('');
    }

    return Math.ceil(textContent.length / 4);
  }

  /**
   * Manage authentication token with status display and clear option
   */
  async setAuthToken(): Promise<void> {
    const existingToken = await this.context.secrets.get('ollama-auth-token');
    const status = existingToken ? '✓ Authenticated' : '○ Anonymous';

    const action = await window.showQuickPick(
      [
        { label: `${status}`, description: 'Current authentication status', kind: -1 },
        { label: 'Set Token', description: 'Enter a new authentication token' },
        ...(existingToken ? [{ label: 'Clear Token', description: 'Remove stored authentication' }] : []),
      ],
      { matchOnDescription: true, ignoreFocusOut: true },
    );

    if (!action) return;

    if (action.label === 'Clear Token') {
      await this.context.secrets.delete('ollama-auth-token');
      this.outputChannel.info('Ollama authentication token cleared');
      this.client = await getOllamaClient(this.context);
      this.modelsChangeEventEmitter.fire();
    } else if (action.label === 'Set Token') {
      const token = await window.showInputBox({
        prompt: 'Enter Ollama authentication token (leave empty for anonymous)',
        password: true,
        ignoreFocusOut: true,
      });

      if (token !== undefined) {
        if (token) {
          await this.context.secrets.store('ollama-auth-token', token);
          this.outputChannel.info('Ollama authentication token updated');
        } else {
          await this.context.secrets.delete('ollama-auth-token');
          this.outputChannel.info('Ollama authentication token cleared');
        }
        // Reinitialize client with new token
        this.client = await getOllamaClient(this.context);
        this.modelsChangeEventEmitter.fire();
      }
    }
  }
}

/**
 * Format model name for display
 */
export function formatModelName(modelId: string): string {
  return modelId
    .replace(/^ollama\//, '')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
