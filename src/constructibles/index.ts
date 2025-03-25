/**
 * Exports all constructibles using the ConstructiblePackage pattern.
 */

// Export everything from individual files
export * from "./mountain-sanctuary";

// Import packages for collection
import { mountainSanctuary } from "./mountain-sanctuary";
import { murusDacicus } from "./murus-dacicus";
import { extractComponents } from "../utils";

// Collect all constructible packages
export const constructiblePackages = [mountainSanctuary, murusDacicus];

// Extract and export components
const {
	entities: allConstructibles,
	abilities: constructibleAbilities,
	modifiers: constructibleModifiers,
	imports: constructibleImports,
} = extractComponents(constructiblePackages, 'constructible');

export {
	allConstructibles,
	constructibleAbilities,
	constructibleModifiers,
	constructibleImports,
};
