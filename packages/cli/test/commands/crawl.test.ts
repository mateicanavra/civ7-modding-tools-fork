import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@civ7/plugin-graph', () => ({
  crawlGraph: vi.fn(async () => ({ graph: { nodes: [], edges: [] }, manifestFiles: [] })),
  graphToJson: vi.fn((g: any) => g),
  graphToDot: vi.fn(() => 'digraph {}'),
}));

vi.mock('@civ7/config', () => ({
  loadConfig: vi.fn(async () => ({ raw: {}, path: undefined })),
  resolveGraphOutDir: vi.fn(() => '/out'),
  findProjectRoot: vi.fn(() => '/project'),
}));
vi.mock('../../src/utils/resolver', () => ({
  resolveRootFromConfigOrFlag: vi.fn(async () => '/root'),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  promises: {
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
  },
}));

import Crawl from '../../src/commands/crawl';
import { crawlGraph } from '@civ7/plugin-graph';

describe('crawl command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('delegates to plugin-graph crawlGraph', async () => {
    await Crawl.run(['TEST_SEED']);
    expect(crawlGraph).toHaveBeenCalledWith('/root', 'TEST_SEED', expect.any(Function));
  });
});
