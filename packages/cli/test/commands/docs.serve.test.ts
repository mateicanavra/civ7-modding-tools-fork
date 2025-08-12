import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@civ7/plugin-files', () => ({
  unzipResources: vi.fn(async () => {}),
}));

vi.mock('@civ7/config', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    findProjectRoot: vi.fn(() => '/project'),
  };
});

vi.mock('node:fs', () => ({
  existsSync: vi.fn((p: string) => p.includes('/apps/docs')),
  promises: {
    mkdir: vi.fn(async () => {}),
    stat: vi.fn(async (p: string) => ({ isFile: () => true, isDirectory: () => false })),
    rm: vi.fn(async () => {}),
    cp: vi.fn(async () => {}),
    copyFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => Buffer.from('index')),
  },
}));

import DocsServe from '../../src/commands/docs/serve';
import { unzipResources } from '@civ7/plugin-files';
import * as fs from 'node:fs';
declare global { var Bun: any; }

describe('docs serve command', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.CI = '1';
    // Minimal Bun mock for bunx mint
    (globalThis as any).Bun = {
      spawn: vi.fn(() => ({
        kill: vi.fn(),
        exited: Promise.resolve(0),
      })),
    };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  test('serves docs and syncs resources by default', async () => {
    await DocsServe.run([]);
    expect(fs.existsSync).toHaveBeenCalled();
    expect(unzipResources).toHaveBeenCalled();
    expect((globalThis as any).Bun.spawn).toHaveBeenCalled();
    const call = (globalThis as any).Bun.spawn.mock.calls[0][0];
    expect(call.cmd[0]).toBe('bunx');
    expect(call.cmd.includes('mint')).toBe(true);
  });

  test('supports --engine docsify', async () => {
    await DocsServe.run(['--engine', 'docsify']);
    const call = (globalThis as any).Bun.spawn.mock.calls[0][0];
    expect(call.cmd.includes('docsify-cli')).toBe(true);
  });

  test('supports --skipSync to avoid syncing', async () => {
    await DocsServe.run(['--skipSync']);
    expect(unzipResources).not.toHaveBeenCalled();
    expect((globalThis as any).Bun.spawn).toHaveBeenCalled();
  });

  test('errors when siteDir missing', async () => {
    (fs.existsSync as any).mockImplementationOnce(() => false);
    await expect(DocsServe.run(['--siteDir', '/missing'])).rejects.toThrow();
  });
});


