import { Ollama } from 'ollama';
import {
  commands,
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace,
} from 'vscode';

/**
 * Tree item representing a pane or model in the sidebar
 */
export class ModelTreeItem extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: 'pane' | 'model' | 'running',
    public readonly size?: number,
    public readonly durationMs?: number,
  ) {
    super(label);
    this.contextValue = type;
    this.collapsibleState = type === 'pane' ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None;

    if (type === 'model') {
      this.description = this.formatSize(size);
    } else if (type === 'running') {
      const sizeStr = this.formatSize(size);
      const durationStr = this.formatDuration(durationMs);
      this.description = [sizeStr, durationStr].filter(Boolean).join(' • ');
    }
  }

  private formatSize(bytes?: number): string {
    if (!bytes) return '';
    const gb = bytes / 1024 ** 3;
    return gb.toFixed(1) + ' GB';
  }

  private formatDuration(ms?: number): string {
    if (!ms) return '';
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    if (mins > 0) return `${mins}m ${secs % 60}s`;
    return `${secs}s`;
  }
}

/**
 * Ollama sidebar/activity bar view provider
 */
export class OllamaSidebarProvider implements TreeDataProvider<ModelTreeItem>, Disposable {
  private treeChangeEmitter = new EventEmitter<ModelTreeItem | null>();
  readonly onDidChangeTreeData: Event<ModelTreeItem | null> = this.treeChangeEmitter.event;

  private panes: ModelTreeItem[] = [
    new ModelTreeItem('Running Models', 'pane'),
    new ModelTreeItem('Installed', 'pane'),
    new ModelTreeItem('Library', 'pane'),
  ];

  private refreshTimeout: NodeJS.Timeout | null = null;
  private lastRefreshTime = 0;
  private libraryLastRefreshTime = 0;
  private refreshIntervals: NodeJS.Timeout[] = [];
  private libraryLoadPromise: Promise<ModelTreeItem[]> | null = null;
  private cachedLibraryModels: Map<string, ModelTreeItem> = new Map();

  constructor(
    private client: Ollama,
    private logChannel?: any,
  ) {
    this.startAutoRefresh();
  }

  /**
   * Get tree items for a given element
   */
  async getChildren(element?: ModelTreeItem): Promise<ModelTreeItem[]> {
    // Root level: return panes
    if (!element) {
      return this.panes;
    }

    // Pane level: return models
    if (element.type === 'pane') {
      switch (element.label) {
        case 'Installed':
          return this.getInstalledModels();
        case 'Running Models':
          return this.getRunningModels();
        case 'Library':
          return this.getLibraryModels();
        default:
          return [];
      }
    }

    return [];
  }

  /**
   * Get tree item metadata
   */
  getTreeItem(element: ModelTreeItem): TreeItem {
    return element;
  }

  /**
   * Get installed models from Ollama
   */
  private async getInstalledModels(): Promise<ModelTreeItem[]> {
    try {
      const response = await this.client.list();
      return response.models.map(model => new ModelTreeItem(model.name, 'model', model.size));
    } catch {
      return [new ModelTreeItem('Failed to load models', 'model')];
    }
  }

