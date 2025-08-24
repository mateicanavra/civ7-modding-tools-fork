import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/git', () => ({
  resolveRemoteName: vi.fn().mockResolvedValue('cfg-remote'),
  getRemotePushConfig: vi.fn(),
  logRemotePushConfig: vi.fn(),
}));

vi.mock('@civ7/plugin-mods', () => ({
  getModStatus: vi.fn().mockResolvedValue({ repoRoot: '/tmp', modsPrefix: 'mods/foo' }),
}));

import ModStatus from '../../src/commands/mod/status';
import { resolveRemoteName } from '../../src/utils/git';
import { getModStatus } from '@civ7/plugin-mods';

describe('mod status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('resolves remote name from slug', async () => {
    await ModStatus.run(['foo']);
    expect(resolveRemoteName).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'foo', remoteName: undefined }),
    );
    expect(getModStatus).toHaveBeenCalledWith({
      slug: 'foo',
      remoteName: 'cfg-remote',
      branch: undefined,
      verbose: false,
    });
  });

  test('allows hidden remoteName override', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValueOnce('override');
    await ModStatus.run(['foo', '--remoteName', 'override']);
    expect(resolveRemoteName).toHaveBeenCalledWith(
      expect.objectContaining({ remoteName: 'override' }),
    );
  });
});
