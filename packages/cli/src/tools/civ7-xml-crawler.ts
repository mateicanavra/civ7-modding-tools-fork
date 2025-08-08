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
 * Dependencies
 * ------------
 *   npm i fast-xml-parser
 * (You can replace the simple directory walk with globby if you want multi-root globbing.)
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

// -----------------------------
// Types
// -----------------------------

export type Row = Record<string, any> & { __table?: string; __file?: string };

export interface RowRecord {
  table: string;
  key?: string; // optional for composite tables
  row: Row;
  file: string;
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
// Config: primary keys & mappers
// -----------------------------

const PRIMARY_KEYS: Record<string, string> = {
  Types: 'Type',
  Traits: 'TraitType',
  Leaders: 'LeaderType',
  Civilizations: 'CivilizationType',
  LeaderTraits: '', // composite, no single PK
  CivilizationTraits: '',
  Modifiers: 'ModifierId',
  ModifierArguments: '',
  RequirementSets: 'RequirementSetId',
  RequirementSetRequirements: '',
  Requirements: 'RequirementId',
  RequirementArguments: '',
  Units: 'UnitType',
  UnitAbilities: 'UnitAbilityType', // sometimes 'AbilityType' in Civ6
  UnitAbilityModifiers: '',
  Buildings: 'BuildingType',
  Districts: 'DistrictType',
  Improvements: 'ImprovementType',
  Resources: 'ResourceType',
  Technologies: 'TechnologyType',
  Civics: 'CivicType',
  Agendas: 'AgendaType',
  // Common improvement aux tables — all composite
  Improvement_YieldChanges: '',
  Improvement_ValidTerrains: '',
  Improvement_ValidFeatures: '',
  Improvement_AdjacentDistrictYields: '',
};

// Map common column names to target table for generic linking
const COLUMN_TO_TABLE: Record<string, string> = {
  TraitType: 'Traits',
  LeaderType: 'Leaders',
  CivilizationType: 'Civilizations',
  ModifierId: 'Modifiers',
  RequirementSetId: 'RequirementSets',
  RequirementId: 'Requirements',
  UnitType: 'Units',
  UnitAbilityType: 'UnitAbilities',
  AbilityType: 'UnitAbilities',
  BuildingType: 'Buildings',
  DistrictType: 'Districts',
  ImprovementType: 'Improvements',
  ResourceType: 'Resources',
  TechnologyType: 'Technologies',
  CivicType: 'Civics',
  AgendaType: 'Agendas',
};

// Prefix guessing if only an ID is provided as a seed (e.g. TRAIT_*, UNIT_*, etc.)
const PREFIX_TO_TABLE: Array<[RegExp, string]> = [
  [/^LEADER_/, 'Leaders'],
  [/^CIVILIZATION_/, 'Civilizations'],
  [/^TRAIT_/, 'Traits'],
  [/^MODIFIER_/, 'Modifiers'],
  [/^REQUIREMENTSET_/, 'RequirementSets'],
  [/^REQUIREMENT_/, 'Requirements'],
  [/^UNIT_/, 'Units'],
  [/^BUILDING_/, 'Buildings'],
  [/^DISTRICT_/, 'Districts'],
  [/^IMPROVEMENT_/, 'Improvements'],
  [/^RESOURCE_/, 'Resources'],
  [/^TECH_|^TECHNOLOGY_/, 'Technologies'],
  [/^CIVIC_/, 'Civics'],
  [/^AGENDA_/, 'Agendas'],
];

// -----------------------------
// XML Parsing & Indexing
// -----------------------------

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

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
  return out.sort();
}

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

export async function buildIndexFromXml(root: string): Promise<Index> {
  const files = await findXmlFiles(root);
  const tables = new Map<string, TableIndex>();
  for (const file of files) {
    try {
      const text = await fs.readFile(file, 'utf8');
      const obj = parser.parse(text);
      const tablesInFile = findTables(obj);
      for (const [table, rows] of Object.entries(tablesInFile)) {
        if (!tables.has(table)) tables.set(table, { table, rows: [], byCol: new Map() });
        const ti = tables.get(table)!;
        for (const raw of rows) {
          const row: Row = normalizeRow(raw);
          row.__table = table; row.__file = file;
          const rr: RowRecord = { table, key: getPrimaryKey(table, row), row, file };
          ti.rows.push(rr);
          // index common columns
          for (const [col, val] of Object.entries(row)) {
            if (typeof val !== 'string') continue;
            let map = ti.byCol.get(col);
            if (!map) { map = new Map(); ti.byCol.set(col, map); }
            const list = map.get(val) || [];
            list.push(rr); map.set(val, list);
          }
        }
      }
    } catch (e) {
      // swallow parser errors, but you could log
      // console.warn('Parse error', file, e);
    }
  }
  return { tables };
}

