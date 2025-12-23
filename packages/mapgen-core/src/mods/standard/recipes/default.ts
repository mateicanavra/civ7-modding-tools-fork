import type { StageManifest } from "@mapgen/config/index.js";
import type { RecipeV1 } from "@mapgen/pipeline/execution-plan.js";

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

export function resolveDefaultRecipeStepIds(
  stageManifest: StageManifest | null | undefined
): string[] {
  if (!stageManifest?.stages) return [...STANDARD_RECIPE_STEP_IDS];
  return STANDARD_RECIPE_STEP_IDS.filter(
    (stepId) => stageManifest.stages?.[stepId]?.enabled !== false
  );
}
