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

/**
 * Author-facing Hydrology knobs (semantic intent only).
 *
 * These knobs are the only supported public configuration for Hydrology. They are intentionally high-level:
 * they influence internal strategy parameters at the stage compile boundary and never act as “paint” that directly
 * sets local climate/river outcomes.
 *
 * Semantics contract (Phase 2):
 * - Missing/undefined: treated as “use default” per knob.
 * - Empty object `{}`: treated as “all defaults”.
 * - `null`: invalid at the schema boundary; some call sites accept `null` and treat it as “missing” before validation.
 * - Determinism: knobs are pure inputs. Same knobs + same seeds ⇒ identical Hydrology outputs.
 *
 * Practical guidance (“if X then Y”):
 * - If you want the map globally wetter/drier, change `dryness` (this scales rainfall and moisture sources globally).
 * - If you want colder/hotter climates (snowline shifts, PET changes), change `temperature`.
 * - If you want more/less seasonal texture (wind variability and rainfall noise), change `seasonality`.
 * - If you want weaker/stronger coastal/ocean influence, change `oceanCoupling` (affects currents + transport iterations).
 * - If you want less/more ice feedback, change `cryosphere` (turns cryosphere ops on/off; does not add compat paths).
 * - If you want fewer/more rivers *in projection*, change `riverDensity` (thresholding on discharge-derived fields).
 * - If you want fewer/more lakes, change `lakeiness` (lake projection frequency only; routing truth is unchanged).
 */
export const HydrologyKnobsSchema = Type.Object(
  {
    /**
     * Global moisture availability bias (not regional).
     *
     * If you need “more rainforest everywhere”, prefer `dryness: "wet"` over tweaking algorithm parameters.
     */
    dryness: Type.Optional(DrynessSchema),
    /**
     * Global thermal bias.
     *
     * If you need larger polar caps / more mountain snow, prefer `temperature: "cold"`.
     */
    temperature: Type.Optional(TemperatureSchema),
    /**
     * Seasonal amplitude intent.
     *
     * If you need higher climatic variability / more textured wind + rainfall noise, prefer `seasonality: "high"`.
     */
    seasonality: Type.Optional(SeasonalitySchema),
    /**
     * Ocean influence preset.
     *
     * If you want less coastal moderation and weaker ocean-driven moisture transport, use `"off"` or `"simple"`.
     */
    oceanCoupling: Type.Optional(OceanCouplingSchema),
    /**
     * Cryosphere enablement.
     *
     * If you want to remove bounded albedo feedback and disable cryosphere products entirely, use `"off"`.
     */
    cryosphere: Type.Optional(CryosphereSchema),
    /**
     * River network projection density.
     *
     * If you want fewer/more projected rivers while keeping Hydrology’s discharge truth intact, adjust this knob.
     */
    riverDensity: Type.Optional(RiverDensitySchema),
    /**
     * Lake frequency bias.
     *
     * If you want more/less lakes without changing discharge routing truth, adjust this knob.
     */
    lakeiness: Type.Optional(LakeinessSchema),
  },
  {
    additionalProperties: false,
    description:
      "Hydrology author-facing knobs (semantic intent). Missing values use defaults; determinism is preserved across seeds.",
  }
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
