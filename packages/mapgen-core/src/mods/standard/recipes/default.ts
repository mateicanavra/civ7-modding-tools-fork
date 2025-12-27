import type { StageManifest } from "@mapgen/bootstrap/types.js";
import type { RecipeStepV1, RecipeV1 } from "@mapgen/pipeline/execution-plan.js";

export const STANDARD_RECIPE_STEP_IDS = [
  "foundation",
  "landmassPlates",
  "coastlines",
  "storySeed",
  "storyHotspots",
  "storyRifts",
  "ruggedCoasts",
  "storyOrogeny",
  "storyCorridorsPre",
  "islands",
  "mountains",
  "volcanoes",
  "lakes",
  "climateBaseline",
  "storySwatches",
  "rivers",
  "storyCorridorsPost",
  "climateRefine",
  "biomes",
  "features",
  "placement",
] as const;

export const defaultRecipe: RecipeV1 = {
  schemaVersion: 1,
  id: "core.standard",
  steps: STANDARD_RECIPE_STEP_IDS.map((id) => ({ id })),
};

export function resolveDefaultRecipeSteps(
  stageManifest: StageManifest | undefined
): RecipeStepV1[] {
  const order = Array.isArray(stageManifest?.order) ? stageManifest!.order : [];
  if (order.length === 0) return [];

  const allowed = new Set(order);
  const stages = stageManifest?.stages ?? {};
  return defaultRecipe.steps.filter(
    (step) => allowed.has(step.id) && stages[step.id]?.enabled !== false
  );
}

export function resolveDefaultRecipeStepIds(
  stageManifest: StageManifest | undefined
): string[] {
  return resolveDefaultRecipeSteps(stageManifest).map((step) => step.id);
}