  /**
   * Get running processes from Ollama
   */
  private async getRunningModels(): Promise<ModelTreeItem[]> {
    try {
      this.logChannel?.debug('[Ollama] Fetching running models via ps()...');
      const response = await this.client.ps();
      this.logChannel?.debug(`[Ollama] Found ${response.models.length} running models`);
      return response.models.map(model => {
        // Extract duration from model metadata if available
        const durationMs = model.expires_at
          ? Math.max(0, new Date(model.expires_at).getTime() - Date.now())
          : undefined;
        const item = new ModelTreeItem(model.name, 'running', model.size, durationMs);
        // Context value 'running' allows stop action in context menu
        return item;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logChannel?.error(`[Ollama] Failed to load running models: ${msg}`);
      return [new ModelTreeItem('Failed to load running models', 'model')];
    }
  }

  /**
   * Get models available from library (catalog fetching with error handling)
   */
  private async getLibraryModels(): Promise<ModelTreeItem[]> {
    try {
      // Return cached result if already loading or recently loaded
      if (this.libraryLoadPromise) {
        return this.libraryLoadPromise;
      }

      // If we have cached models from a recent load, return those
      if (this.cachedLibraryModels.size > 0) {
        return Array.from(this.cachedLibraryModels.values());
      }

      // Start loading library models
      this.logChannel?.debug('[Ollama] Starting library catalog fetch...');
      this.libraryLoadPromise = this.fetchLibraryWithTimeout();
      const models = await this.libraryLoadPromise;
      this.libraryLoadPromise = null;
      return models;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logChannel?.error(`[Ollama] Failed to load library: ${msg}`);
      this.libraryLoadPromise = null;
      return [new ModelTreeItem('Unable to load library catalog', 'model')];
    }
  }

  /**
   * Fetch library with a timeout to prevent hanging
   */
  private async fetchLibraryWithTimeout(timeoutMs = 10000): Promise<ModelTreeItem[]> {
    this.logChannel?.debug('[Ollama] Library fetch timeout set to ' + timeoutMs + 'ms');
    const timeoutPromise = new Promise<ModelTreeItem[]>((_, reject) => {
      setTimeout(() => reject(new Error('Library fetch timeout')), timeoutMs);
    });

    try {
      // Try to fetch from Ollama library API
      // Note: This depends on what library endpoints are available
      this.logChannel?.debug('[Ollama] Attempting to fetch from Ollama library...');
      // For now, return empty as a placeholder - the actual implementation depends on Ollama API
      this.cachedLibraryModels.clear();
      this.logChannel?.debug('[Ollama] Library catalog is empty or not available');
      return [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logChannel?.warn(`[Ollama] Library fetch error: ${msg}`);
      throw error;
    }
  }

  /**
   * Refresh the tree (manual refresh button - forces immediate refresh)
   */
  refresh(): void {
    this.logChannel?.debug('[Ollama] Manual refresh triggered');
    this.lastRefreshTime = 0; // Force refresh
    this.libraryLastRefreshTime = 0;
    this.treeChangeEmitter.fire(null);
  }

  /**
   * Debounced refresh that coalesces rapid refresh calls
   */
  private debouncedRefresh(): void {
    const debounceMs = workspace.getConfiguration('ollama').get<number>('debounceInterval') || 300;
    const now = Date.now();

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Only refresh if debounce interval has passed
    if (now - this.lastRefreshTime >= debounceMs) {
      this.lastRefreshTime = now;
      this.treeChangeEmitter.fire(null);
    } else {
      // Schedule refresh for later
      this.refreshTimeout = setTimeout(
        () => {
          this.lastRefreshTime = Date.now();
          this.treeChangeEmitter.fire(null);
          this.refreshTimeout = null;
        },
        debounceMs - (now - this.lastRefreshTime),
      );
    }
  }

  /**
   * Start auto-refresh timers for local models and library
   */
  private startAutoRefresh(): void {
    const localRefreshSecs = workspace.getConfiguration('ollama').get<number>('localModelRefreshInterval') || 30;

    // Auto-refresh local/running models every 30 seconds
    if (localRefreshSecs > 0) {
      this.logChannel?.debug(`[Ollama] Auto-refresh set for local models every ${localRefreshSecs}s`);
      const localInterval = setInterval(() => {
        this.debouncedRefresh();
      }, localRefreshSecs * 1000);
      this.refreshIntervals.push(localInterval);
    }

    // Auto-refresh library every 6 hours
    const libraryRefreshSecs = workspace.getConfiguration('ollama').get<number>('libraryRefreshInterval') || 21600;
    if (libraryRefreshSecs > 0) {
      this.logChannel?.debug(
        `[Ollama] Auto-refresh set for library every ${libraryRefreshSecs}s (${Math.round(libraryRefreshSecs / 3600)}h)`,
      );
      const libraryInterval = setInterval(() => {
        const now = Date.now();
        if (now - this.libraryLastRefreshTime >= libraryRefreshSecs * 1000) {
          this.libraryLastRefreshTime = now;
          this.debouncedRefresh();
        }
      }, libraryRefreshSecs * 1000);
      this.refreshIntervals.push(libraryInterval);
    }

    // Watch for settings changes and restart intervals
    workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration('ollama.localModelRefreshInterval') ||
        e.affectsConfiguration('ollama.libraryRefreshInterval')
      ) {
        this.logChannel?.debug('[Ollama] Ollama settings changed, restarting auto-refresh');
        this.stopAutoRefresh();
        this.startAutoRefresh();
      }
    });
  }

