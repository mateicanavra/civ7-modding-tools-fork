import type { StandardRecipeConfig } from "../../../recipes/standard/recipe.js";

/**
 * Preset: realism/young-tectonics
 *
 * Intended posture:
 * - More active margins and stronger orogeny; higher volcanism and erosion.
 */
export const realismYoungTectonicsConfig: StandardRecipeConfig = {
  foundation: { knobs: { plateCount: "dense", plateActivity: "high" } },
  "morphology-pre": { knobs: { seaLevel: "earthlike" } },
  "morphology-mid": { knobs: { erosion: "high", coastRuggedness: "rugged" } },
  "morphology-post": { knobs: { volcanism: "high" } },
  "map-morphology": { knobs: { orogeny: "high" } },
};

