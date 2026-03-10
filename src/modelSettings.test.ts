import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// node:fs/promises mock — set up before importing the module under test
// ---------------------------------------------------------------------------

const { mockReadFile, mockWriteFile, mockMkdir } = vi.hoisted(() => ({
  mockReadFile: vi.fn<(path: string, encoding: string) => Promise<string>>(),
  mockWriteFile: vi.fn<(path: string, data: string, encoding: string) => Promise<void>>(),
  mockMkdir: vi.fn<(path: string, opts: { recursive: boolean }) => Promise<void>>(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

// ---------------------------------------------------------------------------
// Module under test (imported after the mock is in place)
// ---------------------------------------------------------------------------

import {
  getModelOptionsForModel,
  getModelSettingsFilePath,
  loadModelSettings,
  sanitizeModelOptions,
  saveModelSettings,
} from './modelSettings.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(fsPath = '/fake/global/storage/selfagency.ollama') {
  return { globalStorageUri: { fsPath } };
}

// ---------------------------------------------------------------------------
// getModelSettingsFilePath
// ---------------------------------------------------------------------------

describe('getModelSettingsFilePath', () => {
  it('returns the correct path within globalStorageUri', () => {
    const ctx = makeContext('/my/storage');
    expect(getModelSettingsFilePath(ctx)).toBe('/my/storage/modelSettings.json');
  });
});

// ---------------------------------------------------------------------------
// sanitizeModelOptions
// ---------------------------------------------------------------------------

describe('sanitizeModelOptions', () => {
  it('returns empty object for null/undefined/non-object input', () => {
    expect(sanitizeModelOptions(null)).toEqual({});
    expect(sanitizeModelOptions(undefined)).toEqual({});
    expect(sanitizeModelOptions('string')).toEqual({});
    expect(sanitizeModelOptions(42)).toEqual({});
    expect(sanitizeModelOptions([])).toEqual({});
  });

  it('passes through valid float fields', () => {
    expect(sanitizeModelOptions({ temperature: 0.7, top_p: 0.9 })).toEqual({ temperature: 0.7, top_p: 0.9 });
  });

  it('passes through valid integer fields (truncating floats)', () => {
    expect(sanitizeModelOptions({ top_k: 40, num_ctx: 4096, num_predict: 100, think_budget: 512 })).toEqual({
      top_k: 40,
      num_ctx: 4096,
      num_predict: 100,
      think_budget: 512,
    });
    expect(sanitizeModelOptions({ num_ctx: 2048.9 })).toEqual({ num_ctx: 2048 });
  });

  it('passes through boolean think field', () => {
    expect(sanitizeModelOptions({ think: true })).toEqual({ think: true });
    expect(sanitizeModelOptions({ think: false })).toEqual({ think: false });
  });

  it('drops fields with wrong types', () => {
    expect(
      sanitizeModelOptions({
        temperature: 'hot',
        top_p: null,
        top_k: '40',
        num_ctx: true,
        think: 1,
      }),
    ).toEqual({});
  });

  it('drops Infinity and NaN for numeric fields', () => {
    expect(sanitizeModelOptions({ temperature: Infinity, top_k: NaN })).toEqual({});
  });

  it('ignores unknown keys', () => {
    const result = sanitizeModelOptions({ temperature: 0.5, unknown_key: 'value' });
    expect(result).toEqual({ temperature: 0.5 });
    expect('unknown_key' in result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loadModelSettings
// ---------------------------------------------------------------------------

describe('loadModelSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty map when file does not exist (ENOENT)', async () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mockReadFile.mockRejectedValue(err);
    expect(await loadModelSettings(makeContext())).toEqual({});
  });

  it('returns empty map when file contains malformed JSON', async () => {
    mockReadFile.mockResolvedValue('not valid json{{{');
    expect(await loadModelSettings(makeContext())).toEqual({});
  });

  it('returns empty map when JSON root is not an object', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify([{ model: 'llama3.2' }]));
    expect(await loadModelSettings(makeContext())).toEqual({});

    mockReadFile.mockResolvedValue('"just a string"');
    expect(await loadModelSettings(makeContext())).toEqual({});

    mockReadFile.mockResolvedValue('42');
    expect(await loadModelSettings(makeContext())).toEqual({});
  });

  it('loads and sanitizes a well-formed settings file', async () => {
    const stored = {
      'llama3.2': { temperature: 0.8, num_ctx: 4096, think: true },
      'mistral:7b': { top_p: 0.95, top_k: 50 },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(stored));

    const result = await loadModelSettings(makeContext());
    expect(result['llama3.2']).toEqual({ temperature: 0.8, num_ctx: 4096, think: true });
    expect(result['mistral:7b']).toEqual({ top_p: 0.95, top_k: 50 });
  });

  it('sanitizes invalid option values on load', async () => {
    const stored = {
      'llama3.2': { temperature: 'hot', num_ctx: 4096, think: 'yes' },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(stored));

    const result = await loadModelSettings(makeContext());
    expect(result['llama3.2']).toEqual({ num_ctx: 4096 });
  });
});

// ---------------------------------------------------------------------------
// saveModelSettings
// ---------------------------------------------------------------------------

describe('saveModelSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates the storage directory before writing', async () => {
    const ctx = makeContext('/my/storage');
    await saveModelSettings(ctx, {});
    expect(mockMkdir).toHaveBeenCalledWith('/my/storage', { recursive: true });
  });

  it('writes sanitized JSON to the correct path', async () => {
    const ctx = makeContext('/my/storage');
    const settings = { 'llama3.2': { temperature: 0.7, num_ctx: 4096 } };
    await saveModelSettings(ctx, settings);

    expect(mockWriteFile).toHaveBeenCalledWith(
      '/my/storage/modelSettings.json',
      expect.stringContaining('"llama3.2"'),
      'utf8',
    );
  });

  it('sanitizes invalid values before writing', async () => {
    const ctx = makeContext('/my/storage');
    const settings = { 'llama3.2': { temperature: 'hot' as unknown as number, num_ctx: 4096 } };
    await saveModelSettings(ctx, settings);

    const written = mockWriteFile.mock.calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed['llama3.2']).toEqual({ num_ctx: 4096 });
    expect('temperature' in parsed['llama3.2']).toBe(false);
  });

  it('roundtrips save then load', async () => {
    const ctx = makeContext('/my/storage');
    const settings = {
      'llama3.2': { temperature: 0.8, num_ctx: 4096, think: true },
      'mistral:7b': { top_p: 0.95 },
    };

    let stored = '';
    mockWriteFile.mockImplementation(async (_p, data) => {
      stored = data as string;
    });
    mockReadFile.mockImplementation(async () => stored);

    await saveModelSettings(ctx, settings);
    const loaded = await loadModelSettings(ctx);

    expect(loaded['llama3.2']).toEqual({ temperature: 0.8, num_ctx: 4096, think: true });
    expect(loaded['mistral:7b']).toEqual({ top_p: 0.95 });
  });
});

// ---------------------------------------------------------------------------
// getModelOptionsForModel
// ---------------------------------------------------------------------------

describe('getModelOptionsForModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns options for a known model', async () => {
    const stored = { 'llama3.2': { temperature: 0.5, num_ctx: 2048 } };
    mockReadFile.mockResolvedValue(JSON.stringify(stored));

    const opts = await getModelOptionsForModel(makeContext(), 'llama3.2');
    expect(opts).toEqual({ temperature: 0.5, num_ctx: 2048 });
  });

  it('returns empty object for an unknown model', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ 'llama3.2': { temperature: 0.5 } }));

    const opts = await getModelOptionsForModel(makeContext(), 'unknown-model');
    expect(opts).toEqual({});
  });

  it('returns empty object when settings file is missing', async () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mockReadFile.mockRejectedValue(err);

    const opts = await getModelOptionsForModel(makeContext(), 'llama3.2');
    expect(opts).toEqual({});
  });
});
