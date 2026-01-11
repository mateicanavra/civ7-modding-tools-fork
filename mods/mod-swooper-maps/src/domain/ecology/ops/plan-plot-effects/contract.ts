import {
  Type,
  defineOpContract,
  TypedArraySchemas,
} from "@swooper/mapgen-core/authoring";

import type { PlotEffectKey } from "@mapgen/domain/ecology/types.js";

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

const createPlotEffectSelectorSchema = (
  defaultValue: { typeName: PlotEffectKey }
) =>
  Type.Object(
    {
      typeName: Type.Unsafe<PlotEffectKey>(
        Type.String({
          description: "Explicit plot effect type name (ex: PLOTEFFECT_SAND).",
        })
      ),
    },
    {
      additionalProperties: false,
      default: defaultValue,
    }
  );

const PlotEffectsSnowSelectorsSchema = Type.Object(
  {
    light: createPlotEffectSelectorSchema({ typeName: "PLOTEFFECT_SNOW_LIGHT_PERMANENT" }),
    medium: createPlotEffectSelectorSchema({ typeName: "PLOTEFFECT_SNOW_MEDIUM_PERMANENT" }),
    heavy: createPlotEffectSelectorSchema({ typeName: "PLOTEFFECT_SNOW_HEAVY_PERMANENT" }),
  },
  { additionalProperties: false }
);

const SnowElevationStrategySchema = Type.Union(
  [Type.Literal("absolute"), Type.Literal("percentile")],
  {
    description:
      "Elevation normalization strategy for snow scoring: absolute meters or percentile-based land elevation.",
    default: "absolute",
  }
);

const PlotEffectsSnowSchema = Type.Object(
  {
    enabled: Type.Boolean({ default: true }),
    selectors: PlotEffectsSnowSelectorsSchema,
    coverageChance: Type.Number({ default: 80, minimum: 0, maximum: 100 }),
    freezeWeight: Type.Number({ default: 1, minimum: 0 }),
    elevationWeight: Type.Number({ default: 1, minimum: 0 }),
    moistureWeight: Type.Number({ default: 1, minimum: 0 }),
    scoreNormalization: Type.Number({ default: 3, minimum: 0.0001 }),
    scoreBias: Type.Number({ default: 0 }),
    lightThreshold: Type.Number({ default: 0.35, minimum: 0, maximum: 1 }),
    mediumThreshold: Type.Number({ default: 0.6, minimum: 0, maximum: 1 }),
    heavyThreshold: Type.Number({ default: 0.8, minimum: 0, maximum: 1 }),
    elevationStrategy: SnowElevationStrategySchema,
    elevationMin: Type.Number({ default: 200 }),
    elevationMax: Type.Number({ default: 2400 }),
    elevationPercentileMin: Type.Number({ default: 0.7, minimum: 0, maximum: 1 }),
    elevationPercentileMax: Type.Number({ default: 0.98, minimum: 0, maximum: 1 }),
    moistureMin: Type.Number({ default: 40, minimum: 0 }),
    moistureMax: Type.Number({ default: 160, minimum: 0 }),
    maxTemperature: Type.Number({ default: 4 }),
    maxAridity: Type.Number({ default: 0.9, minimum: 0, maximum: 1 }),
  },
  { additionalProperties: false }
);

const PlotEffectsSandSchema = Type.Object(
  {
    enabled: Type.Boolean({ default: false }),
    selector: createPlotEffectSelectorSchema({ typeName: "PLOTEFFECT_SAND" }),
    chance: Type.Number({ default: 18, minimum: 0, maximum: 100 }),
    minAridity: Type.Number({ default: 0.55, minimum: 0, maximum: 1 }),
    minTemperature: Type.Number({ default: 18 }),
    maxFreeze: Type.Number({ default: 0.25, minimum: 0, maximum: 1 }),
    maxVegetation: Type.Number({ default: 0.2, minimum: 0, maximum: 1 }),
    maxMoisture: Type.Number({ default: 90, minimum: 0 }),
    allowedBiomes: Type.Array(BiomeSymbolSchema, { default: ["desert", "temperateDry"] }),
  },
  { additionalProperties: false }
);

const PlotEffectsBurnedSchema = Type.Object(
  {
    enabled: Type.Boolean({ default: false }),
    selector: createPlotEffectSelectorSchema({ typeName: "PLOTEFFECT_BURNED" }),
    chance: Type.Number({ default: 8, minimum: 0, maximum: 100 }),
    minAridity: Type.Number({ default: 0.45, minimum: 0, maximum: 1 }),
    minTemperature: Type.Number({ default: 20 }),
    maxFreeze: Type.Number({ default: 0.2, minimum: 0, maximum: 1 }),
    maxVegetation: Type.Number({ default: 0.35, minimum: 0, maximum: 1 }),
    maxMoisture: Type.Number({ default: 110, minimum: 0 }),
    allowedBiomes: Type.Array(BiomeSymbolSchema, { default: ["temperateDry", "tropicalSeasonal"] }),
  },
  { additionalProperties: false }
);

const PlotEffectsConfigSchema = Type.Object(
  {
    snow: PlotEffectsSnowSchema,
    sand: PlotEffectsSandSchema,
    burned: PlotEffectsBurnedSchema,
  },
  { additionalProperties: false }
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

export const PlanPlotEffectsContract = defineOpContract({
  kind: "plan",
  id: "ecology/plot-effects/placement",
  input: PlotEffectsInputSchema,
  output: PlotEffectsOutputSchema,
  strategies: {
    default: PlotEffectsConfigSchema,
  },
});
