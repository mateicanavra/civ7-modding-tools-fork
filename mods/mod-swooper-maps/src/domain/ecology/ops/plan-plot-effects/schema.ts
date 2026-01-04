import {
  Type,
  applySchemaDefaults,
  defineOpSchema,
  TypedArraySchemas,
  type Static,
} from "@swooper/mapgen-core/authoring";

import type { BiomeSymbol, PlotEffectKey } from "../../types.js";

const BiomeSymbolSchema = Type.Union(
  [
    Type.Literal("snow"),
    Type.Literal("tundra"),
    Type.Literal("boreal"),
    Type.Literal("temperateDry"),
    Type.Literal("temperateHumid"),
    Type.Literal("tropicalSeasonal"),
    Type.Literal("tropicalRainforest"),
    Type.Literal("desert"),
  ],
  {
    description:
      "Biome symbol names used by the ecology classifier (maps to engine biome bindings).",
  }
);

const DEFAULT_SNOW_SELECTORS = {
  light: { typeName: "PLOTEFFECT_SNOW_LIGHT_PERMANENT" },
  medium: { typeName: "PLOTEFFECT_SNOW_MEDIUM_PERMANENT" },
  heavy: { typeName: "PLOTEFFECT_SNOW_HEAVY_PERMANENT" },
} as const;

const DEFAULT_SAND_SELECTOR = { typeName: "PLOTEFFECT_SAND" } as const;
const DEFAULT_BURNED_SELECTOR = { typeName: "PLOTEFFECT_BURNED" } as const;

const SnowElevationStrategySchema = Type.Union(
  [Type.Literal("absolute"), Type.Literal("percentile")],
  {
    description:
      "Elevation normalization strategy for snow scoring: absolute meters or percentile-based land elevation.",
    default: "absolute",
  }
);

const createPlotEffectSelectorSchema = (
  defaultValue: { typeName: PlotEffectKey } = { typeName: "PLOTEFFECT_UNSET" }
) =>
  Type.Object(
    {
      /** Explicit plot effect type name (ex: PLOTEFFECT_SNOW_LIGHT_PERMANENT). */
      typeName: Type.Unsafe<PlotEffectKey>(
        Type.String({
          description: "Explicit plot effect type name (ex: PLOTEFFECT_SAND).",
        })
      ),
    },
    {
      additionalProperties: false,
      default: defaultValue,
      description: "Selector for a plot effect type (explicit name).",
    }
  );

const PlotEffectSelectorSchema = createPlotEffectSelectorSchema();
const PlotEffectSnowLightSelectorSchema = createPlotEffectSelectorSchema(DEFAULT_SNOW_SELECTORS.light);
const PlotEffectSnowMediumSelectorSchema = createPlotEffectSelectorSchema(DEFAULT_SNOW_SELECTORS.medium);
const PlotEffectSnowHeavySelectorSchema = createPlotEffectSelectorSchema(DEFAULT_SNOW_SELECTORS.heavy);
const PlotEffectSandSelectorSchema = createPlotEffectSelectorSchema(DEFAULT_SAND_SELECTOR);
const PlotEffectBurnedSelectorSchema = createPlotEffectSelectorSchema(DEFAULT_BURNED_SELECTOR);

const PlotEffectsSnowSelectorsSchema = Type.Object(
  {
    /** Plot effect selector for light snow. */
    light: Type.Optional(PlotEffectSnowLightSelectorSchema),
    /** Plot effect selector for medium snow. */
    medium: Type.Optional(PlotEffectSnowMediumSelectorSchema),
    /** Plot effect selector for heavy snow. */
    heavy: Type.Optional(PlotEffectSnowHeavySelectorSchema),
  },
  { additionalProperties: false, default: {} }
);

