import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  expandPath,
  resolveZipPath,
  resolveUnzipDir,
  resolveGraphOutDir,
  resolveInstallDir,
} from '../src/index';

describe('@civ7/config path helpers', () => {
  it('expands ~ to home directory', () => {
    expect(expandPath('~/mods')).toBe(path.join(os.homedir(), 'mods'));
  });

  it('returns original path when not starting with ~', () => {
    expect(expandPath('/absolute')).toBe('/absolute');
  });

  it('resolves zip path with defaults', () => {
    const projectRoot = '/tmp/project';
    const cfg = {};
    const result = resolveZipPath({ projectRoot }, cfg);
    expect(result).toBe(
      path.resolve(projectRoot, '.civ7/outputs/archives/civ7-official-resources.zip'),
    );
  });

  it('resolves zip path with profile overrides', () => {
    const projectRoot = '/tmp/project';
    const cfg = {
      outputs: { baseDir: 'out', zip: { dir: 'base', name: 'base.zip' } },
      profiles: {
        dev: {
          outputs: { zip: { dir: 'dev', name: 'dev.zip' } },
        },
      },
    };
    const result = resolveZipPath({ projectRoot, profile: 'dev' }, cfg);
    expect(result).toBe(path.resolve(projectRoot, 'out/dev/dev.zip'));
  });

  it('resolves unzip directory with defaults', () => {
    const projectRoot = '/tmp/project';
    const cfg = {};
    const result = resolveUnzipDir({ projectRoot }, cfg);
    expect(result).toBe(path.resolve(projectRoot, '.civ7/outputs/resources'));
  });

  it('resolves graph output directory with sanitized seed', () => {
    const projectRoot = '/tmp/project';
    const cfg = {};
    const result = resolveGraphOutDir({ projectRoot }, cfg, 'Seed With Spaces!%');
    expect(result).toBe(
      path.resolve(projectRoot, '.civ7/outputs/graph/Seed_With_Spaces__'),
    );
  });

  it('uses install flag when provided', () => {
    const result = resolveInstallDir({}, '~/game');
    expect(result).toBe(path.join(os.homedir(), 'game'));
  });
});


