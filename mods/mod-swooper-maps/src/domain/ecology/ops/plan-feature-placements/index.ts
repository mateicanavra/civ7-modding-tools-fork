import { Type, type Static } from "typebox";
import { createOp, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import {
  FEATURE_PLACEMENT_KEYS,
  FeaturesPlacementConfigSchema,
  resolveFeaturesPlacementConfig,
  type FeatureKey,
  type FeaturesPlacementConfig,
  type ResolvedFeaturesPlacementConfig,
} from "./schema.js";
import type { FeaturesPlacementInput } from "./types.js";
import { planFeaturePlacements as planFeaturePlacementsImpl } from "./plan.js";

const FeatureKeySchema = Type.Unsafe<FeatureKey>(
  Type.Union(
    FEATURE_PLACEMENT_KEYS.map((key) => Type.Literal(key)),
    { description: "Feature placement key (FEATURE_*)." }
  )
);

const FeaturesPlacementInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for placement RNG." }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome symbol indices per tile." }),
    vegetationDensity: TypedArraySchemas.f32({ description: "Vegetation density per tile (0..1)." }),
    effectiveMoisture: TypedArraySchemas.f32({ description: "Effective moisture per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature per tile (C)." }),
    aridityIndex: TypedArraySchemas.f32({ description: "Aridity index per tile (0..1)." }),
    freezeIndex: TypedArraySchemas.f32({ description: "Freeze index per tile (0..1)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    terrainType: TypedArraySchemas.u8({ description: "Terrain type id per tile." }),
    latitude: TypedArraySchemas.f32({ description: "Latitude per tile (degrees)." }),
    featureKeyField: TypedArraySchemas.i16({ description: "Existing feature keys per tile (-1 for empty)." }),
    naturalWonderMask: TypedArraySchemas.u8({ description: "Natural wonder mask per tile (1=present)." }),
    nearRiverMask: TypedArraySchemas.u8({ description: "River adjacency mask for near-river checks." }),
    isolatedRiverMask: TypedArraySchemas.u8({ description: "River adjacency mask for isolation checks." }),
    navigableRiverTerrain: Type.Integer({ description: "Terrain id for navigable rivers." }),
    coastTerrain: Type.Integer({ description: "Terrain id for coast/shallow water." }),
  },
  { additionalProperties: false }
);

const FeaturePlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: FeatureKeySchema,
  },
  { additionalProperties: false }
);

const FeaturesPlacementOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

export const planFeaturePlacements = createOp({
  kind: "plan",
  id: "ecology/features/placement",
  input: FeaturesPlacementInputSchema,
  output: FeaturesPlacementOutputSchema,
  config: FeaturesPlacementConfigSchema,
  resolveConfig: (config: FeaturesPlacementConfig) => resolveFeaturesPlacementConfig(config),
  run: (input: FeaturesPlacementInput, config: FeaturesPlacementConfig) => {
    const placements = planFeaturePlacementsImpl(input, config as ResolvedFeaturesPlacementConfig);
    return { placements };
  },
} as const);

export type FeaturesPlacementOutput = Static<typeof FeaturesPlacementOutputSchema>;

export * from "./schema.js";
export * from "./types.js";
