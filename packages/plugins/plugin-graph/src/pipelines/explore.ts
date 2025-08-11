import { crawlGraph, CrawlGraphResult } from './crawl';
import { graphToDot, graphToJson } from '../graph';
import { renderSvg } from '../render';
import { buildGraphViewerHtml } from '../viewer';

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

