import type { StandardRecipeConfig } from "../../../recipes/standard/recipe.js";

/**
 * Preset: realism/earthlike
 *
 * Intended posture:
 * - Defaults-first realism baseline with light semantic tuning via knobs.
 * - Authors can further tune using stage knobs without editing step-level config trees.
 */
export const realismEarthlikeConfig: StandardRecipeConfig = {
  foundation: { knobs: { plateCount: "normal", plateActivity: "normal" } },
  "morphology-pre": { knobs: { seaLevel: "earthlike" } },
  "morphology-mid": { knobs: { erosion: "normal", coastRuggedness: "normal" } },
  "morphology-post": { knobs: { volcanism: "normal" } },
  "map-morphology": { knobs: { orogeny: "normal" } },
};

