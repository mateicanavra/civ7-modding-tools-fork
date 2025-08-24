import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/git', () => ({
  findRemoteNameForSlug: vi.fn().mockResolvedValue('cfg-remote'),
  getRemotePushConfig: vi.fn(),
  logRemotePushConfig: vi.fn(),
}));

vi.mock('@civ7/plugin-mods', () => ({
  getModStatus: vi.fn().mockResolvedValue({ repoRoot: '/tmp', modsPrefix: 'mods/foo', remoteName: 'cfg-remote' }),
}));

import ModStatus from '../../src/commands/mod/status';
import { getModStatus } from '@civ7/plugin-mods';

describe('mod status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('invokes getModStatus for slug', async () => {
    await ModStatus.run(['foo']);
    expect(getModStatus).toHaveBeenCalledWith({ slug: 'foo', branch: undefined, verbose: false });
  });
});
