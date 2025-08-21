import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@civ7/plugin-mods', () => ({
  deployMod: vi.fn((opts: any) => ({ targetDir: `${opts.modsDir}/${opts.modId}`, modsDir: opts.modsDir, filesCopied: 1 })),
  resolveModsDir: vi.fn(() => ({ modsDir: '/Mods', platform: 'darwin' })),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<any>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

import ModDeploy from '../../src/commands/mod/deploy';
import { deployMod } from '@civ7/plugin-mods';

describe('mod deploy command', () => {
  beforeEach(() => vi.clearAllMocks());

  test('calls deployMod with resolved paths', async () => {
    await ModDeploy.run(['--input', './dist', '--id', 'my_mod']);
    expect(deployMod).toHaveBeenCalledWith({ inputDir: expect.stringContaining('/dist'), modId: 'my_mod', modsDir: '/Mods' });
  });
});