function normalizeRow(raw: any): Row {
  // fast-xml-parser flattens attributes into keys already; ensure nested tags are also flattened if trivial
  return raw as Row;
}

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

function findBy(table: string, col: string, val: string, idx: Index): RowRecord[] {
  const ti = idx.tables.get(table); if (!ti) return [];
  const colIdx = ti.byCol.get(col); if (!colIdx) return [];
  return colIdx.get(val) || [];
}

function getByPk(table: string, id: string, idx: Index): RowRecord | undefined {
  const pk = PRIMARY_KEYS[table]; if (!pk) return undefined;
  const matches = findBy(table, pk, id, idx);
  return matches[0];
}

function guessTableFromId(id: string): string | undefined {
  for (const [re, table] of PREFIX_TO_TABLE) if (re.test(id)) return table;
  return undefined;
}

// -----------------------------
// Expanders (table-specific graph edges)
// -----------------------------

type Expander = (rr: RowRecord, idx: Index) => NodeKey[];

const EXPANDERS: Record<string, Expander> = {
  Leaders: (rr, idx) => {
    const out: NodeKey[] = [];
    for (const ltr of findBy('LeaderTraits', 'LeaderType', rr.row.LeaderType, idx)) {
      if (ltr.row.TraitType) out.push({ table: 'Traits', id: String(ltr.row.TraitType) });
    }
    // Agendas (if present)
    for (const hag of findBy('HistoricalAgendas' as any, 'LeaderType', rr.row.LeaderType, idx)) {
      if (hag.row.AgendaType) out.push({ table: 'Agendas', id: String(hag.row.AgendaType) });
    }
    return out;
  },
  Civilizations: (rr, idx) => {
    const out: NodeKey[] = [];
    for (const ctr of findBy('CivilizationTraits', 'CivilizationType', rr.row.CivilizationType, idx)) {
      if (ctr.row.TraitType) out.push({ table: 'Traits', id: String(ctr.row.TraitType) });
    }
    // Start biases
    for (const sbr of findBy('StartBiasTerrains' as any, 'CivilizationType', rr.row.CivilizationType, idx)) {
      out.push({ table: 'StartBiasTerrains' as any, id: `${sbr.row.CivilizationType}:${sbr.row.TerrainType}` });
    }
    for (const sbr of findBy('StartBiasResources' as any, 'CivilizationType', rr.row.CivilizationType, idx)) {
      out.push({ table: 'StartBiasResources' as any, id: `${sbr.row.CivilizationType}:${sbr.row.ResourceType}` });
    }
    return out;
  },
  Traits: (rr, idx) => {
    const out: NodeKey[] = [];
    for (const tmr of findBy('TraitModifiers', 'TraitType', rr.row.TraitType, idx)) {
      if (tmr.row.ModifierId) out.push({ table: 'Modifiers', id: String(tmr.row.ModifierId) });
    }
    return out;
  },
  Modifiers: (rr, idx) => {
    const out: NodeKey[] = [];
    // Link to RequirementSets
    for (const col of ['SubjectRequirementSetId','OwnerRequirementSetId','RequirementSetId']) {
      const v = rr.row[col]; if (v) out.push({ table: 'RequirementSets', id: String(v) });
    }
    // Link to ModifierArguments
    for (const mar of findBy('ModifierArguments', 'ModifierId', rr.row.ModifierId, idx)) {
      out.push({ table: 'ModifierArguments', id: `${mar.row.ModifierId}:${mar.row.Name}` });
      // Opportunistically follow argument references (e.g., ImprovementType, UnitType, DistrictType, etc.)
      const name = String(mar.row.Name || '');
      const value = String(mar.row.Value || '');
      const targetTable = COLUMN_TO_TABLE[name as keyof typeof COLUMN_TO_TABLE];
      if (targetTable && value) {
        const pk = PRIMARY_KEYS[targetTable];
        if (pk && getByPk(targetTable, value, idx)) out.push({ table: targetTable, id: value });
      }
    }
    return out;
  },
  RequirementSets: (rr, idx) => {
    const out: NodeKey[] = [];
    for (const rsr of findBy('RequirementSetRequirements', 'RequirementSetId', rr.row.RequirementSetId, idx)) {
      if (rsr.row.RequirementId) out.push({ table: 'Requirements', id: String(rsr.row.RequirementId) });
    }
    return out;
  },
  Requirements: (rr, idx) => {
    const out: NodeKey[] = [];
    for (const rar of findBy('RequirementArguments', 'RequirementId', rr.row.RequirementId, idx)) {
      out.push({ table: 'RequirementArguments', id: `${rar.row.RequirementId}:${rar.row.Name}` });
      const name = String(rar.row.Name || '');
      const value = String(rar.row.Value || '');
      const targetTable = COLUMN_TO_TABLE[name as keyof typeof COLUMN_TO_TABLE];
      if (targetTable && value) {
        const pk = PRIMARY_KEYS[targetTable];
        if (pk && getByPk(targetTable, value, idx)) out.push({ table: targetTable, id: value });
      }
    }
    return out;
  },
  Units: (rr, idx) => {
    const out: NodeKey[] = [];
    // UnitAbilities
    for (const uam of findBy('UnitAbilityModifiers', 'UnitAbilityType', rr.row.UnitAbilityType ?? rr.row.AbilityType ?? '', idx)) {
      if (uam.row.ModifierId) out.push({ table: 'Modifiers', id: String(uam.row.ModifierId) });
    }
    // Replacement/Upgrade link guesses
    for (const k of ['ReplacesUnitType','UpgradesTo']) {
      const v = rr.row[k]; if (v && getByPk('Units', v, idx)) out.push({ table: 'Units', id: String(v) });
    }
    return out;
  },
  Improvements: (rr, idx) => {
    const out: NodeKey[] = [];
    for (const t of ['Improvement_YieldChanges','Improvement_ValidTerrains','Improvement_ValidFeatures','Improvement_AdjacentDistrictYields']) {
      const ti = idx.tables.get(t); if (!ti) continue;
      const col = 'ImprovementType';
      const map = ti.byCol.get(col); if (!map) continue;
      const list = map.get(rr.row.ImprovementType);
      if (list) {
        for (const r of list) out.push({ table: t, id: `${r.row.ImprovementType}:${Object.values(r.row).join('|')}` });
      }
    }
    return out;
  },
};

