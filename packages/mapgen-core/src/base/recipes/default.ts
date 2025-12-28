import type { RecipeV1 } from "@mapgen/engine/execution-plan.js";

export const BASE_RECIPE_STEP_IDS = [
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
  "derivePlacementInputs",
  "placement",
] as const;

export const baseDefaultRecipe: RecipeV1 = {
  schemaVersion: 1,
  id: "core.base",
  steps: BASE_RECIPE_STEP_IDS.map((id) => ({ id })),
};