const PlotEffectsSnowSchema = Type.Object(
  {
    /** Enable or disable permanent snow placement. */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Enable owned permanent snow plot effects.",
        default: true,
      })
    ),
    /** Plot effect selectors for snow weights. */
    selectors: Type.Optional(PlotEffectsSnowSelectorsSchema),
    /** Chance per eligible plot to receive any snow (percent 0..100). */
    coverageChance: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to receive any snow (percent 0..100).",
        default: 80,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Weight for freeze index in the snow score (scalar). */
    freezeWeight: Type.Optional(
      Type.Number({
        description: "Weight for freeze index in the snow score (scalar).",
        default: 1,
        minimum: 0,
      })
    ),
    /** Weight for elevation factor in the snow score (scalar). */
    elevationWeight: Type.Optional(
      Type.Number({
        description: "Weight for elevation factor in the snow score (scalar).",
        default: 1,
        minimum: 0,
      })
    ),
    /** Weight for moisture factor in the snow score (scalar). */
    moistureWeight: Type.Optional(
      Type.Number({
        description: "Weight for moisture factor in the snow score (scalar).",
        default: 1,
        minimum: 0,
      })
    ),
    /** Normalization divisor for the weighted score (prevents weights from exceeding 1). */
    scoreNormalization: Type.Optional(
      Type.Number({
        description: "Normalization divisor for the weighted score (scalar).",
        default: 3,
        minimum: 0.0001,
      })
    ),
    /** Bias added to the weighted score before thresholds (scalar). */
    scoreBias: Type.Optional(
      Type.Number({
        description: "Bias added to the weighted score before thresholds (scalar).",
        default: 0,
      })
    ),
    /** Snow score threshold for light snow (0..1). */
    lightThreshold: Type.Optional(
      Type.Number({
        description: "Snow score threshold for light snow (0..1).",
        default: 0.35,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Snow score threshold for medium snow (0..1). */
    mediumThreshold: Type.Optional(
      Type.Number({
        description: "Snow score threshold for medium snow (0..1).",
        default: 0.6,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Snow score threshold for heavy snow (0..1). */
    heavyThreshold: Type.Optional(
      Type.Number({
        description: "Snow score threshold for heavy snow (0..1).",
        default: 0.8,
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Elevation normalization strategy used for snow placement.
     * - absolute: uses elevationMin/elevationMax as meters
     * - percentile: derives min/max from land elevation percentiles
     */
    elevationStrategy: Type.Optional(SnowElevationStrategySchema),
    /**
     * Minimum elevation (meters) to start contributing to snow score.
     * Only used when elevationStrategy = "absolute".
     */
    elevationMin: Type.Optional(
      Type.Number({
        description:
          "Minimum elevation that contributes to snow score (meters). Used only for absolute elevation strategy.",
        default: 200,
      })
    ),
    /**
     * Elevation (meters) where the elevation factor saturates at 1.0.
     * Only used when elevationStrategy = "absolute".
     */
    elevationMax: Type.Optional(
      Type.Number({
        description:
          "Elevation where the elevation factor saturates (meters). Used only for absolute elevation strategy.",
        default: 2400,
      })
    ),
    /**
     * Land elevation percentile (0..1) where the elevation factor starts rising.
     * Only used when elevationStrategy = "percentile".
     */
    elevationPercentileMin: Type.Optional(
      Type.Number({
        description:
          "Land elevation percentile (0..1) where snow elevation influence begins (percentile strategy only).",
        default: 0.7,
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Land elevation percentile (0..1) where the elevation factor saturates at 1.0.
     * Only used when elevationStrategy = "percentile".
     */
    elevationPercentileMax: Type.Optional(
      Type.Number({
        description:
          "Land elevation percentile (0..1) where snow elevation influence saturates (percentile strategy only).",
        default: 0.98,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Minimum effective moisture to contribute to snow score. */
    moistureMin: Type.Optional(
      Type.Number({
        description: "Minimum effective moisture to contribute to snow score.",
        default: 40,
        minimum: 0,
      })
    ),
    /** Effective moisture where the moisture factor saturates at 1.0. */
    moistureMax: Type.Optional(
      Type.Number({
        description: "Effective moisture where the moisture factor saturates.",
        default: 160,
        minimum: 0,
      })
    ),
    /** Maximum surface temperature (C) allowed for snow. */
    maxTemperature: Type.Optional(
      Type.Number({
        description: "Maximum surface temperature allowed for snow (C).",
        default: 4,
      })
    ),
    /** Maximum aridity index (0..1) allowed for snow. */
    maxAridity: Type.Optional(
      Type.Number({
        description: "Maximum aridity index allowed for snow (0..1).",
        default: 0.9,
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

const PlotEffectsSandSchema = Type.Object(
  {
    /** Enable or disable sand plot effects. */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Enable sand plot effects in arid regions.",
        default: false,
      })
    ),
    /** Plot effect selector for sand. */
    selector: Type.Optional(PlotEffectSandSelectorSchema),
    /** Chance per eligible plot to receive sand (percent 0..100). */
    chance: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to receive sand (percent 0..100).",
        default: 18,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Minimum aridity index (0..1) for sand placement. */
    minAridity: Type.Optional(
      Type.Number({
        description: "Minimum aridity index for sand placement (0..1).",
        default: 0.55,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Minimum surface temperature (C) for sand placement. */
    minTemperature: Type.Optional(
      Type.Number({
        description: "Minimum surface temperature for sand placement (C).",
        default: 18,
      })
    ),
    /** Maximum freeze index (0..1) allowed for sand placement. */
    maxFreeze: Type.Optional(
      Type.Number({
        description: "Maximum freeze index allowed for sand placement (0..1).",
        default: 0.25,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Maximum vegetation density (0..1) allowed for sand placement. */
    maxVegetation: Type.Optional(
      Type.Number({
        description: "Maximum vegetation density allowed for sand placement (0..1).",
        default: 0.2,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Maximum effective moisture allowed for sand placement. */
    maxMoisture: Type.Optional(
      Type.Number({
        description: "Maximum effective moisture allowed for sand placement.",
        default: 90,
        minimum: 0,
      })
    ),
    /** Biome symbols eligible for sand placement. */
    allowedBiomes: Type.Optional(
      Type.Array(BiomeSymbolSchema, {
        description: "Biome symbols eligible for sand placement.",
        default: ["desert", "temperateDry"],
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

const PlotEffectsBurnedSchema = Type.Object(
  {
    /** Enable or disable burned plot effects. */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Enable burned plot effects in hot, dry regions.",
        default: false,
      })
    ),
    /** Plot effect selector for burned. */
    selector: Type.Optional(PlotEffectBurnedSelectorSchema),
    /** Chance per eligible plot to receive burned effect (percent 0..100). */
    chance: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to receive burned effect (percent 0..100).",
        default: 8,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Minimum aridity index (0..1) for burned placement. */
    minAridity: Type.Optional(
      Type.Number({
        description: "Minimum aridity index for burned placement (0..1).",
        default: 0.45,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Minimum surface temperature (C) for burned placement. */
    minTemperature: Type.Optional(
      Type.Number({
        description: "Minimum surface temperature for burned placement (C).",
        default: 20,
      })
    ),
    /** Maximum freeze index (0..1) allowed for burned placement. */
    maxFreeze: Type.Optional(
      Type.Number({
        description: "Maximum freeze index allowed for burned placement (0..1).",
        default: 0.2,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Maximum vegetation density (0..1) allowed for burned placement. */
    maxVegetation: Type.Optional(
      Type.Number({
        description: "Maximum vegetation density allowed for burned placement (0..1).",
        default: 0.35,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Maximum effective moisture allowed for burned placement. */
    maxMoisture: Type.Optional(
      Type.Number({
        description: "Maximum effective moisture allowed for burned placement.",
        default: 110,
        minimum: 0,
      })
    ),
    /** Biome symbols eligible for burned placement. */
    allowedBiomes: Type.Optional(
      Type.Array(BiomeSymbolSchema, {
        description: "Biome symbols eligible for burned placement.",
        default: ["temperateDry", "tropicalSeasonal"],
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

const PlotEffectsConfigSchema = Type.Object(
  {
    /** Snow plot effects (light/medium/heavy permanent). */
    snow: Type.Optional(PlotEffectsSnowSchema),
    /** Sand plot effects for arid basins. */
    sand: Type.Optional(PlotEffectsSandSchema),
    /** Burned plot effects for scorched regions. */
    burned: Type.Optional(PlotEffectsBurnedSchema),
  },
  { additionalProperties: false, default: {} }
);

const PlotEffectKeySchema = Type.Unsafe<PlotEffectKey>(
  Type.String({
    description: "Plot effect key (PLOTEFFECT_*).",
    pattern: "^PLOTEFFECT_",
  })
);

const PlotEffectsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for plot-effect RNG." }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome symbol indices per tile." }),
    vegetationDensity: TypedArraySchemas.f32({ description: "Vegetation density per tile (0..1)." }),
    effectiveMoisture: TypedArraySchemas.f32({ description: "Effective moisture per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature per tile (C)." }),
    aridityIndex: TypedArraySchemas.f32({ description: "Aridity index per tile (0..1)." }),
    freezeIndex: TypedArraySchemas.f32({ description: "Freeze index per tile (0..1)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation per tile (meters)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
  },
  { additionalProperties: false }
);

const PlotEffectPlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    plotEffect: PlotEffectKeySchema,
  },
  { additionalProperties: false }
);

const PlotEffectsOutputSchema = Type.Object(
  {
    placements: Type.Array(PlotEffectPlacementSchema),
  },
  { additionalProperties: false }
);

export const PlanPlotEffectsSchema = defineOpSchema<
  typeof PlotEffectsInputSchema,
  typeof PlotEffectsConfigSchema,
  typeof PlotEffectsOutputSchema
>(
  {
    input: PlotEffectsInputSchema,
    config: PlotEffectsConfigSchema,
    output: PlotEffectsOutputSchema,
  },
  {
    title: "PlanPlotEffectsSchema",
    description: "Plan climate/ecology plot effects",
    additionalProperties: false,
  }
);

type PlotEffectSelector = { typeName: PlotEffectKey };
type PlotEffectsSnowSelectors = Static<typeof PlotEffectsSnowSelectorsSchema>;
type PlotEffectsSnowConfig = Static<typeof PlotEffectsSnowSchema>;
type PlotEffectsSandConfig = Static<typeof PlotEffectsSandSchema>;
type PlotEffectsBurnedConfig = Static<typeof PlotEffectsBurnedSchema>;
type PlotEffectsConfig = Static<typeof PlanPlotEffectsSchema["properties"]["config"]>;

export type ResolvedPlotEffectsConfig = {
  snow: Required<PlotEffectsSnowConfig> & {
    selectors: Required<PlotEffectsSnowSelectors>;
  };
  sand: Required<PlotEffectsSandConfig> & { selector: PlotEffectSelector };
  burned: Required<PlotEffectsBurnedConfig> & { selector: PlotEffectSelector };
};

const normalizePlotEffectKey = (value: string): PlotEffectKey => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("plot effects selector typeName must be a non-empty string");
  }
  const upper = trimmed.toUpperCase();
  return (upper.startsWith("PLOTEFFECT_") ? upper : `PLOTEFFECT_${upper}`) as PlotEffectKey;
};

const normalizeSelector = (selector: { typeName: string }): PlotEffectSelector => ({
  typeName: normalizePlotEffectKey(selector.typeName),
});

export function resolvePlotEffectsConfig(
  input: PlotEffectsConfig
): ResolvedPlotEffectsConfig {
  const resolved = applySchemaDefaults(
    PlotEffectsConfigSchema,
    input
  ) as ResolvedPlotEffectsConfig;
  return {
    snow: {
      ...resolved.snow,
      selectors: {
        light: normalizeSelector(resolved.snow.selectors.light),
        medium: normalizeSelector(resolved.snow.selectors.medium),
        heavy: normalizeSelector(resolved.snow.selectors.heavy),
      },
    },
    sand: {
      ...resolved.sand,
      selector: normalizeSelector(resolved.sand.selector),
    },
    burned: {
      ...resolved.burned,
      selector: normalizeSelector(resolved.burned.selector),
    },
  };
}

export type { BiomeSymbol };
