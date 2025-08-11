import { crawlGraph, CrawlGraphResult } from './crawl';
import { graphToDot, graphToJson } from '../graph';
import { renderSvg } from '../render';
import { buildGraphViewerHtml } from '../viewer';

export interface ExploreGraphOptions {
  rootDir: string;
  seed: string;
  engine?: 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi';
  emitHtml?: boolean;
  log?: (msg: string) => void;
}

export interface ExploreGraphResult extends CrawlGraphResult {
  dot: string;
  json: ReturnType<typeof graphToJson>;
  svg: string;
  html?: string;
}

export async function exploreGraph(opts: ExploreGraphOptions): Promise<ExploreGraphResult> {
  const { rootDir, seed, engine = 'dot', emitHtml, log = () => {} } = opts;
  try {
    const { graph, manifestFiles } = await crawlGraph(rootDir, seed, log);
    log('converting graph to DOT');
    const dot = graphToDot(graph);
    log(`rendering SVG with engine: ${engine}`);
    const svg = await renderSvg(dot, engine);
    const json = graphToJson(graph);
    const html = emitHtml ? buildGraphViewerHtml({ title: `${seed} — Graph`, svg }) : undefined;
    return { graph, manifestFiles, dot, json, svg, html };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`exploreGraph failed: ${msg}`);
    if (err instanceof Error) {
      err.message = `exploreGraph failed: ${err.message}`;
    }
    throw err;
  }
}


