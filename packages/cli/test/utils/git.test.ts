import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('@civ7/plugin-git', () => ({
  configureRemoteAndFetch: vi.fn().mockResolvedValue('added'),
  subtreeAddFromRemote: vi.fn().mockResolvedValue(undefined),
  subtreePushWithFetch: vi.fn().mockResolvedValue(undefined),
  subtreePullWithFetch: vi.fn().mockResolvedValue(undefined),
  getLocalConfig: vi.fn(),
  getRemotePushConfig: vi.fn().mockResolvedValue({}),
  getRemoteUrl: vi.fn(),
  setLocalConfig: vi.fn(),
}));

import {
  findRemoteNameForSlug,
  requireRemoteNameForSlug,
  isNonEmptyDir,
  importSubtree,
  pushSubtree,
  pullSubtree,
  resolveBranch,
  requireBranch,
  configureRemote,
} from '../../src/utils/git';
import {
  configureRemoteAndFetch,
  subtreeAddFromRemote,
  subtreePushWithFetch,
  subtreePullWithFetch,
  getLocalConfig,
  getRemotePushConfig,
  getRemoteUrl,
  setLocalConfig,
} from '@civ7/plugin-git';

describe('git utilities', () => {
  describe('isNonEmptyDir', () => {
    it('returns false for non-existent path', () => {
      expect(isNonEmptyDir(path.join(os.tmpdir(), 'no-such-dir'))).toBe(false);
    });

    it('detects empty directories', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-util-empty-'));
      try {
        expect(isNonEmptyDir(dir)).toBe(false);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('detects directories with files', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-util-non-empty-'));
      try {
        fs.writeFileSync(path.join(dir, 'file.txt'), 'hi');
        expect(isNonEmptyDir(dir)).toBe(true);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('subtree helpers', () => {
    const logger = { log: vi.fn() };
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('importSubtree wires plugin-git helpers', async () => {
      vi.mocked(getLocalConfig).mockImplementation(async (key) => {
        if (key === 'civ7.mod.foo.remoteName') return 'foo';
        if (key === 'civ7.mod.foo.repoUrl') return 'git@github.com:me/repo.git';
        return undefined;
      });
      vi.mocked(getRemoteUrl).mockResolvedValueOnce('git@github.com:me/repo.git');
      await importSubtree({
        domain: 'mod',
        slug: 'foo',
        prefix: 'mods/foo',
        branch: 'main',
        logger,
      });
      expect(configureRemoteAndFetch).toHaveBeenCalledWith(
        'foo',
        undefined,
        { tags: true },
        { verbose: false },
      );
      expect(subtreeAddFromRemote).toHaveBeenCalledWith(
        'mods/foo',
        'foo',
        'main',
        { squash: false, autoUnshallow: false, allowDirty: false },
        { verbose: false },
      );
    });

    it('pushSubtree wires plugin-git helpers', async () => {
      vi.mocked(getLocalConfig).mockImplementation(async (key) => {
        if (key === 'civ7.mod.foo.remoteName') return 'foo';
        if (key === 'civ7.mod.foo.repoUrl') return 'git@github.com:me/repo.git';
        return undefined;
      });
      vi.mocked(getRemoteUrl).mockResolvedValueOnce('git@github.com:me/repo.git');
      await pushSubtree({
        domain: 'mod',
        slug: 'foo',
        prefix: 'mods/foo',
        branch: 'main',
        logger,
      });
      expect(subtreePushWithFetch).toHaveBeenCalledWith(
        'mods/foo',
        'foo',
        'main',
        { allowDirty: false, autoUnshallow: false, autoFastForwardTrunk: false, trunkOverride: undefined },
        { verbose: false },
      );
    });

    it('pullSubtree wires plugin-git helpers', async () => {
      vi.mocked(getLocalConfig).mockImplementation(async (key) => {
        if (key === 'civ7.mod.foo.remoteName') return 'foo';
        if (key === 'civ7.mod.foo.repoUrl') return 'git@github.com:me/repo.git';
        return undefined;
      });
      vi.mocked(getRemoteUrl).mockResolvedValueOnce('git@github.com:me/repo.git');
      await pullSubtree({ domain: 'mod', slug: 'foo', prefix: 'mods/foo', branch: 'main', logger });
      expect(subtreePullWithFetch).toHaveBeenCalledWith(
        'mods/foo',
        'foo',
        'main',
        { squash: false, allowDirty: false, autoUnshallow: false },
        { verbose: false },
      );
    });

    it('importSubtree blocks non-empty dirs without allowDirty', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-util-import-'));
      fs.writeFileSync(path.join(dir, 'x.txt'), 'x');
      vi.mocked(getLocalConfig).mockImplementation(async (key) => {
        if (key === 'civ7.mod.foo.remoteName') return 'foo';
        if (key === 'civ7.mod.foo.repoUrl') return 'git@github.com:me/repo.git';
        return undefined;
      });
      vi.mocked(getRemoteUrl).mockResolvedValueOnce('git@github.com:me/repo.git');
      await expect(
        importSubtree({ domain: 'mod', slug: 'foo', prefix: dir, branch: 'main', logger }),
      ).rejects.toThrow(/already exists/);
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it('pushSubtree resolves remote and branch from config when omitted', async () => {
      vi.mocked(getLocalConfig).mockImplementation(async (key) => {
        if (key === 'civ7.mod.foo.remoteName') return 'saved-remote';
        if (key === 'civ7.mod.foo.repoUrl') return 'git@github.com:me/repo.git';
        if (key === 'civ7.mod.foo.branch') return 'main';
        return undefined;
      });
      vi.mocked(getRemoteUrl).mockResolvedValueOnce('git@github.com:me/repo.git');
      await pushSubtree({ domain: 'mod', slug: 'foo', prefix: 'mods/foo', logger });
      expect(subtreePushWithFetch).toHaveBeenCalledWith(
        'mods/foo',
        'saved-remote',
        'main',
        { allowDirty: false, autoUnshallow: false, autoFastForwardTrunk: false, trunkOverride: undefined },
        { verbose: false },
      );
    });
  });

  describe('configuration helpers', () => {
    const logger = { log: vi.fn() };
    beforeEach(() => {
      vi.resetAllMocks();
      logger.log.mockReset();
    });

    it('findRemoteNameForSlug reads from config', async () => {
      vi.mocked(getLocalConfig).mockResolvedValueOnce('saved-remote');
      await expect(findRemoteNameForSlug('mod', 'slug')).resolves.toBe('saved-remote');
      expect(getLocalConfig).toHaveBeenCalledWith('civ7.mod.slug.remoteName');
    });

    it('requireRemoteNameForSlug throws when missing', async () => {
      vi.mocked(getLocalConfig).mockResolvedValueOnce(undefined);
      await expect(requireRemoteNameForSlug('mod', 'slug')).rejects.toThrow(/No remote configured/);
    });

    it('resolveBranch reads from config', async () => {
      vi.mocked(getLocalConfig).mockResolvedValueOnce('main');
      await expect(
        resolveBranch({ domain: 'mod', slug: 'slug', logger, verbose: true }),
      ).resolves.toBe('main');
      expect(getLocalConfig).toHaveBeenCalledWith('civ7.mod.slug.branch', { verbose: true });
      expect(logger.log).toHaveBeenCalledWith('Using branch from config: main');
    });

    it('requireBranch throws when unresolved', async () => {
      vi.mocked(getLocalConfig).mockResolvedValueOnce(undefined);
      await expect(
        requireBranch({ domain: 'mod', slug: 'slug', logger, verbose: true }),
      ).rejects.toThrow(/No branch specified/);
    });

    it('configureRemote logs push config', async () => {
      vi.mocked(getRemotePushConfig).mockResolvedValueOnce({
        trunk: undefined,
        autoFastForwardTrunk: false,
        createPrOnFfBlock: false,
        prDraft: false,
        prAutoMerge: true,
        prMergeStrategy: 'rebase',
        url: 'git@github.com:me/repo.git',
      });
      await configureRemote({
        domain: 'mod',
        slug: 'foo',
        repoUrl: 'git@github.com:me/repo.git',
        branch: 'main',
        logger,
      });
      expect(setLocalConfig).toHaveBeenCalledWith('civ7.mod.foo.remoteName', 'foo', { verbose: false });
      expect(setLocalConfig).toHaveBeenCalledWith('civ7.mod.foo.repoUrl', 'git@github.com:me/repo.git', { verbose: false });
      expect(setLocalConfig).toHaveBeenCalledWith('civ7.mod.foo.branch', 'main', { verbose: false });
      expect(configureRemoteAndFetch).toHaveBeenCalledWith(
        'foo',
        'git@github.com:me/repo.git',
        { tags: true },
        { verbose: false },
      );
      expect(getRemotePushConfig).toHaveBeenCalledWith('foo', { verbose: false });
      expect(logger.log).toHaveBeenCalledWith('Push config:');
      expect(logger.log).toHaveBeenCalledWith('  trunk: (auto)');
    });
  });
});
