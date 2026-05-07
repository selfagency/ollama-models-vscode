/**
 * Provider setup and registration
 * Handles model settings view provider and language model provider registration
 */

import { type Ollama } from 'ollama';
import * as vscode from 'vscode';
import { type DiagnosticsLogger } from '../diagnostics.js';
import { reportError } from '../errorHandler.js';
import { saveModelSettings, type ModelSettingsStore } from '../modelSettings.js';
import { OllamaChatModelProvider } from '../provider.js';
import { createModelSettingsViewProvider, type ModelSettingsViewProvider } from '../settingsWebview.js';

const MODEL_SETTINGS_VIEW_ID = 'opilot.modelSettings';
const LANGUAGE_MODEL_VENDOR = 'selfagency-opilot';

/**
 * Setup context for provider registration
 */
export type ProviderSetupContext = {
  context: vscode.ExtensionContext;
  client: Ollama;
  diagnostics: DiagnosticsLogger;
  modelSettingsStore: ModelSettingsStore;
};

/**
 * Setup and register all providers (model settings view + LM provider)
 * @returns Object containing disposables for registered providers
 */
export function setupProviders({ context, client, diagnostics, modelSettingsStore }: ProviderSetupContext): {
  modelSettingsViewProvider: ModelSettingsViewProvider;
  modelSettingsViewRegistration: vscode.Disposable;
  lmProviderDisposable: vscode.Disposable | undefined;
  provider: OllamaChatModelProvider;
  modelSettingsStore: ModelSettingsStore;
  getSettingsDisposer: () => vscode.Disposable;
} {
  let modelSettingsStoreInternal = modelSettingsStore;
  const getAvailableModelNames = async (): Promise<string[]> => {
    const names = new Set<string>(Object.keys(modelSettingsStoreInternal));
    try {
      const [local, running] = await Promise.all([client.list(), client.ps()]);
      for (const model of local.models ?? []) {
        if (typeof model?.name === 'string' && model.name.length > 0) {
          names.add(model.name);
        }
      }
      for (const model of running.models ?? []) {
        if (typeof model?.name === 'string' && model.name.length > 0) {
          names.add(model.name);
        }
      }
    } catch (error) {
      diagnostics.exception('[model-settings] failed to collect model list', error);
    }
    return Array.from(names);
  };

  let saveDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  const modelSettingsViewProvider = createModelSettingsViewProvider({
    context,
    initialStore: modelSettingsStoreInternal,
    getAvailableModels: getAvailableModelNames,
    onStoreChanged: async nextStore => {
      modelSettingsStoreInternal = nextStore;
      if (context.globalStorageUri?.fsPath) {
        // Debounce writes: sliders fire many rapid patches; batch into a single save after 500 ms.
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(() => {
          saveModelSettings(context.globalStorageUri, modelSettingsStoreInternal, diagnostics).catch(() => {});
        }, 500);
      }
    },
    diagnostics,
  });

  diagnostics.info(`[model-settings] Registering webview view provider with ID: ${MODEL_SETTINGS_VIEW_ID}`);
  const modelSettingsViewRegistration =
    typeof vscode.window.registerWebviewViewProvider === 'function'
      ? vscode.window.registerWebviewViewProvider(MODEL_SETTINGS_VIEW_ID, modelSettingsViewProvider, {
          webviewOptions: { retainContextWhenHidden: true },
        })
      : {
          dispose: () => {
            /* noop for tests/mocks */
          },
        };
  diagnostics.info('[model-settings] View provider registered');

  const provider = new OllamaChatModelProvider(context, client, diagnostics, () => modelSettingsStoreInternal);
  let lmProviderDisposable: vscode.Disposable | undefined;
  try {
    lmProviderDisposable = vscode.lm.registerLanguageModelChatProvider(LANGUAGE_MODEL_VENDOR, provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already registered')) {
      diagnostics.warn(
        `[client] language model provider vendor "${LANGUAGE_MODEL_VENDOR}" is already registered; skipping duplicate registration.`,
      );
    } else {
      reportError(diagnostics, 'Language model provider registration failed', error, { showToUser: true });
      throw error;
    }
  }

  // Eagerly populate model capability data so thinking/tools detection is
  // ready before the first chat request rather than waiting for VS Code to
  // lazily call provideLanguageModelChatInformation.
  provider.prefetchModels();

  return {
    modelSettingsViewProvider,
    modelSettingsViewRegistration,
    lmProviderDisposable,
    provider,
    modelSettingsStore: modelSettingsStoreInternal,
    getSettingsDisposer: () => ({
      dispose: () => {
        clearTimeout(saveDebounceTimer);
        if (context.globalStorageUri?.fsPath) {
          saveModelSettings(context.globalStorageUri, modelSettingsStoreInternal, diagnostics).catch(() => {});
        }
      },
    }),
  };
}
