import { Type, type Static } from "@swooper/mapgen-core/authoring";

const DrynessSchema = Type.Union(
  [Type.Literal("wet"), Type.Literal("mix"), Type.Literal("dry")],
  {
    description: "Global moisture availability bias (not regional).",
    default: "mix",
  }
);

const TemperatureSchema = Type.Union(
  [Type.Literal("cold"), Type.Literal("temperate"), Type.Literal("hot")],
  {
    description: "Global thermal bias (affects baseline surface temperature; influences cryosphere formation).",
    default: "temperate",
  }
);

const SeasonalitySchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    description: "Seasonal amplitude intent (affects wind variability and precipitation noise structure).",
    default: "normal",
  }
);

const OceanCouplingSchema = Type.Union(
  [Type.Literal("off"), Type.Literal("simple"), Type.Literal("earthlike")],
  {
    description: "Ocean influence preset (affects wind jets, surface currents, and moisture transport iterations).",
    default: "earthlike",
  }
);

const CryosphereSchema = Type.Union([Type.Literal("off"), Type.Literal("on")], {
  description: "Enables bounded cryosphere/albedo feedback and cryosphere state products.",
  default: "on",
});

const RiverDensitySchema = Type.Union(
  [Type.Literal("sparse"), Type.Literal("normal"), Type.Literal("dense")],
  {
    description: "River network projection density (affects discharge-derived minor/major classification thresholds).",
    default: "normal",
  }
);

const LakeinessSchema = Type.Union([Type.Literal("few"), Type.Literal("normal"), Type.Literal("many")], {
  description: "Lake frequency bias (affects the lake projection rate; does not change discharge routing).",
  default: "normal",
});

export const HydrologyKnobsSchema = Type.Object(
  {
    dryness: Type.Optional(DrynessSchema),
    temperature: Type.Optional(TemperatureSchema),
    seasonality: Type.Optional(SeasonalitySchema),
    oceanCoupling: Type.Optional(OceanCouplingSchema),
    cryosphere: Type.Optional(CryosphereSchema),
    riverDensity: Type.Optional(RiverDensitySchema),
    lakeiness: Type.Optional(LakeinessSchema),
  },
  { additionalProperties: false }
);

export type HydrologyKnobs = Static<typeof HydrologyKnobsSchema>;

export type ResolvedHydrologyKnobs = Readonly<{
  dryness: Static<typeof DrynessSchema>;
  temperature: Static<typeof TemperatureSchema>;
  seasonality: Static<typeof SeasonalitySchema>;
  oceanCoupling: Static<typeof OceanCouplingSchema>;
  cryosphere: Static<typeof CryosphereSchema>;
  riverDensity: Static<typeof RiverDensitySchema>;
  lakeiness: Static<typeof LakeinessSchema>;
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

export function resolveHydrologyKnobs(knobs: Partial<HydrologyKnobs> | null | undefined): ResolvedHydrologyKnobs {
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
