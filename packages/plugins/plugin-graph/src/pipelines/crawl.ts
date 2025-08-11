import * as crawler from '../crawler';
import { Graph } from '../types';

export interface CrawlGraphResult {
  graph: Graph;
  manifestFiles: string[];
}

export async function crawlGraph(
  rootDir: string,
  seed: string,
  log: (msg: string) => void = () => {}
): Promise<CrawlGraphResult> {
  try {
    log(`indexing XML from ${rootDir}`);
    const idx = await crawler.buildIndexFromXml(rootDir);
    log(`parsing seed ${seed}`);
    const parsed = crawler.parseSeed(seed);
    if (!parsed) throw new Error(`Could not parse seed: ${seed}`);
    log(`crawling graph for ${seed}`);
    return crawler.crawl(idx, parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`crawlGraph failed: ${msg}`);
    if (err instanceof Error) {
      err.message = `crawlGraph failed: ${err.message}`;
    }
    throw err;
  }
}

