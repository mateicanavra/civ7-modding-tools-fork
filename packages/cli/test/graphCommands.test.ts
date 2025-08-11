import { describe, test, expect, vi, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@civ7/plugin-graph', () => {
  return {
    crawlGraph: vi.fn(async () => ({ graph: { nodes: [], edges: [] }, manifestFiles: [] })),
    graphToJson: vi.fn((g: any) => g),
    graphToDot: vi.fn(() => 'digraph {}'),
    exploreGraph: vi.fn(async () => ({ dot: 'digraph {}', json: {}, svg: '<svg />', html: '<html></html>', manifestFiles: [] })),
  };
});

import Crawl from '../src/commands/crawl';
import Explore from '../src/commands/explore';
import { crawlGraph, exploreGraph } from '@civ7/plugin-graph';

describe('graph CLI commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('crawl delegates to plugin-graph crawlGraph', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'civ7-cli-root-'));
    const outDir = await mkdtemp(join(tmpdir(), 'civ7-cli-out-'));
    await Crawl.run(['TEST_SEED', outDir, '--root', rootDir]);
    expect(crawlGraph).toHaveBeenCalledWith(rootDir, 'TEST_SEED');
  });

  test('explore delegates to plugin-graph exploreGraph', async () => {
    process.env.CI = '1';
    const rootDir = await mkdtemp(join(tmpdir(), 'civ7-cli-root-'));
    const outDir = await mkdtemp(join(tmpdir(), 'civ7-cli-out-'));
    await Explore.run(['TEST_SEED', outDir, '--root', rootDir]);
    expect(exploreGraph).toHaveBeenCalledWith({
      rootDir,
      seed: 'TEST_SEED',
      engine: 'dot',
      emitHtml: true,
    });
  });
});
