import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

import type { FeatureKey } from "@mapgen/domain/ecology/types.js";

const IceFeatureKeySchema = Type.Unsafe<FeatureKey>(
  Type.Union([Type.Literal("FEATURE_ICE")], { description: "Baseline ice feature key." })
);

export const IceChancesSchema = Type.Object(
  {
    FEATURE_ICE: Type.Number({ default: 90, minimum: 0, maximum: 100 }),
  },
  { additionalProperties: false }
);

export const IceRulesSchema = Type.Object(
  {
    minAbsLatitude: Type.Number({ default: 78, minimum: 0, maximum: 90 }),
    forbidAdjacentToLand: Type.Boolean({ default: true }),
    landAdjacencyRadius: Type.Number({ default: 1, minimum: 1 }),
    forbidAdjacentToNaturalWonders: Type.Boolean({ default: true }),
    naturalWonderAdjacencyRadius: Type.Number({ default: 1, minimum: 1 }),
  },
  { additionalProperties: false }
);

export const IceFeaturePlacementsConfigSchema = Type.Object(
  {
    multiplier: Type.Number({
      description: "Scalar multiplier applied to ice chance (0..2 typical).",
      default: 1,
      minimum: 0,
    }),
    chances: IceChancesSchema,
    rules: IceRulesSchema,
  },
  { additionalProperties: false }
);

const IceFeaturePlacementsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for ice placement RNG." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    latitude: TypedArraySchemas.f32({ description: "Latitude per tile (degrees)." }),
    featureKeyField: TypedArraySchemas.i16({ description: "Existing feature key indices per tile (-1 for empty)." }),
    naturalWonderMask: TypedArraySchemas.u8({ description: "Natural wonder mask per tile (1=present)." }),
  },
  { additionalProperties: false }
);

const IcePlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: IceFeatureKeySchema,
  },
  { additionalProperties: false }
);

const IceFeaturePlacementsOutputSchema = Type.Object(
  {
    placements: Type.Array(IcePlacementSchema),
  },
  { additionalProperties: false }
);

export const PlanIceFeaturePlacementsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/ice-placement",
  input: IceFeaturePlacementsInputSchema,
  output: IceFeaturePlacementsOutputSchema,
  strategies: {
    default: IceFeaturePlacementsConfigSchema,
  },
});
