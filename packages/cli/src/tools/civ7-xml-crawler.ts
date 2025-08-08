/*
 * civ7-xml-crawler.ts
 *
 * Purpose
 * -------
 * Crawl Civ-style XML data (Civ6/7 mod schema) to build a dependency graph for a given seed
 * (e.g., Leader, Civilization, Trait, Unit, Improvement, Modifier, RequirementSet, etc.).
 * It finds all related rows across tables (LeaderTraits, TraitModifiers, Modifiers,
 * ModifierArguments, RequirementSets, RequirementSetRequirements, Requirements,
 * RequirementArguments, Units, UnitAbilities, UnitAbilityModifiers, Improvements, adjacency tables, etc.).
 *
 * What you get
 * ------------
 * - Indexed in-memory representation of all XML rows with file provenance
 * - A BFS crawler that expands from a seed (table+id) using resolvers + heuristics
 * - A JSON graph (nodes+edges) and a manifest of XML files required for that feature
 * - Optional GraphViz DOT export for visualization
 *
 * Split when (guidance for future refactors)
 * -----------------------------------------
 * - GameEffects normalization rules solidify and require independent tests → extract `gameeffects-normalizer.ts`
 * - Database table parsing/delete layering expands (e.g., SQL support) → extract `database-indexer.ts`
 * - Expanders grow significantly or need tuning in isolation → extract `graph-expanders.ts`
 * - We want isolated type-level tests → extract `crawler-types.ts`
 *
 * Dependencies
 * ------------
 *   npm i fast-xml-parser
 * (You can replace the simple directory walk with globby if you want multi-root globbing.)
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { COLUMN_TO_TABLE, PREFIX_TO_TABLE, PRIMARY_KEYS } from './crawler-constants';

// -----------------------------
// Types
// -----------------------------

/**
 * A generic row emitted from either Database XML (<Database><Table><Row />...) or
 * synthesized from GameEffects normalization.
 * - __table: logical table name (e.g., Modifiers, RequirementSets)
 * - __file: absolute path to source XML file (provenance for manifest slicing)
 */
export type Row = Record<string, any> & { __table?: string; __file?: string };

export interface RowRecord {
  table: string;
  key?: string; // optional for composite tables
  row: Row;
  file: string;
  seq: number; // global insertion order for layering & deletes
  deleted?: boolean;
}

export interface TableIndex {
  table: string;
  rows: RowRecord[];
  byCol: Map<string, Map<string, RowRecord[]>>; // column -> value -> rows
}

export interface Index {
  tables: Map<string, TableIndex>;
}

export interface NodeKey { table: string; id: string; }
export interface GraphNode { key: NodeKey; row: Row; file: string }
export interface GraphEdge { from: NodeKey; to: NodeKey; label?: string }

export interface Graph {
  nodes: Map<string, GraphNode>; // key: table|id
  edges: GraphEdge[];
}

export interface CrawlResult {
  graph: Graph;
  manifestFiles: string[];
}

// -----------------------------
// Config is imported from crawler-constants
// -----------------------------

// -----------------------------
// XML Parsing & Indexing
// -----------------------------

/** Shared XML parser configured to keep attributes and preserve original keys. */
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

/**
 * Recursively find all XML files under a root path or accept a single XML file.
 * Returns a deterministic lexicographically sorted list to enable last-write-wins layering.
 */
export async function findXmlFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && p.toLowerCase().endsWith('.xml')) out.push(p);
    }
  }
  const stat = await fs.stat(root);
  if (stat.isDirectory()) await walk(root);
  else if (root.toLowerCase().endsWith('.xml')) out.push(root);
  // Deterministic order: Base before DLC (lexicographic handles common cases), then lexicographic
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * Collect classic Civ-style tables from a parsed Database XML object.
 * Looks for shapes like: <Database><Table><Row/></Table></Database> and returns a map table->rows
 */
function findTables(obj: any, acc: Record<string, any[]> = {}): Record<string, any[]> {
  if (!obj || typeof obj !== 'object') return acc;
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    if (typeof v === 'object' && 'Row' in v) {
      const rows = (v as any).Row;
      const arr = Array.isArray(rows) ? rows : [rows];
      if (!acc[k]) acc[k] = [];
      for (const r of arr) acc[k].push(r);
    } else if (typeof v === 'object') {
      findTables(v, acc);
    }
  }
  return acc;
}

