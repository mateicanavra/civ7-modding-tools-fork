/**
 * Utility functions for package management
 */
import { UnitPackage, CivilizationPackage, ConstructiblePackage, UnlockPackage } from './types';

/**
 * Extracts components from packages of any type
 * @param packages An array of packages (units, civs, constructibles, etc.)
 * @param entityKey The key of the main entity in the package
 * @returns Object containing the main entities, abilities, modifiers and imports
 * @example
 * const { entities, abilities, modifiers, imports } = extractComponents(unitPackages, 'unit');
 */
export function extractComponents<T extends {
  abilities?: any[],
  modifiers?: any[],
  imports?: any[]
}>(packages: T[], entityKey: keyof T) {
  return {
    entities: packages.map(pkg => pkg[entityKey]),
    abilities: packages.flatMap(pkg => pkg.abilities || []),
    modifiers: packages.flatMap(pkg => pkg.modifiers || []),
    imports: packages.flatMap(pkg => pkg.imports || [])
  };
}
