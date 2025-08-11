import * as crawler from './crawler';
import { graphToDot, graphToJson } from './graph';
import { buildGraphViewerHtml } from './viewer';
import { renderSvg } from './render';
import { Graph } from './types';

export interface CrawlGraphResult {
  graph: Graph;
  manifestFiles: string[];
}

export async function crawlGraph(rootDir: string, seed: string): Promise<CrawlGraphResult> {
  const idx = await crawler.buildIndexFromXml(rootDir);
  const parsed = crawler.parseSeed(seed);
  if (!parsed) throw new Error(`Could not parse seed: ${seed}`);
  return crawler.crawl(idx, parsed);
}

export interface ExploreGraphOptions {
  rootDir: string;
  seed: string;
  engine?: 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi';
  emitHtml?: boolean;
}

export interface ExploreGraphResult extends CrawlGraphResult {
  dot: string;
  json: ReturnType<typeof graphToJson>;
  svg: string;
  html?: string;
}

export async function exploreGraph(opts: ExploreGraphOptions): Promise<ExploreGraphResult> {
  const { rootDir, seed, engine = 'dot', emitHtml } = opts;
  const { graph, manifestFiles } = await crawlGraph(rootDir, seed);
  const dot = graphToDot(graph);
  const json = graphToJson(graph);
  const svg = await renderSvg(dot, engine);
  const html = emitHtml ? buildGraphViewerHtml({ title: `${seed} — Graph`, svg }) : undefined;
  return { graph, manifestFiles, dot, json, svg, html };
}