// Collect <Delete .../> operations from Database-style XML
/**
 * Collect <Delete .../> nodes grouped by table for layering semantics.
 */
function findDeletes(obj: any, acc: Record<string, any[]> = {}): Record<string, any[]> {
  if (!obj || typeof obj !== 'object') return acc;
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    if (typeof v === 'object' && 'Delete' in v) {
      const delsRaw = (v as any).Delete;
      const arr = Array.isArray(delsRaw) ? delsRaw : [delsRaw];
      if (!acc[k]) acc[k] = [];
      for (const d of arr) acc[k].push(d);
    } else if (typeof v === 'object') {
      findDeletes(v, acc);
    }
  }
  return acc;
}

// -----------------------------
// GameEffects normalization helpers
// -----------------------------

/** Normalize scalar-or-array into array. */
function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Get attribute by any of the provided names, case-insensitive. */
function getAttrCaseInsensitive(obj: any, ...names: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = Object.keys(obj);
  for (const n of names) {
    const k = keys.find((kk) => kk.toLowerCase() === n.toLowerCase());
    if (k !== undefined) return obj[k];
  }
  return undefined;
}

/**
 * Read a value from an <Argument ...> node supporting both attribute and inner-text styles.
 */
function readArgumentValue(node: any): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const explicit = getAttrCaseInsensitive(node, 'Value');
  if (explicit !== undefined) return String(explicit);
  // fast-xml-parser uses '#text' for inner text by default
  if (typeof node['#text'] !== 'undefined') return String(node['#text']);
  // Some files may use 'Text' or similar
  const txt = getAttrCaseInsensitive(node, 'Text');
  if (txt !== undefined) return String(txt);
  return undefined;
}

/**
 * Locate <GameEffects> blocks anywhere in a parsed XML tree.
 */
function collectGameEffectsRoots(obj: any, out: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    if (k === 'GameEffects' && typeof v === 'object') {
      out.push(v);
    }
    if (typeof v === 'object') collectGameEffectsRoots(v, out);
  }
  return out;
}

interface DeleteSpec {
  table: string;
  where: Record<string, string>;
  file: string;
  seq: number;
}

