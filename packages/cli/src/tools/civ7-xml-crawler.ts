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

  // Global graph tuning (Phase A: VIZ-8)
  lines.push('  graph [rankdir=LR, compound=true, overlap=false, splines=true, concentrate=true, nodesep=0.5, ranksep=0.6];');
  lines.push('  node  [fontname="Helvetica", fontsize=10, shape=box, style=filled, fillcolor="#ffffff", color="#555555", penwidth=1.2];');
  lines.push('  edge  [fontname="Helvetica", fontsize=9, color="#555555"];');

  // Legend (Phase A: VIZ-7)
  lines.push('  subgraph cluster_legend {');
  lines.push('    label="Legend"; fontsize=10; color="#BBBBBB";');
  // Node samples
  const legendNodes: Array<{ name: string; table: string }> = [
    { name: 'Legend_Traits', table: 'Traits' },
    { name: 'Legend_Modifiers', table: 'Modifiers' },
    { name: 'Legend_ReqSets', table: 'RequirementSets' },
    { name: 'Legend_Requirements', table: 'Requirements' },
    { name: 'Legend_ModArgs', table: 'ModifierArguments' },
    { name: 'Legend_ReqArgs', table: 'RequirementArguments' },
  ];
  for (const ln of legendNodes) {
    const attrs = nodeStyleAttrs(ln.table);
    const label = ln.table;
    lines.push(`    "${ln.name}" [label="${label}"${attrs ? ', ' + attrs : ''}];`);
  }
  // Edge samples
  lines.push('    "Legend_Primary_A" [label="Primary", shape=plaintext, color="#555555"];');
  lines.push('    "Legend_Primary_B" [label="", shape=point, width=0.05, color="#555555"];');
  lines.push(`    "Legend_Primary_A" -> "Legend_Primary_B" [${edgeStyleAttrs('TraitModifiers')}];`);

  lines.push('    "Legend_Attach_A" [label="Attach", shape=plaintext, color="#ef6c00"];');
  lines.push('    "Legend_Attach_B" [label="", shape=point, width=0.05, color="#ef6c00"];');
  lines.push(`    "Legend_Attach_A" -> "Legend_Attach_B" [${edgeStyleAttrs('Attach')}];`);

  lines.push('    "Legend_ReqSet_A" [label="ReqSet link", shape=plaintext, color="#1976d2"];');
  lines.push('    "Legend_ReqSet_B" [label="", shape=point, width=0.05, color="#1976d2"];');
  lines.push(`    "Legend_ReqSet_A" -> "Legend_ReqSet_B" [${edgeStyleAttrs('SubjectRequirementSetId')}];`);

  lines.push('  }');

  // Nodes with provenance tooltips/links (Phase B: VIZ-6) and semantic summaries (VIZ-19)
  const layerToIds = new Map<number, string[]>();
  for (const n of g.nodes.values()) {
    // Skip explicit RequirementSet nodes (we represent them as clusters)
    if (n.key.table === 'RequirementSets') continue;
    const id = sanitize(`${n.key.table}_${n.key.id}`);
    const label = formatNodeLabel(n.key.table, n.key.id);
    const styleAttrs = nodeStyleAttrs(n.key.table);
    const isAbs = typeof n.file === 'string' && path.isAbsolute(n.file);
    const relOrAbs = isAbs ? path.relative(process.cwd(), n.file) : (n.file ?? '');
    const semanticTip = buildSemanticTooltip(n, g);
    const tooltipLines = [`${n.key.table}:${n.key.id}`, relOrAbs];
    if (semanticTip) tooltipLines.push(semanticTip);
    const nodeTooltip = escapeDotString(tooltipLines.filter(Boolean).join('\n'));
    const urlAttr = isAbs ? `, URL="${escapeDotString(buildFileUrl(n.file))}"` : '';
    const targetAttr = `, target="_blank"`;
    lines.push(`  "${id}" [label="${label}"${styleAttrs ? ', ' + styleAttrs : ''}, tooltip="${nodeTooltip}"${urlAttr}${targetAttr}];`);

    const layer = getLayerForTable(n.key.table);
    if (layer !== null) {
      const list = layerToIds.get(layer) || [];
      list.push(id);
      layerToIds.set(layer, list);
    }
  }


  // RequirementSet clusters (Phase D: VIZ-11)
  const reqsetColor = '#1565c0';
  // Build quick lookup for edges from a given node
  const fromKeyToEdges = new Map<string, GraphEdge[]>();
  for (const e of g.edges) {
    const k = nkToStr(e.from);
    const arr = fromKeyToEdges.get(k) || [];
    arr.push(e); fromKeyToEdges.set(k, arr);
  }
  // Compute clusters and remember member node ids
  const clusterMembers = new Set<string>();
  const clusters: Array<{ rsKey: NodeKey; membersByLayer: Map<number, string[]> }> = [];
  for (const n of g.nodes.values()) {
    if (n.key.table !== 'RequirementSets') continue;
    const membersByLayer = new Map<number, string[]>();
    const rsId = sanitize(`${n.key.table}_${n.key.id}`);
    const add = (table: string, id: string) => {
      const nodeId = sanitize(`${table}_${id}`);
      const layer = getLayerForTable(table);
      if (layer === null) return;
      const list = membersByLayer.get(layer) || [];
      list.push(nodeId); membersByLayer.set(layer, list);
      clusterMembers.add(nodeId);
    };
    // Add invisible anchor for cluster edge routing
    const anchorId = sanitize(`RSANCHOR_${n.key.id}`);
    const anchorLayer = 4; // RequirementSets layer
    const listA = membersByLayer.get(anchorLayer) || [];
    listA.push(anchorId); membersByLayer.set(anchorLayer, listA);
    clusterMembers.add(anchorId);
    // Collect Requirements under this set
    const edgesFromRS = fromKeyToEdges.get(nkToStr(n.key)) || [];
    const reqIds: string[] = [];
    for (const e of edgesFromRS) {
      if (e.label === 'Requirement' && e.to.table === 'Requirements') {
        add(e.to.table, e.to.id);
        reqIds.push(e.to.id);
      }
    }
    // Collect RequirementArguments for each Requirement
    for (const reqId of reqIds) {
      const edgesFromReq = fromKeyToEdges.get(`Requirements|${reqId}`) || [];
      for (const e of edgesFromReq) {
        if (e.label === 'Argument' && e.to.table === 'RequirementArguments') {
          add(e.to.table, e.to.id);
        }
      }
    }
    if (membersByLayer.size > 0) clusters.push({ rsKey: n.key, membersByLayer });
  }

  // Remove cluster member nodes from global layer ranks to avoid double-parenting
  for (const [layer, ids] of layerToIds.entries()) {
    const filtered = ids.filter((nid) => !clusterMembers.has(nid));
    layerToIds.set(layer, filtered);
  }

  // Emit clusters, preserving per-layer ranks inside each cluster
  for (const c of clusters) {
    lines.push(`  subgraph cluster_reqset_${sanitize(c.rsKey.id)} {`);
    const rsNode = g.nodes.get(`${c.rsKey.table}|${c.rsKey.id}`);
    const rsType = rsNode?.row?.RequirementSetType ? `ReqSet: ${String(rsNode.row.RequirementSetType)}` : 'ReqSet';
    const isAbs = rsNode && typeof rsNode.file === 'string' && path.isAbsolute(rsNode.file);
    const relOrAbs = rsNode && isAbs ? path.relative(process.cwd(), rsNode.file) : (rsNode?.file ?? '');
    const tooltip = escapeDotString(`RequirementSets:${c.rsKey.id}\n${relOrAbs}`);
    lines.push(`    color=\"${reqsetColor}\"; penwidth=2.0; style=\"rounded\"; bgcolor=\"#eaf2fb\";`);
    lines.push(`    label=\"${escapeDotString(rsType)}\"; labelloc=\"t\"; margin=\"10\"; fontname=\"Helvetica\"; fontsize=10;`);
    lines.push(`    tooltip=\"${tooltip}\";`);
    if (rsNode && isAbs) {
      lines.push(`    URL=\"${escapeDotString(buildFileUrl(rsNode.file))}\"; target=\"_blank\";`);
    }
    const innerLayers = Array.from(c.membersByLayer.keys()).sort((a, b) => a - b);
    for (const layer of innerLayers) {
      const ids = c.membersByLayer.get(layer)!;
      if (!ids.length) continue;
      lines.push('    subgraph {');
      lines.push('      rank=same;');
      for (const nid of ids) {
        if (nid.startsWith('RSANCHOR_')) {
          lines.push(`      "${nid}" [label="", shape=point, width=0.01, height=0.01, color="${reqsetColor}"];`);
        } else {
          lines.push(`      "${nid}";`);
        }
      }
      lines.push('    }');
    }
    lines.push('  }');
  }

  // Layered ranks (Phase B: VIZ-3) for remaining (non-clustered) nodes
  const orderedLayers = Array.from(layerToIds.keys()).sort((a, b) => a - b);
  for (const layer of orderedLayers) {
    const ids = layerToIds.get(layer)!;
    if (!ids.length) continue;
    lines.push(`  subgraph "layer_${layer}" {`);
    lines.push('    rank=same;');
    for (const nid of ids) lines.push(`    "${nid}";`);
    lines.push('  }');
  }

  // Edges with tooltips (Phase B: VIZ-6)
  const reqsetEdgeLabels = new Set(['SubjectRequirementSetId','OwnerRequirementSetId','RequirementSetId']);
  for (const e of g.edges) {
    const styleAttrs = edgeStyleAttrs(e.label);
    const parts: string[] = [styleAttrs];
    if (e.label) parts.push(`label=\"${escapeDotString(e.label)}\"`);
    const edgeTooltip = e.label ? `${e.label} from ${e.from.table}:${e.from.id} → ${e.to.table}:${e.to.id}` : '';
    if (edgeTooltip) parts.push(`tooltip=\"${escapeDotString(edgeTooltip)}\"`);

    // Redirect edges touching RequirementSets to cluster anchor with lhead/ltail
    if (e.to.table === 'RequirementSets' && reqsetEdgeLabels.has(e.label || '')) {
      const from = sanitize(`${e.from.table}_${e.from.id}`);
      const anchor = sanitize(`RSANCHOR_${e.to.id}`);
      parts.push(`lhead=\"cluster_reqset_${sanitize(e.to.id)}\"`);
      lines.push(`  "${from}" -> "${anchor}" [${parts.join(', ')}];`);
      continue;
    }
    if (e.from.table === 'RequirementSets') {
      const anchor = sanitize(`RSANCHOR_${e.from.id}`);
      const to = sanitize(`${e.to.table}_${e.to.id}`);
      parts.push(`ltail=\"cluster_reqset_${sanitize(e.from.id)}\"`);
      lines.push(`  "${anchor}" -> "${to}" [${parts.join(', ')}];`);
      continue;
    }

    const from = sanitize(`${e.from.table}_${e.from.id}`);
    const to = sanitize(`${e.to.table}_${e.to.id}`);
    lines.push(`  "${from}" -> "${to}" [${parts.join(', ')}];`);
  }
  lines.push('}');
  return lines.join('\n');
}

