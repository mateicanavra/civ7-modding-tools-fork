import * as crawler from '../crawler';
import { Graph } from '../types';

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