export async function buildIndexFromXml(root: string): Promise<Index> {
  const files = await findXmlFiles(root);
  const tables = new Map<string, TableIndex>();
  const deleteSpecs: DeleteSpec[] = [];
  let seqCounter = 0;

  /** Ensure a TableIndex exists for a given table name. */
  function ensureTable(table: string): TableIndex {
    if (!tables.has(table)) tables.set(table, { table, rows: [], byCol: new Map() });
    return tables.get(table)!;
  }

  /**
   * Insert a row into the in-memory index with provenance and sequence ordering.
   * Also builds a per-table column index to support fast joins during crawl.
   */
  function indexRow(table: string, row: Row, file: string) {
    const ti = ensureTable(table);
    row.__table = table;
    row.__file = file;
    const rr: RowRecord = { table, key: getPrimaryKey(table, row), row, file, seq: seqCounter++ };
    ti.rows.push(rr);
    // index common columns (will rebuild after deletes, but keep for interim lookups)
    for (const [col, val] of Object.entries(row)) {
      if (typeof val !== 'string') continue;
      let map = ti.byCol.get(col);
      if (!map) { map = new Map(); ti.byCol.set(col, map); }
      const list = map.get(val) || [];
      list.push(rr); map.set(val, list);
    }
  }

  /** Record a Delete spec (table + where attributes) with sequence for layering. */
  function addDelete(table: string, whereRaw: any, file: string) {
    const where: Record<string, string> = {};
    for (const [k, v] of Object.entries(whereRaw || {})) {
      // Skip nested elements; only attributes are relevant for where
      if (v !== null && typeof v !== 'object' && k !== '__table' && k !== '__file') {
        where[k] = String(v);
      }
    }
    deleteSpecs.push({ table, where, file, seq: seqCounter++ });
  }

  for (const file of files) {
    try {
      const text = await fs.readFile(file, 'utf8');
      const obj = parser.parse(text);

      // 1) Database-style tables
      const tablesInFile = findTables(obj);
      for (const [table, rows] of Object.entries(tablesInFile)) {
        for (const raw of rows) {
          const row: Row = normalizeRow(raw);
          indexRow(table, row, file);
        }
      }

      // Collect deletes in the same pass
      const deletesInFile = findDeletes(obj);
      for (const [table, dels] of Object.entries(deletesInFile)) {
        for (const d of dels) addDelete(table, d, file);
      }

      // 2) GameEffects normalization
      const geRoots = collectGameEffectsRoots(obj);
      for (const ge of geRoots) {
        const modifiersRaw = toArray(getAttrCaseInsensitive(ge, 'Modifier'));
        for (const mod of modifiersRaw) {
          const modId = String(getAttrCaseInsensitive(mod, 'id', 'Id', 'ID', 'ModifierId', 'ModifierID') || '');
          if (!modId) continue;
          const collection = String(getAttrCaseInsensitive(mod, 'collection', 'Collection') || '');
          const effect = String(getAttrCaseInsensitive(mod, 'effect', 'Effect') || '');
          const permanentVal = getAttrCaseInsensitive(mod, 'permanent', 'Permanent');
          const permanent = typeof permanentVal === 'undefined' ? undefined : String(permanentVal);

          const synthesized: Row = {
            ModifierId: modId,
            Collection: collection,
            Effect: effect,
            ...(permanent !== undefined ? { Permanent: permanent } : {}),
          };

          // Subject/Owner requirements
          const subjReqs = getAttrCaseInsensitive(mod, 'SubjectRequirements');
          const ownerReqs = getAttrCaseInsensitive(mod, 'OwnerRequirements');

          if (subjReqs && typeof subjReqs === 'object') {
            const setId = `REQSET_${modId}_SUBJECT`;
            synthesized['SubjectRequirementSetId'] = setId;
            const setType = String(getAttrCaseInsensitive(subjReqs, 'type', 'Type') || '');
            indexRow('RequirementSets', { RequirementSetId: setId, RequirementSetType: setType }, file);
            const reqs = toArray(getAttrCaseInsensitive(subjReqs, 'Requirement'));
            let i = 0;
            for (const r of reqs) {
              const reqId = `REQ_${modId}_SUBJECT_${i++}`;
              const reqType = String(getAttrCaseInsensitive(r, 'type', 'Type') || '');
              indexRow('Requirements', { RequirementId: reqId, RequirementType: reqType }, file);
              indexRow('RequirementSetRequirements', { RequirementSetId: setId, RequirementId: reqId, Index: i - 1 }, file);
              // Requirement Arguments
              const args = toArray(getAttrCaseInsensitive(r, 'Argument'));
              for (const a of args) {
                const name = String(getAttrCaseInsensitive(a, 'name', 'Name') || '');
                const value = readArgumentValue(a) || '';
                indexRow('RequirementArguments', { RequirementId: reqId, Name: name, Value: value }, file);
              }
            }
          }

          if (ownerReqs && typeof ownerReqs === 'object') {
            const setId = `REQSET_${modId}_OWNER`;
            synthesized['OwnerRequirementSetId'] = setId;
            const setType = String(getAttrCaseInsensitive(ownerReqs, 'type', 'Type') || '');
            indexRow('RequirementSets', { RequirementSetId: setId, RequirementSetType: setType }, file);
            const reqs = toArray(getAttrCaseInsensitive(ownerReqs, 'Requirement'));
            let i = 0;
            for (const r of reqs) {
              const reqId = `REQ_${modId}_OWNER_${i++}`;
              const reqType = String(getAttrCaseInsensitive(r, 'type', 'Type') || '');
              indexRow('Requirements', { RequirementId: reqId, RequirementType: reqType }, file);
              indexRow('RequirementSetRequirements', { RequirementSetId: setId, RequirementId: reqId, Index: i - 1 }, file);
              const args = toArray(getAttrCaseInsensitive(r, 'Argument'));
              for (const a of args) {
                const name = String(getAttrCaseInsensitive(a, 'name', 'Name') || '');
                const value = readArgumentValue(a) || '';
                indexRow('RequirementArguments', { RequirementId: reqId, Name: name, Value: value }, file);
              }
            }
          }

          // Emit modifier row
          indexRow('Modifiers', synthesized, file);

          // Emit modifier arguments
          const args = toArray(getAttrCaseInsensitive(mod, 'Argument'));
          for (const a of args) {
            const name = String(getAttrCaseInsensitive(a, 'name', 'Name') || '');
            const value = readArgumentValue(a) || '';
            indexRow('ModifierArguments', { ModifierId: modId, Name: name, Value: value }, file);
          }
        }
      }
    } catch (e) {
      // swallow parser errors, but you could log
      // console.warn('Parse error', file, e);
    }
  }

  // Apply deletes with layering semantics: a Delete only affects rows with lower seq
  if (deleteSpecs.length) {
    for (const [table, ti] of tables.entries()) {
      const relevantDeletes = deleteSpecs.filter((d) => d.table === table);
      if (relevantDeletes.length === 0) continue;
      for (const rr of ti.rows) {
        for (const del of relevantDeletes) {
          if (del.seq > rr.seq) {
            let match = true;
            for (const [k, v] of Object.entries(del.where)) {
              if (String((rr.row as any)[k]) !== String(v)) { match = false; break; }
            }
            if (match) { rr.deleted = true; break; }
          }
        }
      }
      // Rebuild byCol excluding deleted
      const newByCol = new Map<string, Map<string, RowRecord[]>>();
      for (const rr of ti.rows) {
        if (rr.deleted) continue;
        for (const [col, val] of Object.entries(rr.row)) {
          if (typeof val !== 'string') continue;
          let map = newByCol.get(col);
          if (!map) { map = new Map(); newByCol.set(col, map); }
          const list = map.get(val) || [];
          list.push(rr); map.set(val, list);
        }
      }
      ti.byCol = newByCol;
    }
  }

  return { tables };
}

