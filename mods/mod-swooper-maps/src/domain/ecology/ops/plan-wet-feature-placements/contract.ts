import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import type { BiomeSymbol, FeatureKey } from "@mapgen/domain/ecology/types.js";

const WetFeatureKeySchema = Type.Unsafe<FeatureKey>(
  Type.Union(
    [
      Type.Literal("FEATURE_MARSH"),
      Type.Literal("FEATURE_TUNDRA_BOG"),
      Type.Literal("FEATURE_MANGROVE"),
      Type.Literal("FEATURE_OASIS"),
      Type.Literal("FEATURE_WATERING_HOLE"),
    ],
    { description: "Baseline wet feature keys." }
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

const WetChancesSchema = Type.Object({
  FEATURE_MARSH: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
  FEATURE_TUNDRA_BOG: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
  FEATURE_MANGROVE: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
  FEATURE_OASIS: Type.Number({ default: 50, minimum: 0, maximum: 100 }),
  FEATURE_WATERING_HOLE: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
});

const WetRulesSchema = Type.Object({
  nearRiverRadius: Type.Number({ default: 2, minimum: 1 }),
  coldTemperatureMax: Type.Number({ default: 5 }),
  coldBiomeSymbols: Type.Array(BiomeSymbolSchema, { default: ["snow", "tundra", "boreal"] }),
  mangroveWarmTemperatureMin: Type.Number({ default: 18 }),
  mangroveWarmBiomeSymbols: Type.Array(BiomeSymbolSchema, {
    default: ["tropicalRainforest", "tropicalSeasonal"],
  }),
  coastalAdjacencyRadius: Type.Number({ default: 1, minimum: 1 }),
  isolatedRiverRadius: Type.Number({ default: 1, minimum: 1 }),
  isolatedSpacingRadius: Type.Number({ default: 1, minimum: 1 }),
  oasisBiomeSymbols: Type.Array(BiomeSymbolSchema, { default: ["desert", "temperateDry"] }),
});

const WetPlacementSchema = Type.Object({
  x: Type.Integer({ minimum: 0 }),
  y: Type.Integer({ minimum: 0 }),
  feature: WetFeatureKeySchema,
});

const PlanWetFeaturePlacementsContract = defineOp({
  kind: "plan",
  id: "ecology/features/wet-placement",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for wet placement RNG." }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome symbol indices per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({
      description: "Surface temperature per tile (C).",
    }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    navigableRiverMask: TypedArraySchemas.u8({
      description: "Mask (1/0): tiles that are navigable rivers.",
    }),
    featureKeyField: TypedArraySchemas.i16({
      description: "Existing feature key indices per tile (-1 for empty).",
    }),
    nearRiverMask: TypedArraySchemas.u8({
      description: "River adjacency mask for near-river checks.",
    }),
    isolatedRiverMask: TypedArraySchemas.u8({
      description: "River adjacency mask for isolation checks.",
    }),
  }),
  output: Type.Object({
    placements: Type.Array(WetPlacementSchema),
  }),
  strategies: {
    default: Type.Object({
      multiplier: Type.Number({
        description: "Scalar multiplier applied to all per-feature chances (0..2 typical).",
        default: 1,
        minimum: 0,
      }),
      chances: WetChancesSchema,
      rules: WetRulesSchema,
    }),
  },
});

export default PlanWetFeaturePlacementsContract;