function sanitize(s: string) { return s.replace(/[^A-Za-z0-9_:\-]/g, '_').slice(0, 120); }

// -----------------------------
// DOT helpers (Phase B)
// -----------------------------

function escapeDotString(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFileUrl(absPath: string): string {
  // Produces file:///... style URL; encode spaces and other characters
  const encoded = encodeURI(absPath);
  return `file://${encoded}`;
}

function getLayerForTable(table: string): number | null {
  const mapping: Record<string, number> = {
    Leaders: 1,
    Civilizations: 1,
    Traits: 2,
    LeaderTraits: 2,
    CivilizationTraits: 2,
    Modifiers: 3,
    RequirementSets: 4,
    Requirements: 5,
    ModifierArguments: 6,
    RequirementArguments: 6,
  };
  return Object.prototype.hasOwnProperty.call(mapping, table) ? mapping[table] : null;
}

// Build semantic summary lines for tooltips (VIZ-19)
function buildSemanticTooltip(n: GraphNode, g: Graph): string | undefined {
  try {
    const t = n.key.table;
    const row = n.row || {};
    if (t === 'Modifiers') {
      const effect = row.Effect ? `Effect=${row.Effect}` : undefined;
      const coll = row.Collection ? `Collection=${row.Collection}` : undefined;
      const perm = row.Permanent !== undefined ? `Permanent=${row.Permanent}` : undefined;
      const args = summarizeArgsFor('ModifierArguments', 'ModifierId', n.key.id, g, 3);
      return [effect, coll, perm, args].filter(Boolean).join(' | ');
    }
    if (t === 'RequirementSets') {
      const type = row.RequirementSetType ? `Type=${row.RequirementSetType}` : undefined;
      // count linked requirements
      const count = countOutgoing(n.key, g, 'Requirement', 'Requirements');
      const cnt = `Requirements=${count}`;
      return [type, cnt].filter(Boolean).join(' | ');
    }
    if (t === 'Requirements') {
      const rtype = row.RequirementType ? `Type=${row.RequirementType}` : undefined;
      const args = summarizeArgsFor('RequirementArguments', 'RequirementId', n.key.id, g, 3);
      return [rtype, args].filter(Boolean).join(' | ');
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// Build concise semantic line for labels (not too long)
function buildSemanticSummary(n: GraphNode, g: Graph): string | undefined {
  const t = n.key.table;
  const tip = buildSemanticTooltip(n, g);
  if (!tip) return undefined;
  // Keep only the first two segments and truncate
  const parts = tip.split(' | ').slice(0, 2).join(' • ');
  return truncate(parts, 64);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + '…';
}

function summarizeArgsFor(argTable: 'ModifierArguments'|'RequirementArguments', foreignKey: string, fkValue: string, g: Graph, maxItems: number): string | undefined {
  const items: string[] = [];
  let i = 0;
  for (const n of g.nodes.values()) {
    if (n.key.table !== argTable) continue;
    const r = n.row || {};
    if (String(r[foreignKey] || '') !== fkValue) continue;
    const name = String(r.Name ?? '');
    const value = String(r.Value ?? '');
    items.push(`${name}=${value}`);
    if (++i >= maxItems) break;
  }
  if (!items.length) return undefined;
  const more = countArgsFor(argTable, foreignKey, fkValue, g) - items.length;
  return `Args: ${items.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`;
}

function countArgsFor(argTable: 'ModifierArguments'|'RequirementArguments', foreignKey: string, fkValue: string, g: Graph): number {
  let c = 0;
  for (const n of g.nodes.values()) {
    if (n.key.table !== argTable) continue;
    const r = n.row || {};
    if (String(r[foreignKey] || '') !== fkValue) continue;
    c++;
  }
  return c;
}

function countOutgoing(from: NodeKey, g: Graph, label?: string, toTable?: string): number {
  let c = 0;
  for (const e of g.edges) {
    if (e.from.table !== from.table || e.from.id !== from.id) continue;
    if (label && e.label !== label) continue;
    if (toTable && e.to.table !== toTable) continue;
    c++;
  }
  return c;
}

// -----------------------------
// DOT styling helpers (Phase A)
// -----------------------------

function formatNodeLabel(table: string, id: string): string {
  const wrapped = wrapId(id, 24);
  const label = `${table}\n${wrapped}`.replace(/"/g, '\\"');
  return label;
}

function formatNodeLabelWithSemantic(table: string, id: string, semantic: string): string {
  const wrapped = wrapId(id, 24);
  const sem = wrapId(semantic, 28);
  const label = `${table}\n${wrapped}\n${sem}`.replace(/"/g, '\\"');
  return label;
}

function wrapId(id: string, maxLen: number): string {
  // Prefer breaking at underscores/hyphens
  const tokens = id.split(/([_-])/); // keep delimiters
  const lines: string[] = [];
  let current = '';
  for (const t of tokens) {
    const next = current ? current + t : t;
    if (next.length > maxLen && current) {
      lines.push(current);
      current = t.replace(/^[_-]/, '');
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  // Fallback if still very long
  const normalized = lines
    .flatMap(line => chunk(line, maxLen))
    .join('\n');
  return normalized;
}

function chunk(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

function nodeStyleAttrs(table: string): string {
  const styles: Record<string, { shape: string; fill: string; border: string; style?: string; pen?: number }> = {
    Leaders: { shape: 'box', fill: '#eef7ff', border: '#3f51b5', style: 'filled,rounded', pen: 1.4 },
    Civilizations: { shape: 'box', fill: '#eef7ff', border: '#3f51b5', style: 'filled,rounded', pen: 1.4 },
    Traits: { shape: 'ellipse', fill: '#e8f5e9', border: '#2e7d32', style: 'filled', pen: 1.6 },
    Modifiers: { shape: 'hexagon', fill: '#fff3e0', border: '#ef6c00', style: 'filled', pen: 1.6 },
    RequirementSets: { shape: 'box', fill: '#e3f2fd', border: '#1565c0', style: 'filled,rounded', pen: 1.6 },
    Requirements: { shape: 'note', fill: '#f3e5f5', border: '#6a1b9a', style: 'filled', pen: 1.4 },
    ModifierArguments: { shape: 'parallelogram', fill: '#fce4ec', border: '#ad1457', style: 'filled', pen: 1.2 },
    RequirementArguments: { shape: 'parallelogram', fill: '#ede7f6', border: '#4527a0', style: 'filled', pen: 1.2 },
  };
  const s = styles[table];
  if (!s) return '';
  const parts = [`shape=${s.shape}`, `fillcolor="${s.fill}"`, `color="${s.border}"`];
  if (s.style) parts.push(`style="${s.style}"`);
  if (s.pen) parts.push(`penwidth=${s.pen}`);
  return parts.join(', ');
}

function edgeStyleAttrs(label?: string): string {
  const primary = ['LeaderTraits', 'CivilizationTraits', 'TraitModifiers', 'Requirement'];
  const reqset = ['SubjectRequirementSetId', 'OwnerRequirementSetId', 'RequirementSetId'];
  if (label && primary.includes(label)) return 'color="#555555", style=solid, penwidth=1.6';
  if (label && reqset.includes(label)) return 'color="#1976d2", style=solid, penwidth=1.4';
  if (label === 'Attach') return 'color="#ef6c00", style=dashed, penwidth=1.3';
  if (label === 'Argument') return 'color="#9e9e9e", style=dotted, penwidth=1.0';
  // Heuristic: generic column-based links
  if (label && /Type$/.test(label)) return 'color="#888888", style=dotted, penwidth=1.0';
  return 'color="#777777", style=solid, penwidth=1.1';
}

// edgeColor helper removed (fan-out logic reverted)

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


