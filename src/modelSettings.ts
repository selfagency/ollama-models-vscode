import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Minimal context shape required by the model settings helpers.
 * Compatible with `vscode.ExtensionContext` but avoids importing the full type.
 */
export interface ModelSettingsContext {
  globalStorageUri: { fsPath: string };
}

/**
 * Per-model generation options that can be persisted per model ID.
 * All fields are optional; only set values override Ollama defaults.
 */
export interface ModelOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_ctx?: number;
  num_predict?: number;
  think?: boolean;
  think_budget?: number;
}

/**
 * Root shape of the persisted model settings file.
 * Keys are model IDs (e.g. "llama3.2", "mistral:7b").
 */
export type ModelSettingsMap = Record<string, ModelOptions>;

/**
 * Returns the absolute path to the model settings JSON file.
 * Stored alongside the extension's global storage directory.
 */
export function getModelSettingsFilePath(context: ModelSettingsContext): string {
  return join(context.globalStorageUri.fsPath, 'modelSettings.json');
}

/**
 * Sanitize a raw (possibly user-supplied) ModelOptions object.
 * - Drops keys with the wrong type.
 * - Clamps/coerces numbers to finite values.
 * Returns a clean ModelOptions (may be empty if all fields are invalid).
 */
export function sanitizeModelOptions(raw: unknown): ModelOptions {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const result: ModelOptions = {};

  // Float fields
  for (const key of ['temperature', 'top_p'] as const) {
    const val = obj[key];
    if (typeof val === 'number' && isFinite(val)) {
      result[key] = val;
    }
  }

  // Integer fields
  for (const key of ['top_k', 'num_ctx', 'num_predict', 'think_budget'] as const) {
    const val = obj[key];
    if (typeof val === 'number' && isFinite(val)) {
      result[key] = Math.trunc(val);
    }
  }

  // Boolean fields
  if (typeof obj['think'] === 'boolean') {
    result.think = obj['think'];
  }

  return result;
}

/**
 * Load model settings from storage. Returns an empty map if the file does not
 * exist or contains invalid JSON / unexpected structure.
 */
export async function loadModelSettings(context: ModelSettingsContext): Promise<ModelSettingsMap> {
  const filePath = getModelSettingsFilePath(context);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  const result: ModelSettingsMap = {};
  for (const [modelId, opts] of Object.entries(parsed as Record<string, unknown>)) {
    result[modelId] = sanitizeModelOptions(opts);
  }
  return result;
}

/**
 * Persist the full model settings map to storage.
 * Creates the directory if it does not yet exist.
 */
export async function saveModelSettings(context: ModelSettingsContext, settings: ModelSettingsMap): Promise<void> {
  const filePath = getModelSettingsFilePath(context);
  await mkdir(dirname(filePath), { recursive: true });

  // Sanitize each entry before writing.
  const sanitized: ModelSettingsMap = {};
  for (const [modelId, opts] of Object.entries(settings)) {
    sanitized[modelId] = sanitizeModelOptions(opts);
  }

  await writeFile(filePath, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf8');
}

/**
 * Returns the persisted ModelOptions for `modelId`, or an empty object if no
 * settings have been saved for that model.
 */
export async function getModelOptionsForModel(context: ModelSettingsContext, modelId: string): Promise<ModelOptions> {
  const settings = await loadModelSettings(context);
  return settings[modelId] ?? {};
}
