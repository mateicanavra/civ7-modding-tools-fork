import type { StandardRecipeConfig } from "../../../recipes/standard/recipe.js";

/**
 * Preset: realism/old-erosion
 *
 * Intended posture:
 * - Lower tectonic activity and subdued orogeny; smoother relief and coasts.
 */
export const realismOldErosionConfig: StandardRecipeConfig = {
  foundation: { knobs: { plateCount: "sparse", plateActivity: "low" } },
  "morphology-pre": { knobs: { seaLevel: "earthlike" } },
  "morphology-mid": { knobs: { erosion: "high", coastRuggedness: "smooth" } },
  "morphology-post": { knobs: { volcanism: "low" } },
  "map-morphology": { knobs: { orogeny: "low" } },
};

