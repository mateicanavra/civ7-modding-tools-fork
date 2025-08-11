import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as fssync from 'node:fs';
import { promises as fs } from 'node:fs';
import type * as os from 'node:os';

vi.mock('node:os', () => ({
  homedir: vi.fn(),
  platform: vi.fn(),
}));

import {
  DEFAULT_OUTPUT_BASE_DIR,
  DEFAULT_ZIP_DIR,
  DEFAULT_UNZIP_DIR,
  DEFAULT_GRAPH_DIR,
  DEFAULT_ARCHIVE_NAME,
  DEFAULT_INSTALL_DIR_DARWIN,
  DEFAULT_INSTALL_DIR_WIN32,
  expandPath,
  findProjectRoot,
  loadConfig,
  resolveInstallDir,
  resolveZipPath,
  resolveUnzipDir,
  resolveGraphOutDir,
} from '@civ7/config';
import { resolveRootFromConfigOrFlag } from '../../src/utils/resolver';

vi.mock('node:fs', async () => {
  const originalFs = await vi.importActual('node:fs');
  return {
    ...originalFs,
    existsSync: vi.fn(),
    promises: {
        readFile: vi.fn(),
    },
  };
});

const mockedFs = vi.mocked(fssync);
const mockedFsPromises = vi.mocked(fs);
const mockedOs = vi.mocked(await import('node:os'));

describe('CLI Resolver Utilities', () => {
  const projectRoot = '/fake/project';
  const homeDir = '/fake/home';

  beforeEach(() => {
    mockedOs.homedir.mockReturnValue(homeDir);
    vi.spyOn(process, 'cwd').mockReturnValue(path.join(projectRoot, 'apps', 'cli'));
    mockedFs.existsSync.mockImplementation((p) => String(p).endsWith('pnpm-workspace.yaml'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveInstallDir', () => {
    it('should prioritize the install flag', () => {
      expect(resolveInstallDir({}, 'flag/path')).toBe('flag/path');
    });
    it('should use inputs.installDir from config', () => {
      expect(resolveInstallDir({ inputs: { installDir: 'config/path' } })).toBe('config/path');
    });
    it('should fall back to legacy src_path', () => {
        expect(resolveInstallDir({ src_path: 'legacy/path' })).toBe('legacy/path');
    });
    it('should use OS defaults', () => {
      mockedOs.platform.mockReturnValue('darwin');
      expect(resolveInstallDir({})).toBe(expandPath(DEFAULT_INSTALL_DIR_DARWIN));
    });
  });

  const opts = { projectRoot };

  describe('Output Path Resolvers', () => {
    const globalConfig = {
      outputs: {
        baseDir: 'global/out',
        zip: { dir: 'archives', name: 'global.zip' },
        unzip: { dir: 'resources' },
        graph: { dir: 'graphs' },
      },
      profiles: {
        'docs-profile': {
          outputs: {
            baseDir: 'docs/dist',
            zip: { dir: '', name: 'docs.zip' },
            unzip: { dir: 'assets' },
          },
        },
        'partial-override': {
            outputs: {
                zip: { name: 'partial.zip' },
            }
        }
      },
    };

    // resolveZipPath
    it('resolveZipPath: should use argument first', () => {
      const result = resolveZipPath(opts, globalConfig, 'arg.zip');
      expect(result).toBe(path.resolve(projectRoot, 'arg.zip'));
    });
    it('resolveZipPath: should use full profile override', () => {
      const result = resolveZipPath({ ...opts, profile: 'docs-profile' }, globalConfig);
      expect(result).toBe(path.resolve(projectRoot, 'docs/dist', 'docs.zip'));
    });
    it('resolveZipPath: should use partial profile override and inherit from global', () => {
        const result = resolveZipPath({ ...opts, profile: 'partial-override' }, globalConfig);
        expect(result).toBe(path.resolve(projectRoot, 'global/out/archives', 'partial.zip'));
    });
    it('resolveZipPath: should use global config when no profile matches', () => {
      const result = resolveZipPath({ ...opts, profile: 'no-such-profile' }, globalConfig);
      expect(result).toBe(path.resolve(projectRoot, 'global/out/archives', 'global.zip'));
    });
    it('resolveZipPath: should use defaults when no config is provided', () => {
      const result = resolveZipPath(opts, {});
      expect(result).toBe(path.resolve(projectRoot, DEFAULT_OUTPUT_BASE_DIR, DEFAULT_ZIP_DIR, DEFAULT_ARCHIVE_NAME));
    });

    // resolveUnzipDir
    it('resolveUnzipDir: should use argument first', () => {
        const result = resolveUnzipDir(opts, globalConfig, 'arg/dir');
        expect(result).toBe(path.resolve(projectRoot, 'arg/dir'));
    });
    it('resolveUnzipDir: should use profile override', () => {
        const result = resolveUnzipDir({ ...opts, profile: 'docs-profile' }, globalConfig);
        expect(result).toBe(path.resolve(projectRoot, 'docs/dist/assets'));
    });
    it('resolveUnzipDir: should use global when profile does not override', () => {
        const result = resolveUnzipDir({ ...opts, profile: 'partial-override' }, globalConfig);
        expect(result).toBe(path.resolve(projectRoot, 'global/out/resources'));
    });
    it('resolveUnzipDir: should use defaults when no config is provided', () => {
        const result = resolveUnzipDir(opts, {});
        expect(result).toBe(path.resolve(projectRoot, DEFAULT_OUTPUT_BASE_DIR, DEFAULT_UNZIP_DIR));
    });

    // resolveGraphOutDir
    it('resolveGraphOutDir: should use argument first', () => {
        const result = resolveGraphOutDir(opts, globalConfig, 'SEED', 'arg/dir');
        expect(result).toBe(path.resolve(projectRoot, 'arg/dir'));
    });
    it('resolveGraphOutDir: should use global config', () => {
        const result = resolveGraphOutDir(opts, globalConfig, 'SEED');
        expect(result).toBe(path.resolve(projectRoot, 'global/out/graphs/SEED'));
    });
    it('resolveGraphOutDir: should use defaults when no config is provided', () => {
        const result = resolveGraphOutDir(opts, {}, 'SEED');
        expect(result).toBe(path.resolve(projectRoot, DEFAULT_OUTPUT_BASE_DIR, DEFAULT_GRAPH_DIR, 'SEED'));
    });
  });
});
