import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils', () => ({
  expandPath: (p: string) => p,
  findProjectRoot: vi.fn(() => '/project'),
  resolveRootFromConfigOrFlag: vi.fn(async () => '/root'),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  promises: {
    readFile: vi.fn(async () => '/root/a\n/root/b\n'),
    mkdir: vi.fn(async () => {}),
    copyFile: vi.fn(async () => {}),
  },
}));

import Slice from '../../src/commands/slice';
import * as fs from 'node:fs';
const copyFile = (fs.promises as any).copyFile as any;

describe('slice command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('copies files listed in manifest', async () => {
    await Slice.run(['manifest.txt']);
    expect(copyFile).toHaveBeenCalledTimes(2);
    expect(copyFile).toHaveBeenCalledWith('/root/a', expect.any(String));
    expect(copyFile).toHaveBeenCalledWith('/root/b', expect.any(String));
  });
});
