/**
 * Core crawler types shared across modules.
 */

export type Row = Record<string, any> & { __table?: string; __file?: string };

export interface RowRecord {
  table: string;
  key?: string;
  row: Row;
  file: string;
  seq: number;
  deleted?: boolean;
}

export interface TableIndex {
  table: string;
  rows: RowRecord[];
  byCol: Map<string, Map<string, RowRecord[]>>;
}

export interface Index {
  tables: Map<string, TableIndex>;
}

export interface NodeKey { table: string; id: string }

export interface GraphNode { key: NodeKey; row: Row; file: string }
export interface GraphEdge { from: NodeKey; to: NodeKey; label?: string }

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

export interface CrawlResult {
  graph: Graph;
  manifestFiles: string[];
}