/**
 * Normalize a raw parsed <Row> payload.
 * fast-xml-parser already flattens attributes; we keep the record as-is to avoid losing original shapes.
 */
function normalizeRow(raw: any): Row { return raw as Row; }

/** Return the primary key value for a row if known, with basic fallbacks. */
function getPrimaryKey(table: string, row: Row): string | undefined {
  const pk = PRIMARY_KEYS[table];
  if (pk && row[pk]) return String(row[pk]);
  // Fallback guesses
  for (const k of ['Type','Id','ID','RowId','Name']) if (row[k]) return String(row[k]);
  return undefined;
}

// -----------------------------
// Query helpers
// -----------------------------

/** Lookup rows by a specific column value using the prebuilt column index. */
function findBy(table: string, col: string, val: string, idx: Index): RowRecord[] {
  const ti = idx.tables.get(table); if (!ti) return [];
  const colIdx = ti.byCol.get(col); if (!colIdx) return [];
  const list = colIdx.get(val) || [];
  // Filter out deleted rows if any remain
  return list.filter((rr) => !rr.deleted);
}

/** Resolve a single row by primary key using last-write-wins (latest sequence). */
function getByPk(table: string, id: string, idx: Index): RowRecord | undefined {
  const pk = PRIMARY_KEYS[table]; if (!pk) return undefined;
  const matches = findBy(table, pk, id, idx);
  // Last-write-wins: return the latest by seq
  let latest: RowRecord | undefined;
  for (const rr of matches) {
    if (!latest || rr.seq > latest.seq) latest = rr;
  }
  return latest;
}

/** Guess a table name from a well-known ID prefix (e.g., LEADER_*, MODIFIER_*). */
function guessTableFromId(id: string): string | undefined {
  for (const [re, table] of PREFIX_TO_TABLE) if (re.test(id)) return table;
  return undefined;
}

// -----------------------------
// Expanders (table-specific graph edges)
// -----------------------------

interface EdgeTarget { key: NodeKey; label?: string }

type Expander = (rr: RowRecord, idx: Index) => EdgeTarget[];

/**
 * Table-specific expansion rules for BFS crawling.
 * Keep focused and conservative; genericEdges handles common cross-table references via known columns.
 */
