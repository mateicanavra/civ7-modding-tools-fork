import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

import type { BiomeSymbol, FeatureKey } from "@mapgen/domain/ecology/types.js";

const VegetatedFeatureKeySchema = Type.Unsafe<FeatureKey>(
  Type.Union(
    [
      Type.Literal("FEATURE_FOREST"),
      Type.Literal("FEATURE_RAINFOREST"),
      Type.Literal("FEATURE_TAIGA"),
      Type.Literal("FEATURE_SAVANNA_WOODLAND"),
      Type.Literal("FEATURE_SAGEBRUSH_STEPPE"),
    ],
    { description: "Baseline vegetated feature keys." }
  )
);

const BiomeSymbolSchema = Type.Unsafe<BiomeSymbol>(
  Type.Union(
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
    { description: "Biome symbols produced by the ecology classifier." }
  )
);

const VegetatedMinByBiomeSchema = Type.Object(
  {
    snow: Type.Number({ default: 0.05, minimum: 0, maximum: 1 }),
    tundra: Type.Number({ default: 0.03, minimum: 0, maximum: 1 }),
    boreal: Type.Number({ default: 0.05, minimum: 0, maximum: 1 }),
    temperateDry: Type.Number({ default: 0.05, minimum: 0, maximum: 1 }),
    temperateHumid: Type.Number({ default: 0.05, minimum: 0, maximum: 1 }),
    tropicalSeasonal: Type.Number({ default: 0.05, minimum: 0, maximum: 1 }),
    tropicalRainforest: Type.Number({ default: 0.05, minimum: 0, maximum: 1 }),
    desert: Type.Number({ default: 0.02, minimum: 0, maximum: 1 }),
  },
  { additionalProperties: false }
);

const VegetatedRulesSchema = Type.Object(
  {
    minVegetationByBiome: VegetatedMinByBiomeSchema,
    vegetationChanceScalar: Type.Number({ default: 1, minimum: 0 }),
    desertSagebrushMinVegetation: Type.Number({ default: 0.2, minimum: 0, maximum: 1 }),
    desertSagebrushMaxAridity: Type.Number({ default: 0.85, minimum: 0, maximum: 1 }),
    tundraTaigaMinVegetation: Type.Number({ default: 0.25, minimum: 0, maximum: 1 }),
    tundraTaigaMinTemperature: Type.Number({ default: -2 }),
    tundraTaigaMaxFreeze: Type.Number({ default: 0.9, minimum: 0, maximum: 1 }),
    temperateDryForestMoisture: Type.Number({ default: 120 }),
    temperateDryForestMaxAridity: Type.Number({ default: 0.65, minimum: 0, maximum: 1 }),
    temperateDryForestVegetation: Type.Number({ default: 0.45, minimum: 0, maximum: 1 }),
    tropicalSeasonalRainforestMoisture: Type.Number({ default: 140 }),
    tropicalSeasonalRainforestMaxAridity: Type.Number({ default: 0.6, minimum: 0, maximum: 1 }),
  },
  { additionalProperties: false }
);

const VegetatedChancesSchema = Type.Object(
  {
    FEATURE_FOREST: Type.Number({ default: 50, minimum: 0, maximum: 100 }),
    FEATURE_RAINFOREST: Type.Number({ default: 65, minimum: 0, maximum: 100 }),
    FEATURE_TAIGA: Type.Number({ default: 50, minimum: 0, maximum: 100 }),
    FEATURE_SAVANNA_WOODLAND: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
    FEATURE_SAGEBRUSH_STEPPE: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
  },
  { additionalProperties: false }
);

const VegetatedFeaturePlacementsConfigSchema = Type.Object(
  {
    multiplier: Type.Number({
      description: "Scalar multiplier applied to all per-feature chances (0..2 typical).",
      default: 1,
      minimum: 0,
    }),
    chances: VegetatedChancesSchema,
    rules: VegetatedRulesSchema,
  },
  { additionalProperties: false }
);

const VegetatedFeaturePlacementsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for vegetated placement RNG." }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome symbol indices per tile." }),
    vegetationDensity: TypedArraySchemas.f32({ description: "Vegetation density per tile (0..1)." }),
    effectiveMoisture: TypedArraySchemas.f32({ description: "Effective moisture per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature per tile (C)." }),
    aridityIndex: TypedArraySchemas.f32({ description: "Aridity index per tile (0..1)." }),
    freezeIndex: TypedArraySchemas.f32({ description: "Freeze index per tile (0..1)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    terrainType: TypedArraySchemas.u8({ description: "Terrain type id per tile." }),
    featureKeyField: TypedArraySchemas.i16({
      description: "Existing feature key indices per tile (-1 for empty).",
    }),
    navigableRiverTerrain: Type.Integer({ description: "Terrain id for navigable rivers." }),
  },
  { additionalProperties: false }
);

const VegetatedPlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: VegetatedFeatureKeySchema,
  },
  { additionalProperties: false }
);

const VegetatedFeaturePlacementsOutputSchema = Type.Object(
  {
    placements: Type.Array(VegetatedPlacementSchema),
  },
  { additionalProperties: false }
);

export const PlanVegetatedFeaturePlacementsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/vegetated-placement",
  input: VegetatedFeaturePlacementsInputSchema,
  output: VegetatedFeaturePlacementsOutputSchema,
  strategies: {
    default: VegetatedFeaturePlacementsConfigSchema,
  },
});

export default PlanVegetatedFeaturePlacementsContract;
