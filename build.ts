// Import all components
import { allCivilizations, civilizationAbilities, civilizationModifiers, civilizationImports } from "./src/civilizations";
import { allUnits, unitAbilities, unitModifiers, unitImports } from "./src/units";
import { allConstructibles, constructibleAbilities, constructibleModifiers, constructibleImports } from "./src/constructibles";
import { sharedModifiers, sharedAbilities, sharedUnlocks } from "./src/shared";
import { mod } from "./src/config";

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
