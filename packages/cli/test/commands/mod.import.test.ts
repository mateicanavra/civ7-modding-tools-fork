import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/git', () => ({
  importSubtree: vi.fn(),
}));

import ModImport from '../../src/commands/mod/import';
import { importSubtree } from '../../src/utils/git';

describe('mod import command', () => {
  beforeEach(() => vi.clearAllMocks());

  test('calls importSubtree with mods/<slug> prefix', async () => {
    await ModImport.run(['my-mod']);
    expect(importSubtree).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: 'mods/my-mod', slug: 'my-mod' }),
    );
  });
});
