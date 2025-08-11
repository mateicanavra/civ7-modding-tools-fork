import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';

// For unit tests we focus on error handling (no system deps)

// Mock @civ7/config to return deterministic paths
vi.mock('@civ7/config', async () => {
  return {
    findProjectRoot: () => path.resolve(process.cwd()),
    loadConfig: async () => ({ raw: {}, path: null }),
    resolveInstallDir: () => path.resolve('/tmp/src'),
    resolveZipPath: () => path.resolve('/tmp/out/archive.zip'),
    resolveUnzipDir: () => path.resolve('/tmp/out/resources'),
  };
});

// Mock fs for existence checks
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<any>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  };
});

import { zipResources, unzipResources } from '../src/index';

describe('@civ7/plugin-files error handling', () => {
  it('unzipResources throws when archive is missing', async () => {
    await expect(unzipResources({})).rejects.toThrow(/Source zip not found/);
  });

  it('zipResources throws when source dir is missing', async () => {
    await expect(zipResources({})).rejects.toThrow(/Source directory not found/);
  });
});


