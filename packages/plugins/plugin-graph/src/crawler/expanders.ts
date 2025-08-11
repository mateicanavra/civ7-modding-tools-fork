import { COLUMN_TO_TABLE, PRIMARY_KEYS } from './constants';
import { Index, NodeKey, RowRecord } from '../types';
import { findBy, getByPk } from './queries';

export interface EdgeTarget { key: NodeKey; label?: string }
type Expander = (rr: RowRecord, idx: Index) => EdgeTarget[];

/**
 * Table-specific expansion rules for BFS crawling.
 * Keep focused and conservative; genericEdges handles common cross-table references via known columns.
 */
export const EXPANDERS: Record<string, Expander> = {
  Leaders: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const ltr of findBy('LeaderTraits', 'LeaderType', (rr.row as any).LeaderType, idx)) {
      if ((ltr.row as any).TraitType) out.push({ key: { table: 'Traits', id: String((ltr.row as any).TraitType) }, label: 'LeaderTraits' });
    }
    for (const hag of findBy('HistoricalAgendas' as any, 'LeaderType', (rr.row as any).LeaderType, idx)) {
      if ((hag.row as any).AgendaType) out.push({ key: { table: 'Agendas', id: String((hag.row as any).AgendaType) }, label: 'Agenda' });
    }
    return out;
  },
  Civilizations: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const ctr of findBy('CivilizationTraits', 'CivilizationType', (rr.row as any).CivilizationType, idx)) {
      if ((ctr.row as any).TraitType) out.push({ key: { table: 'Traits', id: String((ctr.row as any).TraitType) }, label: 'CivilizationTraits' });
    }
    for (const sbr of findBy('StartBiasTerrains' as any, 'CivilizationType', (rr.row as any).CivilizationType, idx)) {
      out.push({ key: { table: 'StartBiasTerrains' as any, id: `${(sbr.row as any).CivilizationType}:${(sbr.row as any).TerrainType}` }, label: 'StartBiasTerrains' });
    }
    for (const sbr of findBy('StartBiasResources' as any, 'CivilizationType', (rr.row as any).CivilizationType, idx)) {
      out.push({ key: { table: 'StartBiasResources' as any, id: `${(sbr.row as any).CivilizationType}:${(sbr.row as any).ResourceType}` }, label: 'StartBiasResources' });
    }
    return out;
  },
  Traits: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const tmr of findBy('TraitModifiers', 'TraitType', (rr.row as any).TraitType, idx)) {
      if ((tmr.row as any).ModifierId) out.push({ key: { table: 'Modifiers', id: String((tmr.row as any).ModifierId) }, label: 'TraitModifiers' });
    }
    return out;
  },
  Modifiers: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const col of ['SubjectRequirementSetId','OwnerRequirementSetId','RequirementSetId']) {
      const v = (rr.row as any)[col]; if (v) out.push({ key: { table: 'RequirementSets', id: String(v) }, label: col });
    }
    for (const mar of findBy('ModifierArguments', 'ModifierId', (rr.row as any).ModifierId, idx)) {
      out.push({ key: { table: 'ModifierArguments', id: `${(mar.row as any).ModifierId}:${(mar.row as any).Name}` }, label: 'Argument' });
      const name = String((mar.row as any).Name || '');
      const value = String((mar.row as any).Value || '');
      const targetTable = (COLUMN_TO_TABLE as any)[name];
      if (targetTable && value) {
        const pk = (PRIMARY_KEYS as any)[targetTable];
        if (pk && getByPk(targetTable, value, idx)) out.push({ key: { table: targetTable, id: value }, label: name });
      }
      if (name.toLowerCase() === 'modifierid' && value) {
        if (getByPk('Modifiers', value, idx)) out.push({ key: { table: 'Modifiers', id: value }, label: 'Attach' });
      }
    }
    return out;
  },
  RequirementSets: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const rsr of findBy('RequirementSetRequirements', 'RequirementSetId', (rr.row as any).RequirementSetId, idx)) {
      if ((rsr.row as any).RequirementId) out.push({ key: { table: 'Requirements', id: String((rsr.row as any).RequirementId) }, label: 'Requirement' });
    }
    return out;
  },
  Requirements: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const rar of findBy('RequirementArguments', 'RequirementId', (rr.row as any).RequirementId, idx)) {
      out.push({ key: { table: 'RequirementArguments', id: `${(rar.row as any).RequirementId}:${(rar.row as any).Name}` }, label: 'Argument' });
      const name = String((rar.row as any).Name || '');
      const value = String((rar.row as any).Value || '');
      const targetTable = (COLUMN_TO_TABLE as any)[name];
      if (targetTable && value) {
        const pk = (PRIMARY_KEYS as any)[targetTable];
        if (pk && getByPk(targetTable, value, idx)) out.push({ key: { table: targetTable, id: value }, label: name });
      }
    }
    return out;
  },
  Units: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const uam of findBy('UnitAbilityModifiers', 'UnitAbilityType', (rr.row as any).UnitAbilityType ?? (rr.row as any).AbilityType ?? '', idx)) {
      if ((uam.row as any).ModifierId) out.push({ key: { table: 'Modifiers', id: String((uam.row as any).ModifierId) }, label: 'UnitAbilityModifier' });
    }
    for (const k of ['ReplacesUnitType','UpgradesTo']) {
      const v = (rr.row as any)[k]; if (v && getByPk('Units', v, idx)) out.push({ key: { table: 'Units', id: String(v) }, label: k });
    }
    return out;
  },
  Improvements: (rr, idx) => {
    const out: EdgeTarget[] = [];
    for (const t of ['Improvement_YieldChanges','Improvement_ValidTerrains','Improvement_ValidFeatures','Improvement_AdjacentDistrictYields']) {
      const ti = idx.tables.get(t as any); if (!ti) continue;
      const col = 'ImprovementType';
      const map = ti.byCol.get(col); if (!map) continue;
      const list = map.get((rr.row as any).ImprovementType);
      if (list) {
        for (const r of list) out.push({ key: { table: t as any, id: `${(r.row as any).ImprovementType}:${Object.values(r.row).join('|')}` }, label: t });
      }
    }
    return out;
  },
};

/** Generic linker: for any known column→table mapping, follow to the target table if the row exists. */
export function genericEdges(rr: RowRecord, idx: Index): EdgeTarget[] {
  const out: EdgeTarget[] = [];
  for (const [col, targetTable] of Object.entries(COLUMN_TO_TABLE as Record<string, string>)) {
    const v = (rr.row as any)[col];
    if (typeof v === 'string' && (PRIMARY_KEYS as any)[targetTable]) {
      if (getByPk(targetTable, v, idx)) out.push({ key: { table: targetTable, id: v }, label: col });
    }
  }
  return out;
}


