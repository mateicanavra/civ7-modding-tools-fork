import type { StandardRecipeConfig } from "../../../recipes/standard/recipe.js";

/**
 * Preset: realism/earthlike
 *
 * Intended posture:
 * - Defaults-first realism baseline with light semantic tuning via knobs.
 * - Authors can further tune using stage knobs without editing step-level config trees.
 */
export function createRealismEarthlikeConfig(): StandardRecipeConfig {
  return {
    foundation: { knobs: { plateCount: "normal", plateActivity: "normal" } },
    "morphology-pre": { knobs: { seaLevel: "earthlike" } },
    "morphology-mid": { knobs: { erosion: "normal", coastRuggedness: "normal" } },
    "morphology-post": { knobs: { volcanism: "normal" } },
    "hydrology-climate-baseline": {
      knobs: { dryness: "dry", temperature: "temperate", seasonality: "normal", oceanCoupling: "earthlike" },
    },
    "hydrology-hydrography": { knobs: { riverDensity: "normal" } },
    "hydrology-climate-refine": { knobs: { dryness: "dry", temperature: "temperate", cryosphere: "on" } },
    "map-morphology": { knobs: { orogeny: "normal" } },
  };
}

export const realismEarthlikeConfig = createRealismEarthlikeConfig();
