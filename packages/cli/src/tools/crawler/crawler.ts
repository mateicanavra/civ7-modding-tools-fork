import { CrawlResult, Graph, GraphEdge, Index, NodeKey } from './types';
import { EXPANDERS, genericEdges } from './expanders';
import { getByPk } from './queries';

function nkToStr(nk: NodeKey): string { return `${nk.table}|${nk.id}`; }

/**
 * Breadth-first crawl from a seed node, materializing nodes and edges while pruning
 * to existing targets. Produces a manifest of source files from node provenance.
 */
export function crawl(idx: Index, seed: NodeKey): CrawlResult {
  const graph: Graph = { nodes: new Map(), edges: [] };
  const seen = new Set<string>();
  const q: NodeKey[] = [];

  function enqueue(nk: NodeKey) {
    const key = nkToStr(nk);
    if (seen.has(key)) return;
    const rr = getByPk(nk.table, nk.id, idx);
    if (!rr) return;
    seen.add(key);
    graph.nodes.set(key, { key: nk, row: rr.row, file: rr.file });
    q.push(nk);
  }

  enqueue(seed);

  while (q.length) {
    const cur = q.shift()!;
    const curRR = getByPk(cur.table, cur.id, idx)!;

    const ex = (EXPANDERS as any)[cur.table];
    const nextEdges = [
      ...(ex ? ex(curRR, idx) : []),
      ...genericEdges(curRR, idx),
    ];

    for (const edge of nextEdges) {
      const nk = edge.key;
      if (!getByPk(nk.table, nk.id, idx)) continue;
      if (nk.table === cur.table && nk.id === cur.id) continue;
      graph.edges.push({ from: cur, to: nk, label: (edge as any).label });
      enqueue(nk);
    }
  }

  const manifestFiles = Array.from(new Set(Array.from(graph.nodes.values()).map(n => n.file))).sort();
  return { graph, manifestFiles };
}


