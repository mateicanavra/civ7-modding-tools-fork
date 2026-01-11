import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

import type { FeatureKey } from "@mapgen/domain/ecology/types.js";

const AquaticFeatureKeySchema = Type.Unsafe<FeatureKey>(
  Type.Union(
    [
      Type.Literal("FEATURE_REEF"),
      Type.Literal("FEATURE_COLD_REEF"),
      Type.Literal("FEATURE_ATOLL"),
      Type.Literal("FEATURE_LOTUS"),
    ],
    { description: "Baseline aquatic feature keys." }
  )
);

const AquaticChancesSchema = Type.Object({
  FEATURE_REEF: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
  FEATURE_COLD_REEF: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
  FEATURE_ATOLL: Type.Number({ default: 12, minimum: 0, maximum: 100 }),
  FEATURE_LOTUS: Type.Number({ default: 15, minimum: 0, maximum: 100 }),
});

const AquaticAtollSchema = Type.Object({
  enableClustering: Type.Boolean({ default: true }),
  clusterRadius: Type.Number({ default: 1, minimum: 0, maximum: 2 }),
  equatorialBandMaxAbsLatitude: Type.Number({ default: 23, minimum: 0, maximum: 90 }),
  shallowWaterAdjacencyGateChance: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
  shallowWaterAdjacencyRadius: Type.Number({ default: 1, minimum: 1 }),
  growthChanceEquatorial: Type.Number({ default: 15, minimum: 0, maximum: 100 }),
  growthChanceNonEquatorial: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
});

const AquaticRulesSchema = Type.Object({
  reefLatitudeSplit: Type.Number({ default: 55, minimum: 0, maximum: 90 }),
  atoll: AquaticAtollSchema,
});

const AquaticPlacementSchema = Type.Object({
  x: Type.Integer({ minimum: 0 }),
  y: Type.Integer({ minimum: 0 }),
  feature: AquaticFeatureKeySchema,
});

const PlanAquaticFeaturePlacementsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/aquatic-placement",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for aquatic placement RNG." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    terrainType: TypedArraySchemas.u8({ description: "Terrain type id per tile." }),
    latitude: TypedArraySchemas.f32({ description: "Latitude per tile (degrees)." }),
    featureKeyField: TypedArraySchemas.i16({
      description: "Existing feature key indices per tile (-1 for empty).",
    }),
    coastTerrain: Type.Integer({ description: "Terrain id for coast/shallow water." }),
  }),
  output: Type.Object({
    placements: Type.Array(AquaticPlacementSchema),
  }),
  strategies: {
    default: Type.Object({
      multiplier: Type.Number({
        description: "Scalar multiplier applied to all per-feature chances (0..2 typical).",
        default: 1,
        minimum: 0,
      }),
      chances: AquaticChancesSchema,
      rules: AquaticRulesSchema,
    }),
  },
});

export default PlanAquaticFeaturePlacementsContract;