  /**
   * Stop all auto-refresh timers
   */
  private stopAutoRefresh(): void {
    for (const interval of this.refreshIntervals) {
      clearInterval(interval);
    }
    this.refreshIntervals = [];
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopAutoRefresh();
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      this.logChannel?.debug(`[Ollama] Deleting model: ${modelName}`);
      await this.client.delete({ model: modelName });
      this.logChannel?.info(`[Ollama] Model deleted: ${modelName}`);
      this.refresh();
      window.showInformationMessage(`Model ${modelName} deleted`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logChannel?.error(`[Ollama] Failed to delete model ${modelName}: ${msg}`);
      window.showErrorMessage(`Failed to delete model: ${msg}`);
    }
  }

  /**
   * Pull (download) a model
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      this.logChannel?.debug(`[Ollama] Starting pull for model: ${modelName}`);
      window.withProgress(
        { location: 15, title: `Pulling ${modelName}...` }, // 15 = ProgressLocation.Window
        async () => {
          await this.client.pull({ model: modelName });
          this.logChannel?.info(`[Ollama] Model pulled successfully: ${modelName}`);
          this.refresh();
          window.showInformationMessage(`Model ${modelName} pulled successfully`);
        },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logChannel?.error(`[Ollama] Failed to pull model ${modelName}: ${msg}`);
      window.showErrorMessage(`Failed to pull model: ${msg}`);
    }
  }

  /**
   * Stop a running model
   */
  async stopModel(modelName: string): Promise<void> {
    try {
      this.logChannel?.debug(`[Ollama] Stopping model: ${modelName}`);
      // Ollama doesn't have a direct "stop" API, but models stop when no longer used
      // This is a placeholder for future implementation
      this.logChannel?.info(`[Ollama] Model stop not yet implemented for: ${modelName}`);
      window.showInformationMessage(`Model stop not yet implemented for ${modelName}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logChannel?.error(`[Ollama] Failed to stop model ${modelName}: ${msg}`);
      window.showErrorMessage(`Failed to stop model: ${msg}`);
    }
  }
}

/**
 * Register sidebar with VS Code
 */
export function registerSidebar(context: ExtensionContext, client: Ollama, logChannel?: any): void {
  const provider = new OllamaSidebarProvider(client, logChannel);

  context.subscriptions.push(
    window.registerTreeDataProvider('ollama-sidebar', provider),
    commands.registerCommand('ollama-copilot.refreshSidebar', () => {
      provider.refresh();
      window.showInformationMessage('Models refreshed');
    }),
    commands.registerCommand('ollama-copilot.refreshLibrary', () => {
      provider.refresh();
      window.showInformationMessage('Library catalog refreshed');
    }),
    commands.registerCommand('ollama-copilot.deleteModel', (item: ModelTreeItem) => {
      if (item.type === 'model' || item.type === 'running') {
        void provider.deleteModel(item.label);
      }
    }),
    commands.registerCommand('ollama-copilot.pullModel', async () => {
      const modelName = await window.showInputBox({
        prompt: 'Enter model name or identifier (e.g., llama2, mistral:7b)',
        ignoreFocusOut: false,
      });
      if (modelName) {
        void provider.pullModel(modelName);
      }
    }),
    commands.registerCommand('ollama-copilot.stopModel', (item: ModelTreeItem) => {
      if (item.type === 'running') {
        void provider.stopModel(item.label);
      }
    }),
    {
      dispose: () => provider.dispose(),
    },
  );
}
