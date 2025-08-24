import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/git', () => ({
  configureRemote: vi.fn(),
  importSubtree: vi.fn(),
}));

import ModLinkImport from '../../src/commands/mod/link/import';
import { configureRemote, importSubtree } from '../../src/utils/git';

describe('mod link import command', () => {
  beforeEach(() => vi.clearAllMocks());

  test('configures remote then imports subtree', async () => {
    await ModLinkImport.run(['my-mod', '--remoteUrl', 'https://example.com/repo.git']);
    expect(configureRemote).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'my-mod',
        remoteUrl: 'https://example.com/repo.git',
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
