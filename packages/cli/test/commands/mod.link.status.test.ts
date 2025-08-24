import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/git', () => ({
  findRemoteNameForSlug: vi.fn().mockResolvedValue('cfg-remote'),
  getRemotePushConfig: vi.fn(),
  logRemotePushConfig: vi.fn(),
}));

vi.mock('@civ7/plugin-mods', () => ({
  getModStatus: vi.fn().mockResolvedValue({ repoRoot: '/tmp', modsPrefix: 'mods/foo', remoteName: 'cfg-remote' }),
}));

import ModLinkStatus from '../../src/commands/mod/link/status';
import { getModStatus } from '@civ7/plugin-mods';

describe('mod link status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('invokes getModStatus for slug', async () => {
    await ModLinkStatus.run(['foo']);
    expect(getModStatus).toHaveBeenCalledWith({ slug: 'foo', branch: undefined, verbose: false });
  });
});
