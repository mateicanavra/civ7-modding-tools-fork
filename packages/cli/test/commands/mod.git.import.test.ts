import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/git', () => ({
  configureRemote: vi.fn(),
  importSubtree: vi.fn(),
}));

import ModGitImport from '../../src/commands/mod/git/import';
import { configureRemote, importSubtree } from '../../src/utils/git';

describe('mod git import command', () => {
  beforeEach(() => vi.clearAllMocks());

  test('configures remote then imports subtree', async () => {
    await ModGitImport.run(['my-mod', '--repoUrl', 'https://example.com/repo.git']);
    expect(configureRemote).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'my-mod',
        repoUrl: 'https://example.com/repo.git',
      }),
    );
    expect(importSubtree).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: 'mods/my-mod',
        slug: 'my-mod',
      }),
    );
  });
});