// Generic linker: any known column => follow to target table
function genericEdges(rr: RowRecord, idx: Index): NodeKey[] {
  const out: NodeKey[] = [];
  for (const [col, targetTable] of Object.entries(COLUMN_TO_TABLE)) {
    const v = rr.row[col];
    if (typeof v === 'string' && PRIMARY_KEYS[targetTable]) {
      if (getByPk(targetTable, v, idx)) out.push({ table: targetTable, id: v });
    }
  }
  return out;
}

function nkToStr(nk: NodeKey): string { return `${nk.table}|${nk.id}`; }

// -----------------------------
// Crawl
// -----------------------------

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
    const nextKeys: NodeKey[] = [
      ...(ex ? ex(curRR, idx) : []),
      ...genericEdges(curRR, idx),
    ];

    for (const nk of nextKeys) {
      const before = nkToStr(cur);
      const after = nkToStr(nk);
      if (!getByPk(nk.table, nk.id, idx)) continue;
      graph.edges.push({ from: cur, to: nk });
      enqueue(nk);
    }
  }

  const manifestFiles = Array.from(new Set(Array.from(graph.nodes.values()).map(n => n.file))).sort();
  return { graph, manifestFiles };
}

// -----------------------------
// Export helpers
// -----------------------------

export function graphToJson(g: Graph) {
  return {
    nodes: Array.from(g.nodes.values()).map(n => ({ table: n.key.table, id: n.key.id, file: n.file, row: n.row })),
    edges: g.edges.map(e => ({ from: `${e.from.table}:${e.from.id}`, to: `${e.to.table}:${e.to.id}`, label: e.label })),
  };
}

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


