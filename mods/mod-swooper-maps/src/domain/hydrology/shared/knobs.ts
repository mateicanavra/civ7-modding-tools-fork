import { Type, type Static } from "@swooper/mapgen-core/authoring";

/**
 * Hydrology dryness knob (semantic intent).
 *
 * Meaning:
 * - Global moisture availability bias (not regional “paint”).
 *
 * Stage scope:
 * - Used by `hydrology-climate-baseline` and `hydrology-climate-refine`.
 */
export const HydrologyDrynessKnobSchema = Type.Union(
  [Type.Literal("wet"), Type.Literal("mix"), Type.Literal("dry")],
  {
    default: "mix",
    description:
      "Global moisture availability preset (wet/mix/dry). Used to bias climate generation; does not directly tune hydrography projection thresholds.",
  }
);

export type HydrologyDrynessKnob = Static<typeof HydrologyDrynessKnobSchema>;

/**
 * Hydrology temperature knob (semantic intent).
 *
 * Meaning:
 * - Global thermal bias (baseline temperature regime).
 *
 * Stage scope:
 * - Used by `hydrology-climate-baseline` and `hydrology-climate-refine`.
 */
export const HydrologyTemperatureKnobSchema = Type.Union(
  [Type.Literal("cold"), Type.Literal("temperate"), Type.Literal("hot")],
  {
    default: "temperate",
    description:
      "Global thermal preset (cold/temperate/hot). Used as a bias over the step’s default temperature regime; influences cryosphere and evap/precip behavior.",
  }
);

export type HydrologyTemperatureKnob = Static<typeof HydrologyTemperatureKnobSchema>;

/**
 * Hydrology seasonality knob (semantic intent).
 *
 * Meaning:
 * - Seasonal cycle posture (annual amplitude strength, wind texture, precip noise texture).
 *
 * Stage scope:
 * - Used by `hydrology-climate-baseline` only.
 */
export const HydrologySeasonalityKnobSchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    default: "normal",
    description:
      "Seasonal cycle posture (low/normal/high). Applies as a deterministic transform over baseline climate parameters and published annual amplitude fields.",
  }
);

export type HydrologySeasonalityKnob = Static<typeof HydrologySeasonalityKnobSchema>;

/**
 * Hydrology ocean coupling knob (semantic intent).
 *
 * Meaning:
 * - Ocean influence preset (winds/currents/transport/coastal gradients).
 *
 * Stage scope:
 * - Used by `hydrology-climate-baseline` only.
 */
export const HydrologyOceanCouplingKnobSchema = Type.Union(
  [Type.Literal("off"), Type.Literal("simple"), Type.Literal("earthlike")],
  {
    default: "earthlike",
    description:
      "Ocean influence preset (off/simple/earthlike). Applies as a deterministic transform over winds, currents, moisture transport, and coastal gradients.",
  }
);

export type HydrologyOceanCouplingKnob = Static<typeof HydrologyOceanCouplingKnobSchema>;

/**
 * Hydrology cryosphere knob (semantic intent).
 *
 * Meaning:
 * - Enables/disables bounded cryosphere/albedo feedback and cryosphere products.
 *
 * Stage scope:
 * - Used by `hydrology-climate-refine` only.
 */
export const HydrologyCryosphereKnobSchema = Type.Union([Type.Literal("off"), Type.Literal("on")], {
  default: "on",
  description:
    'Cryosphere enablement ("on"|"off"). Controls bounded feedback and cryosphere artifacts; does not add compat paths.',
});

export type HydrologyCryosphereKnob = Static<typeof HydrologyCryosphereKnobSchema>;

/**
 * Hydrology river density knob (semantic intent).
 *
 * Meaning:
 * - River network density preset expressed as a high-level bias over Hydrology physics inputs.
 *
 * Stage scope:
 * - Used by `hydrology-hydrography` only.
 */
export const HydrologyRiverDensityKnobSchema = Type.Union(
  [Type.Literal("sparse"), Type.Literal("normal"), Type.Literal("dense")],
  {
    default: "normal",
    description:
      "River density preset (sparse/normal/dense). Applies as a deterministic transform over Hydrology physics inputs (runoff scaling), not outcome targets.",
  }
);

export type HydrologyRiverDensityKnob = Static<typeof HydrologyRiverDensityKnobSchema>;

/**
 * Hydrology lakeiness knob (semantic intent).
 *
 * Meaning:
 * - Lake projection frequency bias (does not change discharge routing truth).
 *
 * Stage scope:
 * - Used by `hydrology-climate-baseline` only.
 */
export const HydrologyLakeinessKnobSchema = Type.Union(
  [Type.Literal("few"), Type.Literal("normal"), Type.Literal("many")],
  {
    default: "normal",
    description:
      "Lake projection frequency preset (few/normal/many). Applies as a deterministic multiplier over lake projection frequency; routing/discharge truth is unchanged.",
  }
);

export type HydrologyLakeinessKnob = Static<typeof HydrologyLakeinessKnobSchema>;
