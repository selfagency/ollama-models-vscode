import * as vscode from 'vscode';

export const SETTINGS_NAMESPACE = 'opilot';
export const LEGACY_SETTINGS_NAMESPACE = 'ollama';

export const SUPPORTED_SETTING_KEYS = [
  'host',
  'localModelRefreshInterval',
  'libraryRefreshInterval',
  'streamLogs',
  'diagnostics.logLevel',
  'modelfilesPath',
  'completionModel',
  'enableInlineCompletions',
  'hideThinkingContent',
] as const;

type SupportedSettingKey = (typeof SUPPORTED_SETTING_KEYS)[number];

type LoggerLike = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  debug?: (message: string) => void;
};

export function getSetting<T>(key: SupportedSettingKey): T | undefined;
export function getSetting<T>(key: SupportedSettingKey, defaultValue: T): T;
export function getSetting<T>(key: SupportedSettingKey, defaultValue?: T): T | undefined {
  const primary = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE).get<T>(key);
  if (primary !== undefined) {
    return primary;
  }

  const legacy = vscode.workspace.getConfiguration(LEGACY_SETTINGS_NAMESPACE).get<T>(key);
  if (legacy !== undefined) {
    return legacy;
  }

  return defaultValue;
}

export function affectsSetting(event: vscode.ConfigurationChangeEvent, key: SupportedSettingKey): boolean {
  return (
    event.affectsConfiguration(`${SETTINGS_NAMESPACE}.${key}`) ||
    event.affectsConfiguration(`${LEGACY_SETTINGS_NAMESPACE}.${key}`)
  );
}

export async function migrateLegacySettings(logger?: LoggerLike): Promise<SupportedSettingKey[]> {
  const migrated: SupportedSettingKey[] = [];
  const opilotConfig = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
  const legacyConfig = vscode.workspace.getConfiguration(LEGACY_SETTINGS_NAMESPACE);

  for (const key of SUPPORTED_SETTING_KEYS) {
    try {
      const opilotInspect = opilotConfig.inspect<unknown>(key);
      const legacyInspect = legacyConfig.inspect<unknown>(key);

      if (!legacyInspect) {
        continue;
      }

      let didMigrate = false;

      if (legacyInspect.globalValue !== undefined && opilotInspect?.globalValue === undefined) {
        await opilotConfig.update(key, legacyInspect.globalValue, vscode.ConfigurationTarget.Global);
        didMigrate = true;
      }

      if (legacyInspect.workspaceValue !== undefined && opilotInspect?.workspaceValue === undefined) {
        await opilotConfig.update(key, legacyInspect.workspaceValue, vscode.ConfigurationTarget.Workspace);
        didMigrate = true;
      }

      if (legacyInspect.workspaceFolderValue !== undefined && opilotInspect?.workspaceFolderValue === undefined) {
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const folder of folders) {
          await vscode.workspace
            .getConfiguration(SETTINGS_NAMESPACE, folder.uri)
            .update(key, legacyInspect.workspaceFolderValue, vscode.ConfigurationTarget.WorkspaceFolder);
        }
        if (folders.length > 0) {
          didMigrate = true;
        }
      }

      if (didMigrate) {
        migrated.push(key);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger?.warn?.(`[settings] failed to migrate legacy key ${LEGACY_SETTINGS_NAMESPACE}.${key}: ${message}`);
    }
  }

  if (migrated.length > 0) {
    logger?.info?.(
      `[settings] migrated legacy settings (${LEGACY_SETTINGS_NAMESPACE}.* → ${SETTINGS_NAMESPACE}.*): ${migrated.join(', ')}`,
    );
  } else {
    logger?.debug?.('[settings] no legacy settings required migration');
  }

  return migrated;
}
