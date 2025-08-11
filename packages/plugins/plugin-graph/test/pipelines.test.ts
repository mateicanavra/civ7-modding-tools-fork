import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { crawlGraph, exploreGraph } from '../src/pipelines';

async function setupXml(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'civ7-test-'));
  const xml = `<?xml version="1.0"?>
<Database>
  <Leaders>
    <Row LeaderType="LEADER_TEST" TraitType="TRAIT_TEST" />
  </Leaders>
  <Traits>
    <Row TraitType="TRAIT_TEST" ModifierId="MOD_TEST" />
  </Traits>
  <GameEffects>
    <Modifier id="MOD_TEST">
      <Effect>TEST_EFFECT</Effect>
    </Modifier>
  </GameEffects>
</Database>`;
  await writeFile(path.join(dir, 'test.xml'), xml, 'utf8');
  return dir;
}

describe('graph pipelines', () => {
  it('crawlGraph builds graph and manifest', async () => {
    const dir = await setupXml();
    try {
      const { graph, manifestFiles } = await crawlGraph(dir, 'LEADER_TEST');
      expect(graph.nodes.size).toBeGreaterThan(0);
      expect(manifestFiles.length).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('exploreGraph produces dot, svg, and optional html', async () => {
    const dir = await setupXml();
    try {
      const res = await exploreGraph({ rootDir: dir, seed: 'LEADER_TEST', emitHtml: true });
      expect(res.dot).toContain('digraph');
      expect(res.svg).toContain('<svg');
      expect(res.html).toBeTruthy();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('crawlGraph logs progress and errors on bad seed', async () => {
    const dir = await setupXml();
    const logs: string[] = [];
    try {
      await expect(crawlGraph(dir, 'BAD_SEED', (m) => logs.push(m))).rejects.toThrow(/crawlGraph failed: Could not parse seed/);
      expect(logs.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('exploreGraph surfaces crawl errors and logs', async () => {
    const dir = await setupXml();
    const logs: string[] = [];
    try {
      await expect(exploreGraph({ rootDir: dir, seed: 'BAD', log: (m) => logs.push(m) })).rejects.toThrow(/exploreGraph failed: crawlGraph failed: Could not parse seed/);
      expect(logs.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
