import { Ollama } from 'ollama';
import { ExtensionContext, workspace } from 'vscode';

/**
 * Get or create an Ollama client instance configured with the current settings
 */
export async function getOllamaClient(context: ExtensionContext): Promise<Ollama> {
  const config = workspace.getConfiguration('ollama');
  const host = config.get<string>('host') || 'http://localhost:11434';
  const authToken = await context.secrets.get('ollama-auth-token');

  const clientConfig: { baseURL: string; headers?: Record<string, string> } = {
    baseURL: host,
  };

  if (authToken) {
    clientConfig.headers = {
      Authorization: `Bearer ${authToken}`,
    };
  }

  return new Ollama(clientConfig);
}

/**
 * Model capabilities detected from Ollama model metadata
 */
export interface ModelCapabilities {
  toolCalling: boolean;
  imageInput: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
}

/**
 * Test connection to Ollama server
 */
export async function testConnection(client: Ollama): Promise<boolean> {
  try {
    await client.list();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch and parse model capabilities from an Ollama model
 * by inspecting the template and families metadata
 */
export async function fetchModelCapabilities(client: Ollama, modelId: string): Promise<ModelCapabilities> {
  try {
    const modelInfo = await client.show({ model: modelId });

    // Default capabilities
    let toolCalling = false;
    let imageInput = false;

    // Check template for tool support by looking for {{ .Tools }}
    if (modelInfo.template && modelInfo.template.includes('{{ .Tools }}')) {
      toolCalling = true;
    }

    // Check families for vision/image support (CLIP requires 'clip' family)
    // Also check details.families if available
    const families = modelInfo.details?.families || [];
    if (families.includes('clip') || modelInfo.template?.includes('vision')) {
      imageInput = true;
    }

    // Calculate max tokens from model details if available
    // Ollama doesn't provide explicit max input/output token counts via the API,
    // so we use reasonable defaults based on parameter_size
    const paramSize = modelInfo.details?.parameter_size || '';
    let maxInputTokens = 4096; // Conservative default
    let maxOutputTokens = 4096;

    // Parse parameter size and adjust context window
    // e.g., "7B", "13B", "70B"
    if (paramSize.includes('7B')) {
      maxInputTokens = 2048;
    } else if (paramSize.includes('13B') || paramSize.includes('20B')) {
      maxInputTokens = 4096;
    } else if (paramSize.includes('70B')) {
      maxInputTokens = 8192;
    }

    return {
      toolCalling,
      imageInput,
      maxInputTokens,
      maxOutputTokens,
    };
  } catch {
    // If we can't fetch model info, return conservative defaults
    return {
      toolCalling: false,
      imageInput: false,
      maxInputTokens: 2048,
      maxOutputTokens: 2048,
    };
  }
}

/**
 * Get the ollama.contextLength override from settings
 * Returns 0 if not set or invalid
 */
export function getContextLengthOverride(): number {
  const config = workspace.getConfiguration('ollama');
  const value = config.get<number>('contextLength') || 0;
  return value > 0 ? value : 0;
}
