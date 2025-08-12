import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@civ7/plugin-files', () => ({
  zipResources: vi.fn(async () => ({ outputPath: '/out.zip', uncompressedSizeBytes: 0, archiveSizeBytes: 0 })),
}));

vi.mock('@civ7/config', () => ({
  loadConfig: vi.fn(async () => ({ raw: { profiles: { default: {} } }, path: undefined })),
  resolveInstallDir: vi.fn(() => '/src'),
  resolveZipPath: vi.fn(() => '/out.zip'),
  findProjectRoot: vi.fn(() => '/project'),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<any>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

import Zip from '../../src/commands/zip';
import { zipResources } from '@civ7/plugin-files';

describe('zip command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('delegates to plugin-files zipResources', async () => {
    await Zip.run(['default']);
    expect(zipResources).toHaveBeenCalledWith({
      projectRoot: '/project',
      profile: 'default',
      srcDir: '/src',
      out: undefined,
      verbose: false,
      configPath: undefined,
    });
  });
});
