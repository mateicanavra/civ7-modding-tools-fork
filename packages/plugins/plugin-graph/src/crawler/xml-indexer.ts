import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { PRIMARY_KEYS } from './constants';
import { Index, Row, RowRecord, TableIndex } from '../types';

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
  return out.sort((a, b) => a.localeCompare(b));
}

/** Collect classic Civ-style tables from a parsed Database XML object. */
function findTables(obj: any, acc: Record<string, any[]> = {}): Record<string, any[]> {
  if (!obj || typeof obj !== 'object') return acc;
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    if (typeof v === 'object' && 'Row' in (v as any)) {
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

/** Collect <Delete .../> nodes grouped by table for layering semantics. */
function findDeletes(obj: any, acc: Record<string, any[]> = {}): Record<string, any[]> {
  if (!obj || typeof obj !== 'object') return acc;
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    if (typeof v === 'object' && 'Delete' in (v as any)) {
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
    if (k !== undefined) return (obj as any)[k];
  }
  return undefined;
}

/** Read a value from an <Argument ...> node supporting both attribute and inner-text styles. */
function readArgumentValue(node: any): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const explicit = getAttrCaseInsensitive(node, 'Value');
  if (explicit !== undefined) return String(explicit);
  if (typeof (node as any)['#text'] !== 'undefined') return String((node as any)['#text']);
  const txt = getAttrCaseInsensitive(node, 'Text');
  if (txt !== undefined) return String(txt);
  return undefined;
}

/** Locate <GameEffects> blocks anywhere in a parsed XML tree. */
function collectGameEffectsRoots(obj: any, out: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    if (k === 'GameEffects' && typeof v === 'object') out.push(v);
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

/** Build an in-memory index from Civ-style XML root. */
export async function buildIndexFromXml(root: string): Promise<Index> {
  const files = await findXmlFiles(root);
  const tables = new Map<string, TableIndex>();
  const deleteSpecs: DeleteSpec[] = [];
  let seqCounter = 0;

  function ensureTable(table: string): TableIndex {
    if (!tables.has(table)) tables.set(table, { table, rows: [], byCol: new Map() });
    return tables.get(table)!;
  }

  function indexRow(table: string, row: Row, file: string) {
    const ti = ensureTable(table);
    row.__table = table;
    row.__file = file;
    const rr: RowRecord = { table, key: getPrimaryKey(table, row), row, file, seq: seqCounter++ };
    ti.rows.push(rr);
    for (const [col, val] of Object.entries(row)) {
      if (typeof val !== 'string') continue;
      let map = ti.byCol.get(col);
      if (!map) { map = new Map(); ti.byCol.set(col, map); }
      const list = map.get(val) || [];
      list.push(rr); map.set(val, list);
    }
  }

  function addDelete(table: string, whereRaw: any, file: string) {
    const where: Record<string, string> = {};
    for (const [k, v] of Object.entries(whereRaw || {})) {
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

      const tablesInFile = findTables(obj);
      for (const [table, rows] of Object.entries(tablesInFile)) {
        for (const raw of rows) {
          const row: Row = normalizeRow(raw);
          indexRow(table, row, file);
        }
      }

      const deletesInFile = findDeletes(obj);
      for (const [table, dels] of Object.entries(deletesInFile)) {
        for (const d of dels) addDelete(table, d, file);
      }

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

          const subjReqs = getAttrCaseInsensitive(mod, 'SubjectRequirements');
          const ownerReqs = getAttrCaseInsensitive(mod, 'OwnerRequirements');

          if (subjReqs && typeof subjReqs === 'object') {
            const setId = `REQSET_${modId}_SUBJECT`;
            (synthesized as any)['SubjectRequirementSetId'] = setId;
            const setType = String(getAttrCaseInsensitive(subjReqs, 'type', 'Type') || '');
            indexRow('RequirementSets', { RequirementSetId: setId, RequirementSetType: setType }, file);
            const reqs = toArray(getAttrCaseInsensitive(subjReqs, 'Requirement'));
            let i = 0;
            for (const r of reqs) {
              const reqId = `REQ_${modId}_SUBJECT_${i++}`;
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

          if (ownerReqs && typeof ownerReqs === 'object') {
            const setId = `REQSET_${modId}_OWNER`;
            (synthesized as any)['OwnerRequirementSetId'] = setId;
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

          indexRow('Modifiers', synthesized, file);

          const args = toArray(getAttrCaseInsensitive(mod, 'Argument'));
          for (const a of args) {
            const name = String(getAttrCaseInsensitive(a, 'name', 'Name') || '');
            const value = readArgumentValue(a) || '';
            indexRow('ModifierArguments', { ModifierId: modId, Name: name, Value: value }, file);
          }
        }
      }
    } catch {
      // ignore parse errors for now
    }
  }

  if (deleteSpecs.length) {
    for (const [table, ti] of tables.entries()) {
      const relevantDeletes = deleteSpecs.filter((d) => d.table === table);
      if (!relevantDeletes.length) continue;
      for (const rr of ti.rows) {
        for (const del of relevantDeletes) {
          if (del.seq > rr.seq) {
            let match = true;
            for (const [k, v] of Object.entries(del.where)) {
              if (String((rr.row as any)[k]) !== String(v)) { match = false; break; }
            }
            if (match) { (rr as RowRecord).deleted = true; break; }
          }
        }
      }
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

/** Normalize a raw parsed <Row> payload. */
function normalizeRow(raw: any): Row { return raw as Row; }

/** Return the primary key value for a row if known, with basic fallbacks. */
function getPrimaryKey(table: string, row: Row): string | undefined {
  const pk = (PRIMARY_KEYS as any)[table];
  if (pk && (row as any)[pk]) return String((row as any)[pk]);
  for (const k of ['Type','Id','ID','RowId','Name']) if ((row as any)[k]) return String((row as any)[k]);
  return undefined;
}


