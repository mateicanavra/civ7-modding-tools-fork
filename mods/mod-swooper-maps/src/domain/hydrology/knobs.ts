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
    description: "Global thermal bias (reserved for Phase 3+; does not yet affect legacy climate).",
    default: "temperate",
  }
);

const SeasonalitySchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    description: "Seasonal amplitude intent (reserved for Phase 3+; does not yet affect legacy climate).",
    default: "normal",
  }
);

const OceanCouplingSchema = Type.Union(
  [Type.Literal("off"), Type.Literal("simple"), Type.Literal("earthlike")],
  {
    description: "Ocean influence intent (reserved for Phase 3+; used as a weak wind-fields preset in legacy).",
    default: "earthlike",
  }
);

const CryosphereSchema = Type.Union([Type.Literal("off"), Type.Literal("on")], {
  description: "Enables cryosphere/albedo feedback (reserved for Phase 3+; no-op in legacy).",
  default: "on",
});

const RiverDensitySchema = Type.Union(
  [Type.Literal("sparse"), Type.Literal("normal"), Type.Literal("dense")],
  {
    description: "Gameplay projection density knob (maps to engine river length thresholds in legacy).",
    default: "normal",
  }
);

const LakeinessSchema = Type.Union([Type.Literal("few"), Type.Literal("normal"), Type.Literal("many")], {
  description: "Global basin fill / lake frequency bias (maps to engine lake frequency multiplier in legacy).",
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

