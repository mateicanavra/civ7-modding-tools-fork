// Centralized constants for Civ XML crawler

export const PRIMARY_KEYS: Record<string, string> = {
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
export const COLUMN_TO_TABLE: Record<string, string> = {
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
export const PREFIX_TO_TABLE: Array<[RegExp, string]> = [
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


