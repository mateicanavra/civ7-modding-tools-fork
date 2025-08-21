import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@civ7/plugin-mods', () => ({
  listMods: vi.fn(() => ['A', 'B']),
  resolveModsDir: vi.fn(() => ({ modsDir: '/Mods', platform: 'darwin' })),
}));

import ModList from '../../src/commands/mod/list';
import { listMods } from '@civ7/plugin-mods';

describe('mod list command', () => {
  beforeEach(() => vi.clearAllMocks());

  test('lists mods from default dir', async () => {
    await ModList.run([]);
    expect(listMods).toHaveBeenCalledWith('/Mods');
  });
});


