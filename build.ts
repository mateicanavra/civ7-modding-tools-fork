// Import all components
import { allImports } from "./src/imports";
import { allCivilizations } from "./src/civilizations";
import { allUnits } from "./src/units";
import { allConstructibles } from "./src/constructibles";
import { allUnlocks } from "./src/unlocks";
import { allModifiers } from "./src/modifiers";
import { claimResourceAbilityFiles } from "./src/abilities";
import { mod } from "./src/config";

// Add all components to the mod
mod.add([
	...allCivilizations,
	...allImports,
	...allUnits,
	...allConstructibles,
	...allUnlocks,
	...allModifiers
]);

// Add file-based abilities
mod.addFiles(claimResourceAbilityFiles);

// Build the mod to the dist directory
mod.build("./dist");
