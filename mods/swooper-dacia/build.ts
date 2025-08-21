// Import all components
import { allCivilizations, civilizationAbilities, civilizationModifiers, civilizationImports } from "@civilizations";
import { allUnits, unitAbilities, unitModifiers, unitImports } from "@units";
import { allConstructibles, constructibleAbilities, constructibleModifiers, constructibleImports } from "@constructibles";
import { sharedModifiers, sharedAbilities, sharedUnlocks } from "@shared";
import { mod } from "@mod";

// Add all components to the mod
mod.add([
	// Main entities
	...allCivilizations,
	...allUnits,
	...allConstructibles,
	...sharedUnlocks,
	
	// Abilities from all package types
	...civilizationAbilities,
	...unitAbilities,
	...constructibleAbilities,
	...sharedAbilities,
	
	// Modifiers from all package types
	...civilizationModifiers,
	...unitModifiers,
	...constructibleModifiers,
	...sharedModifiers,
	
	// Imports from all package types
	...civilizationImports,
	...unitImports,
	...constructibleImports
]);

// Build the mod to the dist directory
mod.build("./dist");
