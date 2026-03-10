import type { Ollama } from 'ollama';
import * as vscode from 'vscode';
import type { DiagnosticsLogger } from './diagnostics.js';

/** Minimum poll interval enforced regardless of setting value (5 seconds). */
const MIN_INTERVAL_MS = 5_000;
const DEBOUNCE_FAILURE_COUNT = 2;

function getHeartbeatIntervalMs(): number {
  const seconds = vscode.workspace.getConfiguration('ollama').get<number>('localModelRefreshInterval') ?? 30;
  return Math.max(seconds * 1_000, MIN_INTERVAL_MS);
}

export type StatusBarState = 'checking' | 'online' | 'offline';

/**
 * Result of a single Ollama health check.
 */
export interface HealthCheckResult {
  online: boolean;
  modelCount: number;
  host: string;
  checkedAt: Date;
}

/**
 * Perform a single health check against the Ollama server.
 * Returns structured result rather than throwing so callers don't need try/catch.
 */
export async function checkOllamaHealth(client: Ollama, host: string): Promise<HealthCheckResult> {
  const checkedAt = new Date();
  try {
    const { models } = await client.list();
    return { online: true, modelCount: models.length, host, checkedAt };
  } catch {
    return { online: false, modelCount: 0, host, checkedAt };
  }
}

/**
 * Format a Date as a short locale time string (e.g. "14:03:22").
 */
function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function applyState(item: vscode.StatusBarItem, result: HealthCheckResult): void {
  if (result.online) {
    item.text = `$(radio-tower) Ollama (${result.modelCount})`;
    item.tooltip = new vscode.MarkdownString(
      `**Ollama** — connected\n\nHost: \`${result.host}\`\nModels: ${result.modelCount}\nChecked: ${formatTime(result.checkedAt)}`,
    );
    item.backgroundColor = undefined;
    item.color = undefined;
  } else {
    item.text = `$(warning) Ollama offline`;
    item.tooltip = new vscode.MarkdownString(
      `**Ollama** — unreachable\n\nHost: \`${result.host}\`\nChecked: ${formatTime(result.checkedAt)}\n\nClick to open connection settings.`,
    );
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    item.color = new vscode.ThemeColor('statusBarItem.warningForeground');
  }
}

/**
 * Register the Ollama status bar heartbeat.
 *
 * The returned disposable stops the interval and removes the status bar item.
 * Add it to `context.subscriptions`.
 */
export function registerStatusBarHeartbeat(
  client: Ollama,
  host: string,
  diagnostics: DiagnosticsLogger,
): vscode.Disposable {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'opilot.checkServerHealth';
  item.text = `$(loading~spin) Ollama…`;
  item.tooltip = 'Checking Ollama server…';
  item.show();

  let consecutiveFailures = 0;
  let intervalHandle: ReturnType<typeof setInterval>;

  const runCheck = async () => {
    item.text = `$(loading~spin) Ollama…`;
    const result = await checkOllamaHealth(client, host);
    diagnostics.debug(`[statusBar] health check: ${result.online ? `online, ${result.modelCount} models` : 'offline'}`);

    if (!result.online) {
      consecutiveFailures++;
    } else {
      consecutiveFailures = 0;
    }

    // Only flip to offline display after DEBOUNCE_FAILURE_COUNT consecutive failures
    // to avoid flicker on transient network errors.
    if (result.online || consecutiveFailures >= DEBOUNCE_FAILURE_COUNT) {
      applyState(item, result);
    }
  };

  const scheduleInterval = () => {
    clearInterval(intervalHandle);
    intervalHandle = setInterval(() => void runCheck(), getHeartbeatIntervalMs());
  };

  // Initial check immediately, then start interval.
  void runCheck();
  scheduleInterval();

  // Re-schedule if the refresh interval setting changes.
  const configListener = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('ollama.localModelRefreshInterval')) {
      diagnostics.debug('[statusBar] refresh interval changed, rescheduling heartbeat');
      scheduleInterval();
    }
  });

  return {
    dispose: () => {
      clearInterval(intervalHandle);
      configListener.dispose();
      item.dispose();
    },
  };
}
