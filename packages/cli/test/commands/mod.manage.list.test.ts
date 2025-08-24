import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@civ7/plugin-mods', () => ({
  listMods: vi.fn(() => ['A', 'B']),
  resolveModsDir: vi.fn(() => ({ modsDir: '/Mods', platform: 'darwin' })),
}));

import ModManageList from '../../src/commands/mod/manage/list';
import { listMods } from '@civ7/plugin-mods';

describe('mod manage list command', () => {
  beforeEach(() => vi.clearAllMocks());

  test('lists mods from default dir', async () => {
    await ModManageList.run([]);
    expect(listMods).toHaveBeenCalledWith('/Mods');
  });
});


