import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@civ7/plugin-graph', () => ({
  renderSvg: vi.fn(async () => '<svg />'),
}));

vi.mock('@civ7/config', () => ({
  findProjectRoot: vi.fn(() => '/project'),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  promises: {
    readFile: vi.fn(async () => 'digraph {}'),
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
  },
}));

import Render from '../../src/commands/data/render';
import { renderSvg } from '@civ7/plugin-graph';

describe('render command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('delegates to plugin-graph renderSvg', async () => {
    await Render.run(['input.dot', 'out.svg']);
    expect(renderSvg).toHaveBeenCalledWith('digraph {}', 'dot');
  });
});