const EXPANDERS: Record<string, Expander> = {
  Leaders: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const ltr of findBy('LeaderTraits', 'LeaderType', rr.row.LeaderType, idx)) {
      if (ltr.row.TraitType) out.push({ key: { table: 'Traits', id: String(ltr.row.TraitType) }, label: 'LeaderTraits' });
    }
    // Agendas (if present)
    for (const hag of findBy('HistoricalAgendas' as any, 'LeaderType', rr.row.LeaderType, idx)) {
      if (hag.row.AgendaType) out.push({ key: { table: 'Agendas', id: String(hag.row.AgendaType) }, label: 'Agenda' });
    }
    return out;
  },
  Civilizations: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const ctr of findBy('CivilizationTraits', 'CivilizationType', rr.row.CivilizationType, idx)) {
      if (ctr.row.TraitType) out.push({ key: { table: 'Traits', id: String(ctr.row.TraitType) }, label: 'CivilizationTraits' });
    }
    // Start biases
    for (const sbr of findBy('StartBiasTerrains' as any, 'CivilizationType', rr.row.CivilizationType, idx)) {
      out.push({ key: { table: 'StartBiasTerrains' as any, id: `${sbr.row.CivilizationType}:${sbr.row.TerrainType}` }, label: 'StartBiasTerrains' });
    }
    for (const sbr of findBy('StartBiasResources' as any, 'CivilizationType', rr.row.CivilizationType, idx)) {
      out.push({ key: { table: 'StartBiasResources' as any, id: `${sbr.row.CivilizationType}:${sbr.row.ResourceType}` }, label: 'StartBiasResources' });
    }
    return out;
  },
  Traits: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const tmr of findBy('TraitModifiers', 'TraitType', rr.row.TraitType, idx)) {
      if (tmr.row.ModifierId) out.push({ key: { table: 'Modifiers', id: String(tmr.row.ModifierId) }, label: 'TraitModifiers' });
    }
    return out;
  },
  Modifiers: (rr, idx) => {
    const out: EdgeTarget[] = [];
    // Link to RequirementSets
    for (const col of ['SubjectRequirementSetId','OwnerRequirementSetId','RequirementSetId']) {
      const v = rr.row[col]; if (v) out.push({ key: { table: 'RequirementSets', id: String(v) }, label: col });
    }
    // Link to ModifierArguments
    for (const mar of findBy('ModifierArguments', 'ModifierId', rr.row.ModifierId, idx)) {
      out.push({ key: { table: 'ModifierArguments', id: `${mar.row.ModifierId}:${mar.row.Name}` }, label: 'Argument' });
      // Opportunistically follow argument references (e.g., ImprovementType, UnitType, DistrictType, etc.)
      const name = String(mar.row.Name || '');
      const value = String(mar.row.Value || '');
      const targetTable = COLUMN_TO_TABLE[name as keyof typeof COLUMN_TO_TABLE];
      if (targetTable && value) {
        const pk = PRIMARY_KEYS[targetTable];
        if (pk && getByPk(targetTable, value, idx)) out.push({ key: { table: targetTable, id: value }, label: name });
      }
      // Attach chain: Name === 'ModifierId' should reference another Modifier
      if (name.toLowerCase() === 'modifierid' && value) {
        if (getByPk('Modifiers', value, idx)) out.push({ key: { table: 'Modifiers', id: value }, label: 'Attach' });
      }
    }
    return out;
  },
  RequirementSets: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const rsr of findBy('RequirementSetRequirements', 'RequirementSetId', rr.row.RequirementSetId, idx)) {
      if (rsr.row.RequirementId) out.push({ key: { table: 'Requirements', id: String(rsr.row.RequirementId) }, label: 'Requirement' });
    }
    return out;
  },
  Requirements: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const rar of findBy('RequirementArguments', 'RequirementId', rr.row.RequirementId, idx)) {
      out.push({ key: { table: 'RequirementArguments', id: `${rar.row.RequirementId}:${rar.row.Name}` }, label: 'Argument' });
      const name = String(rar.row.Name || '');
      const value = String(rar.row.Value || '');
      const targetTable = COLUMN_TO_TABLE[name as keyof typeof COLUMN_TO_TABLE];
      if (targetTable && value) {
        const pk = PRIMARY_KEYS[targetTable];
        if (pk && getByPk(targetTable, value, idx)) out.push({ key: { table: targetTable, id: value }, label: name });
      }
    }
    return out;
  },
  Units: (rr, idx) => {
    const out: EdgeTarget[] = [];
    // UnitAbilities
    for (const uam of findBy('UnitAbilityModifiers', 'UnitAbilityType', rr.row.UnitAbilityType ?? rr.row.AbilityType ?? '', idx)) {
      if (uam.row.ModifierId) out.push({ key: { table: 'Modifiers', id: String(uam.row.ModifierId) }, label: 'UnitAbilityModifier' });
    }
    // Replacement/Upgrade link guesses
    for (const k of ['ReplacesUnitType','UpgradesTo']) {
      const v = rr.row[k]; if (v && getByPk('Units', v, idx)) out.push({ key: { table: 'Units', id: String(v) }, label: k });
    }
    return out;
  },
  Improvements: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const t of ['Improvement_YieldChanges','Improvement_ValidTerrains','Improvement_ValidFeatures','Improvement_AdjacentDistrictYields']) {
      const ti = idx.tables.get(t); if (!ti) continue;
      const col = 'ImprovementType';
      const map = ti.byCol.get(col); if (!map) continue;
      const list = map.get(rr.row.ImprovementType);
      if (list) {
        for (const r of list) out.push({ key: { table: t, id: `${r.row.ImprovementType}:${Object.values(r.row).join('|')}` }, label: t });
      }
    }
    return out;
  },
};

