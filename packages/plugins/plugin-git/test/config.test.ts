import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  execGit,
  listSubtreeConfigs,
  removeSubtreeConfig,
  clearSubtreeConfigs,
} from '../src/index.js';

describe('subtree config helpers', () => {
  let repoDir: string;
  beforeEach(async () => {
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-plugin-test-'));
    await execGit(['init'], { cwd: repoDir });
  });
  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  it('lists, removes, and clears configs', async () => {
    await execGit(['config', '--local', 'civ7.mod.foo.repoUrl', 'git@example.com:foo.git'], { cwd: repoDir });
    await execGit(['config', '--local', 'civ7.mod.foo.branch', 'main'], { cwd: repoDir });
    await execGit(['config', '--local', 'civ7.mod.bar.repoUrl', 'git@example.com:bar.git'], { cwd: repoDir });
    await execGit(['config', '--local', 'civ7.mod.bar.branch', 'dev'], { cwd: repoDir });

    const list1 = await listSubtreeConfigs('mod', { cwd: repoDir });
    expect(list1).toEqual([
      { slug: 'bar', repoUrl: 'git@example.com:bar.git', branch: 'dev' },
      { slug: 'foo', repoUrl: 'git@example.com:foo.git', branch: 'main' },
    ]);

    const removed = await removeSubtreeConfig('mod', { slug: 'foo', cwd: repoDir });
    expect(removed).toBe('foo');
    const list2 = await listSubtreeConfigs('mod', { cwd: repoDir });
    expect(list2.map((e) => e.slug)).toEqual(['bar']);

    await clearSubtreeConfigs('mod', { cwd: repoDir });
    const list3 = await listSubtreeConfigs('mod', { cwd: repoDir });
    expect(list3).toEqual([]);
  });
});
