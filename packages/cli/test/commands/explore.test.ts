import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@civ7/plugin-graph', () => ({
  exploreGraph: vi.fn(async () => ({ dot: 'digraph {}', json: {}, svg: '<svg />', html: '<html></html>', manifestFiles: [] })),
}));

vi.mock('../../src/utils', () => ({
  loadConfig: vi.fn(async () => ({ raw: {}, path: undefined })),
  resolveGraphOutDir: vi.fn(() => '/out'),
  findProjectRoot: vi.fn(() => '/project'),
  resolveRootFromConfigOrFlag: vi.fn(async () => '/root'),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  promises: {
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => '{}'),
  },
}));

import Explore from '../../src/commands/data/explore';
import { exploreGraph } from '@civ7/plugin-graph';

describe('explore command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CI = '1';
  });

  test('delegates to plugin-graph exploreGraph', async () => {
    await Explore.run(['TEST_SEED']);
    expect(exploreGraph).toHaveBeenCalledWith({
      rootDir: '/root',
      seed: 'TEST_SEED',
      engine: 'dot',
      emitHtml: true,
      log: expect.any(Function),
    });
  });
});