// Generic linker: any known column => follow to target table
/**
 * Generic linker: for any known column→table mapping, follow to the target table if the row exists.
 */
function genericEdges(rr: RowRecord, idx: Index): EdgeTarget[] {
  const out: EdgeTarget[] = [];
  for (const [col, targetTable] of Object.entries(COLUMN_TO_TABLE)) {
    const v = rr.row[col];
    if (typeof v === 'string' && PRIMARY_KEYS[targetTable]) {
      if (getByPk(targetTable, v, idx)) out.push({ key: { table: targetTable, id: v }, label: col });
    }
  }
  return out;
}

function nkToStr(nk: NodeKey): string { return `${nk.table}|${nk.id}`; }

// -----------------------------
// Crawl
// -----------------------------

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
    // ensure exists
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

    const ex = EXPANDERS[cur.table as keyof typeof EXPANDERS];
    const nextEdges: EdgeTarget[] = [
      ...(ex ? ex(curRR, idx) : []),
      ...genericEdges(curRR, idx),
    ];

    for (const edge of nextEdges) {
      const nk = edge.key;
      if (!getByPk(nk.table, nk.id, idx)) continue;
      // Skip self-loops for readability
      if (nk.table === cur.table && nk.id === cur.id) continue;
      graph.edges.push({ from: cur, to: nk, label: edge.label });
      enqueue(nk);
    }
  }

  const manifestFiles = Array.from(new Set(Array.from(graph.nodes.values()).map(n => n.file))).sort();
  return { graph, manifestFiles };
}

// -----------------------------
// Export helpers
// -----------------------------

/** Shape graph for JSON output (stable schema for consumers). */
export function graphToJson(g: Graph) {
  return {
    nodes: Array.from(g.nodes.values()).map(n => ({ table: n.key.table, id: n.key.id, file: n.file, row: n.row })),
    edges: g.edges.map(e => ({ from: `${e.from.table}:${e.from.id}`, to: `${e.to.table}:${e.to.id}`, label: e.label })),
  };
}

/** Serialize graph to GraphViz DOT for visualization. */
export function graphToDot(g: Graph): string {
  const lines: string[] = ['digraph G {'];
  for (const n of g.nodes.values()) {
    const id = sanitize(`${n.key.table}_${n.key.id}`);
    const label = `${n.key.table}\n${n.key.id}`.replace(/"/g, '\\"');
    lines.push(`  "${id}" [label="${label}"];`);
  }
  for (const e of g.edges) {
    const from = sanitize(`${e.from.table}_${e.from.id}`);
    const to = sanitize(`${e.to.table}_${e.to.id}`);
    const lbl = e.label ? ` [label="${e.label}"]` : '';
    lines.push(`  "${from}" -> "${to}"${lbl};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function sanitize(s: string) { return s.replace(/[^A-Za-z0-9_:\-]/g, '_').slice(0, 120); }

// -----------------------------
// Seed parsing convenience
// -----------------------------

/**
 * Accept seed as "Table:ID" or a bare ID with a recognizable prefix.
 */
export function parseSeed(input: string): NodeKey | undefined {
  // Accept forms: "Table:ID" or just "ID" (we'll guess the table from the prefix)
  const parts = input.split(':');
  if (parts.length === 2) return { table: parts[0], id: parts[1] };
  const guessed = guessTableFromId(input);
  return guessed ? { table: guessed, id: input } : undefined;
}

// -----------------------------
// Example usage (commented)
// -----------------------------

/*
(async () => {
  const idx = await buildIndexFromXml('path/to/unpacked/xml/root');
  const seed = parseSeed('LEADER_AMANITORE')!; // or parseSeed('Leaders:LEADER_AMANITORE')
  const { graph, manifestFiles } = crawl(idx, seed);
  await fs.writeFile('out/amanitore-graph.json', JSON.stringify(graphToJson(graph), null, 2));
  await fs.writeFile('out/amanitore-graph.dot', graphToDot(graph));
  await fs.writeFile('out/amanitore-manifest.txt', manifestFiles.join('\n'));
})();
*/


