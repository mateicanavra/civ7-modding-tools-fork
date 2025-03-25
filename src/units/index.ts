/**
 * Centralized exports for unit components.
 *
 * This file imports and exports all unit-related components
 * using the UnitPackage pattern.
 */

// Export everything from individual files (barrel export)
export * from "./murus-engineer";
export * from "./falxman";

// Import packages for collection
import { murusEngineer } from "./murus-engineer";
import { falxman } from "./falxman";
import { extractComponents } from "../utils";

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
