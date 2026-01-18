import { Type, type Static } from "@swooper/mapgen-core/authoring";

export const HydrologyDrynessKnobSchema = Type.Union(
  [Type.Literal("wet"), Type.Literal("mix"), Type.Literal("dry")],
  {
    description:
      "Global moisture availability bias (not regional). Used by hydrology-climate-baseline and hydrology-climate-refine; does not directly tune river projection thresholds.",
    default: "mix",
  }
);

export type HydrologyDrynessKnob = Static<typeof HydrologyDrynessKnobSchema>;

export const HydrologyTemperatureKnobSchema = Type.Union(
  [Type.Literal("cold"), Type.Literal("temperate"), Type.Literal("hot")],
  {
    description:
      "Global thermal bias (affects baseline surface temperature; influences cryosphere formation). Used by hydrology-climate-baseline and hydrology-climate-refine; does not change hydrography routing truth.",
    default: "temperate",
  }
);

export type HydrologyTemperatureKnob = Static<typeof HydrologyTemperatureKnobSchema>;

export const HydrologySeasonalityKnobSchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    description:
      "Seasonal forcing intent (affects baseline declination forcing posture and precipitation noise structure). Used by hydrology-climate-baseline; downstream stages consume the resulting annual mean + amplitude artifacts.",
    default: "normal",
  }
);

export type HydrologySeasonalityKnob = Static<typeof HydrologySeasonalityKnobSchema>;

export const HydrologyOceanCouplingKnobSchema = Type.Union(
  [Type.Literal("off"), Type.Literal("simple"), Type.Literal("earthlike")],
  {
    description:
      "Ocean influence preset (affects wind jets, surface currents, and moisture transport iterations). Used by hydrology-climate-baseline only; does not affect hydrology-hydrography or hydrology-climate-refine.",
    default: "earthlike",
  }
);

export type HydrologyOceanCouplingKnob = Static<typeof HydrologyOceanCouplingKnobSchema>;

export const HydrologyCryosphereKnobSchema = Type.Union([Type.Literal("off"), Type.Literal("on")], {
  description:
    "Enables bounded cryosphere/albedo feedback and cryosphere state products. Used by hydrology-climate-refine only; does not affect baseline climate generation or river projection thresholds.",
  default: "on",
});

export type HydrologyCryosphereKnob = Static<typeof HydrologyCryosphereKnobSchema>;

export const HydrologyRiverDensityKnobSchema = Type.Union(
  [Type.Literal("sparse"), Type.Literal("normal"), Type.Literal("dense")],
  {
    description:
      "River network projection density (affects discharge-derived minor/major classification thresholds). Used by hydrology-hydrography only; does not change baseline/refine climate.",
    default: "normal",
  }
);

export type HydrologyRiverDensityKnob = Static<typeof HydrologyRiverDensityKnobSchema>;

export const HydrologyLakeinessKnobSchema = Type.Union(
  [Type.Literal("few"), Type.Literal("normal"), Type.Literal("many")],
  {
    description:
      "Lake frequency bias (affects the lake projection rate; does not change discharge routing). Used by hydrology-climate-baseline only; does not affect hydrology-hydrography or hydrology-climate-refine.",
    default: "normal",
  }
);

export type HydrologyLakeinessKnob = Static<typeof HydrologyLakeinessKnobSchema>;

export type HydrologyKnobs = Readonly<{
  dryness?: HydrologyDrynessKnob;
  temperature?: HydrologyTemperatureKnob;
  seasonality?: HydrologySeasonalityKnob;
  oceanCoupling?: HydrologyOceanCouplingKnob;
  cryosphere?: HydrologyCryosphereKnob;
  riverDensity?: HydrologyRiverDensityKnob;
  lakeiness?: HydrologyLakeinessKnob;
}>;

export type ResolvedHydrologyKnobs = Readonly<{
  dryness: HydrologyDrynessKnob;
  temperature: HydrologyTemperatureKnob;
  seasonality: HydrologySeasonalityKnob;
  oceanCoupling: HydrologyOceanCouplingKnob;
  cryosphere: HydrologyCryosphereKnob;
  riverDensity: HydrologyRiverDensityKnob;
  lakeiness: HydrologyLakeinessKnob;
}>;

export const DEFAULT_HYDROLOGY_KNOBS: ResolvedHydrologyKnobs = {
  dryness: "mix",
  temperature: "temperate",
  seasonality: "normal",
  oceanCoupling: "earthlike",
  cryosphere: "on",
  riverDensity: "normal",
  lakeiness: "normal",
} as const;

/**
 * Normalizes a partial Hydrology knobs object into a fully-resolved set of defaults.
 *
 * Semantics:
 * - `undefined` / missing keys → default for that key
 * - `null` → treated as missing (convenience at compile boundary)
 *
 * Notes:
 * - This function is deterministic and side-effect free.
 * - It must not implement “compat” fallbacks for legacy Hydrology surfaces; consumers must migrate downstream.
 */
export function resolveHydrologyKnobs(
  knobs: HydrologyKnobs | null | undefined
): ResolvedHydrologyKnobs {
  const input = knobs ?? {};
  return {
    dryness: input.dryness ?? DEFAULT_HYDROLOGY_KNOBS.dryness,
    temperature: input.temperature ?? DEFAULT_HYDROLOGY_KNOBS.temperature,
    seasonality: input.seasonality ?? DEFAULT_HYDROLOGY_KNOBS.seasonality,
    oceanCoupling: input.oceanCoupling ?? DEFAULT_HYDROLOGY_KNOBS.oceanCoupling,
    cryosphere: input.cryosphere ?? DEFAULT_HYDROLOGY_KNOBS.cryosphere,
    riverDensity: input.riverDensity ?? DEFAULT_HYDROLOGY_KNOBS.riverDensity,
    lakeiness: input.lakeiness ?? DEFAULT_HYDROLOGY_KNOBS.lakeiness,
  } as const;
}

