/**
 * Command setup and registration
 * Handles the registration of commands for the extension
 */

import { type Ollama } from 'ollama';
import * as vscode from 'vscode';
import { testConnection } from '../client.js';
import { type DiagnosticsLogger } from '../diagnostics.js';
import { handleConnectionTestFailure } from '../extensionHelpers.js';
import { type ModelSettingsStore } from '../modelSettings.js';
import { logPerformanceSnapshot } from '../participantOrchestration.js';
import { type OllamaChatModelProvider } from '../provider.js';
import { type ModelSettingsViewProvider } from '../settingsWebview.js';
import { type SidebarProfilingSnapshot } from '../sidebar.js';

/**
 * Setup context for command registration
 */
export type CommandsSetupContext = {
  context: vscode.ExtensionContext;
  diagnostics: DiagnosticsLogger;
  client: Ollama;
  provider: OllamaChatModelProvider;
  modelSettingsViewProvider: ModelSettingsViewProvider;
  modelSettingsStore: ModelSettingsStore;
  getSidebarProfilingSnapshot: () => SidebarProfilingSnapshot | undefined;
  host: string;
  logOutputChannel?: vscode.OutputChannel;
};

/**
 * Registers all commands for the extension
 * @param context Command setup context
 * @returns Array of disposables for the registered commands
 */
export function registerCommands({
  diagnostics,
  client,
  provider,
  modelSettingsViewProvider,
  modelSettingsStore,
  getSidebarProfilingSnapshot,
  host,
  logOutputChannel,
}: CommandsSetupContext): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('opilot.manageAuthToken', async () => {
      await provider.setAuthToken();
    }),
    vscode.commands.registerCommand('opilot.refreshModels', () => {
      provider.refreshModels();
      diagnostics.info('[client] model list refresh triggered');
    }),
    vscode.commands.registerCommand('opilot.openExtensionSettings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:selfagency.opilot');
    }),
    vscode.commands.registerCommand('opilot.openModelSettings', async () => {
      modelSettingsViewProvider.updateStore(modelSettingsStore);
      await modelSettingsViewProvider.open();
    }),
    vscode.commands.registerCommand('opilot.openModelSettingsForModel', async (modelId: unknown) => {
      if (typeof modelId !== 'string' || modelId.length === 0) {
        return;
      }
      modelSettingsViewProvider.updateStore(modelSettingsStore);
      await modelSettingsViewProvider.open(modelId);
    }),
    vscode.commands.registerCommand('opilot.dumpPerformanceSnapshot', () => {
      logPerformanceSnapshot(diagnostics, getSidebarProfilingSnapshot());
      vscode.window.showInformationMessage('Performance snapshot written to Opilot logs').then(undefined, () => {});
    }),
    vscode.commands.registerCommand('opilot.checkServerHealth', async () => {
      const isConnected = await testConnection(client);
      if (!isConnected) {
        await handleConnectionTestFailure(host, undefined, undefined, logOutputChannel);
      } else {
        vscode.window.showInformationMessage('Ollama server is reachable.').then(undefined, () => {});
      }
    }),
  ];
}
