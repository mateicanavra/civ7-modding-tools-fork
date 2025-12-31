/**
 * Gate A Continents - TypeScript Pipeline Validation
 *
 * This minimal map entry proves the TypeScript build pipeline works.
 *
 * Once Gate A passes (game loads without errors), the real swooper maps
 * will be migrated to TypeScript in Gate B/C.
 */

/// <reference types="@civ7/types" />

// Ensure Civ7's V8 runtime has a TextEncoder implementation before dependencies initialize.
import "@swooper/mapgen-core/polyfills/text-encoder";
import { VERSION } from "@swooper/mapgen-core";

import standardRecipe from "../recipes/standard/recipe.js";
import { applyMapInitData, resolveMapInitData } from "./_runtime/map-init.js";
import { runStandardRecipe } from "./_runtime/run-standard.js";
import type { MapInitResolution } from "./_runtime/map-init.js";
import type { MapRuntimeOptions } from "./_runtime/types.js";
import type { StandardRecipeOverrides } from "./_runtime/standard-config.js";

function buildConfig(): StandardRecipeOverrides {
  return {};
}

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SWOOPER_MOD]" };
let mapInitData: MapInitResolution | null = null;

engine.on("RequestMapInitData", (initParams) => {
  mapInitData = applyMapInitData(runtimeOptions, initParams);
});

engine.on("GenerateMap", () => {
  const overrides = buildConfig();
  const init = mapInitData ?? resolveMapInitData(runtimeOptions);
  runStandardRecipe({ recipe: standardRecipe, init, overrides, options: runtimeOptions });
});

// Gate A marker - proves TypeScript pipeline is working
console.log(`[Swooper] Gate A Wrapper Loaded - TypeScript Build Pipeline Working`);
console.log(`[Swooper] mapgen-core version: ${VERSION}`);
