import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('@civ7/plugin-git', () => ({
  parseGithubRepoSlugFromUrl: (url: string) => {
    const match = url.match(/github.com[:/](.+?)(?:\.git)?$/i);
    return match ? match[1] : null;
  },
  configureRemoteAndFetch: vi.fn().mockResolvedValue('added'),
  subtreeAddFromRemote: vi.fn().mockResolvedValue(undefined),
  subtreePushWithFetch: vi.fn().mockResolvedValue(undefined),
  subtreePullWithFetch: vi.fn().mockResolvedValue(undefined),
  getLocalConfig: vi.fn(),
  getRemotePushConfig: vi.fn().mockResolvedValue({}),
}));

import {
  inferRemoteNameFromUrl,
  isNonEmptyDir,
  importSubtree,
  pushSubtree,
  pullSubtree,
  resolveRemoteName,
  requireRemoteName,
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
} from '@civ7/plugin-git';

describe('git utilities', () => {
  describe('inferRemoteNameFromUrl', () => {
    it('normalizes repo names', () => {
      expect(inferRemoteNameFromUrl('git@github.com:User/My-Repo.git')).toBe('my-repo');
    });
  });

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
      vi.clearAllMocks();
    });

    it('importSubtree wires plugin-git helpers', async () => {
      await importSubtree({
        prefix: 'mods/foo',
        remoteName: 'origin',
        branch: 'main',
        remoteUrl: 'git@github.com:me/repo.git',
        logger,
      });
      expect(configureRemoteAndFetch).toHaveBeenCalledWith(
        'origin',
        'git@github.com:me/repo.git',
        { tags: true },
        { verbose: false },
      );
      expect(subtreeAddFromRemote).toHaveBeenCalledWith(
        'mods/foo',
        'origin',
        'main',
        { squash: false, autoUnshallow: false, allowDirty: false },
        { verbose: false },
      );
    });

    it('pushSubtree wires plugin-git helpers', async () => {
      await pushSubtree({ prefix: 'mods/foo', remoteName: 'origin', branch: 'main', logger });
      expect(subtreePushWithFetch).toHaveBeenCalledWith(
        'mods/foo',
        'origin',
        'main',
        { allowDirty: false, autoUnshallow: false, autoFastForwardTrunk: false, trunkOverride: undefined },
        { verbose: false },
      );
    });

    it('pullSubtree wires plugin-git helpers', async () => {
      await pullSubtree({ prefix: 'mods/foo', remoteName: 'origin', branch: 'main', logger });
      expect(subtreePullWithFetch).toHaveBeenCalledWith(
        'mods/foo',
        'origin',
        'main',
        { squash: false, allowDirty: false, autoUnshallow: false },
        { verbose: false },
      );
    });

    it('importSubtree blocks non-empty dirs without allowDirty', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-util-import-'));
      fs.writeFileSync(path.join(dir, 'x.txt'), 'x');
      await expect(
        importSubtree({ prefix: dir, remoteName: 'r', branch: 'main', logger }),
      ).rejects.toThrow(/already exists/);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  describe('configuration helpers', () => {
    const logger = { log: vi.fn() };
    beforeEach(() => {
      vi.resetAllMocks();
      logger.log.mockReset();
    });

    it('resolveRemoteName reads from config', async () => {
      vi.mocked(getLocalConfig).mockResolvedValueOnce('saved-remote');
      await expect(
        resolveRemoteName({ domain: 'mod', slug: 'slug', logger, verbose: true }),
      ).resolves.toBe('saved-remote');
      expect(getLocalConfig).toHaveBeenCalledWith('civ7.mod.slug.remoteName', { verbose: true });
      expect(logger.log).toHaveBeenCalledWith('Using remote from config: saved-remote');
    });

    it('requireRemoteName throws when unresolved', async () => {
      vi.mocked(getLocalConfig).mockResolvedValueOnce(undefined);
      await expect(
        requireRemoteName({ domain: 'mod', logger, verbose: true }),
      ).rejects.toThrow(/Unable to determine remote name/);
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
      });
      await configureRemote({
        remoteName: 'origin',
        remoteUrl: 'git@github.com:me/repo.git',
        branch: 'main',
        logger,
      });
      expect(configureRemoteAndFetch).toHaveBeenCalledWith(
        'origin',
        'git@github.com:me/repo.git',
        { tags: true },
        { verbose: false },
      );
      expect(getRemotePushConfig).toHaveBeenCalledWith('origin', { verbose: false });
      expect(logger.log).toHaveBeenCalledWith('Push config:');
      expect(logger.log).toHaveBeenCalledWith('  trunk: (auto)');
    });
  });
});
