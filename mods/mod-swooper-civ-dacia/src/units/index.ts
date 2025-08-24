/**
 * Centralized exports for unit components.
 *
 * This file imports and exports all unit-related components
 * using the UnitPackage pattern.
 */

// Export everything from individual files (barrel export)
export * from '@units/murus-engineer';
export * from '@units/falxman';

// Import packages for collection
import { murusEngineer } from '@units/murus-engineer';
import { falxman } from '@units/falxman';
import { extractComponents } from '@utils';

// Collect all unit packages
export const unitPackages = [murusEngineer, falxman];

// Extract and export components
const {
	entities: allUnits,
	abilities: unitAbilities,
	modifiers: unitModifiers,
	imports: unitImports,
} = extractComponents(unitPackages, 'unit');

export { allUnits, unitAbilities, unitModifiers, unitImports };
