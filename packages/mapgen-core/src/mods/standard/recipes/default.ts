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
