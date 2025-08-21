import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveModsDir, listMods, deployMod } from '../src/index';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<any>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => [
      { name: 'modA', isDirectory: () => true },
      { name: 'modB', isDirectory: () => true },
      { name: 'README.md', isDirectory: () => false }
    ]),
    statSync: vi.fn(() => ({ isDirectory: () => true })),
    copyFileSync: vi.fn(),
    readlinkSync: vi.fn(() => ''),
    symlinkSync: vi.fn(),
  };
});

describe('@civ7/plugin-mods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('resolveModsDir returns darwin path on mac', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const { modsDir } = resolveModsDir();
    expect(modsDir.includes(path.join('Library', 'Application Support', 'Civilization VII', 'Mods'))).toBe(true);
  });

  test('resolveModsDir returns Documents/My Games path on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const prev = process.env.USERPROFILE;
    process.env.USERPROFILE = 'C:/Users/TestUser';
    const { modsDir } = resolveModsDir();
    expect(modsDir).toBe(path.join('C:/Users/TestUser', 'Documents', 'My Games', "Sid Meier's Civilization VII", 'Mods'));
    process.env.USERPROFILE = prev;
  });

  test('listMods filters to directories', () => {
    const mods = listMods('/mods');
    expect(mods).toEqual(['modA', 'modB']);
  });

  test('deployMod validates input and id then copies', () => {
    const res = deployMod({ inputDir: '/in', modId: 'my_mod', modsDir: '/mods' });
    expect(res.targetDir).toBe('/mods/my_mod');
    expect(res.modsDir).toBe('/mods');
  });
});


