import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";

/**
 * Swooper Earthlike — Hydrology posture overrides.
 *
 * This keeps the primary map config small while still allowing “earthlike” climate tuning to be
 * reasoned about and iterated in one place.
 */
export const swooperEarthlikeHydrologyConfig = {
  "hydrology-climate-baseline": {
    knobs: {
      dryness: "mix",
      temperature: "hot",
      seasonality: "high",
      oceanCoupling: "earthlike",
    },
    "climate-baseline": {
      seasonality: {
        axialTiltDeg: 29.44,
        modeCount: 4,
      },
      computeAtmosphericCirculation: {
        strategy: "default",
        config: {
          windJetStrength: 1.5,
          windVariance: 0.35,
          windJetStreaks: 4,
        },
      },
    },
  },
  "hydrology-hydrography": {
    knobs: {
      riverDensity: "dense",
    },
  },
  "hydrology-climate-refine": {
    knobs: {
      dryness: "mix",
      temperature: "hot",
      cryosphere: "on",
    },
  },
  "map-hydrology": {
    knobs: {
      lakeiness: "normal",
      riverDensity: "dense",
    },
  },
} satisfies Pick<
  StandardRecipeConfig,
  "hydrology-climate-baseline" | "hydrology-hydrography" | "hydrology-climate-refine" | "map-hydrology"
>;

