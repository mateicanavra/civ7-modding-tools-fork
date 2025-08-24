import { 
  UnitBuilder, 
  AbilityBuilder, 
  ModifierBuilder, 
  CivilizationBuilder, 
  ConstructibleBuilder,
  UnlockBuilder,
  CivilizationUnlockBuilder,
  LeaderUnlockBuilder,
  ImportFileBuilder
} from '@mateicanavra/civ7-sdk';

/**
 * Type for import file configuration
 */
export type ImportConfig = {
  path: string;
} | ImportFileBuilder;

/**
 * Interface for unit packages that groups a unit with its optional components
 */
export interface UnitPackage {
  unit: UnitBuilder;
  abilities?: AbilityBuilder[];
  modifiers?: ModifierBuilder[];
  imports?: ImportFileBuilder[];
}

/**
 * Interface for civilization packages that groups a civilization with its optional components
 */
export interface CivilizationPackage {
  civilization: CivilizationBuilder;
  modifiers?: ModifierBuilder[];
  imports?: ImportFileBuilder[];
  unlocks?: {
    civilizations?: CivilizationUnlockBuilder[];
    leaders?: LeaderUnlockBuilder[];
  };
}

/**
 * Interface for constructible packages that groups a constructible with its optional components
 */
export interface ConstructiblePackage {
  constructible: ConstructibleBuilder;
  modifiers?: ModifierBuilder[];
  imports?: ImportFileBuilder[];
}

/**
 * Interface for unlock packages that groups an unlock with its abilities and modifiers
 */
export interface UnlockPackage {
  unlock: UnlockBuilder | CivilizationUnlockBuilder | LeaderUnlockBuilder;
  abilities: AbilityBuilder[];
  modifiers: ModifierBuilder[];
}

/**
 * Interface for civilization unlock packages that groups a civilization unlock with its abilities and modifiers
 */
export interface CivilizationUnlockPackage {
  unlock: CivilizationUnlockBuilder;
  abilities: AbilityBuilder[];
  modifiers: ModifierBuilder[];
}

/**
 * Interface for leader unlock packages that groups a leader unlock with its abilities and modifiers
 */
export interface LeaderUnlockPackage {
  unlock: LeaderUnlockBuilder;
  abilities: AbilityBuilder[];
  modifiers: ModifierBuilder[];
} 