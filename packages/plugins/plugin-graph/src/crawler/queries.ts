import { PREFIX_TO_TABLE, PRIMARY_KEYS } from './constants';
import { Index, RowRecord } from '../types';

/** Lookup rows by a specific column value using the prebuilt column index. */
export function findBy(table: string, col: string, val: string, idx: Index): RowRecord[] {
  const ti = idx.tables.get(table);
  if (!ti) return [];
  const colIdx = ti.byCol.get(col);
  if (!colIdx) return [];
  const list = colIdx.get(val) || [];
  return list.filter((rr) => !rr.deleted);
}

/** Resolve a single row by primary key using last-write-wins (latest sequence). */
export function getByPk(table: string, id: string, idx: Index): RowRecord | undefined {
  const pk = (PRIMARY_KEYS as any)[table];
  if (!pk) return undefined;
  const matches = findBy(table, pk, id, idx);
  let latest: RowRecord | undefined;
  for (const rr of matches) {
    if (!latest || rr.seq > latest.seq) latest = rr;
  }
  return latest;
}

/** Guess a table name from a well-known ID prefix (e.g., LEADER_*, MODIFIER_*). */
export function guessTableFromId(id: string): string | undefined {
  for (const [re, table] of (PREFIX_TO_TABLE as Array<[RegExp, string]>)) {
    if (re.test(id)) return table;
  }
  return undefined;
}


