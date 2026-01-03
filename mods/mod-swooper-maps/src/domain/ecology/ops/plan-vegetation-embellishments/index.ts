import { Type, type Static } from "typebox";
import { createOp, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import {
  FEATURE_PLACEMENT_KEYS,
  type FeatureKey,
} from "../plan-feature-placements/schema.js";
import {
  VegetationEmbellishmentsConfigSchema,
  resolveVegetationEmbellishmentsConfig,
  type ResolvedVegetationEmbellishmentsConfig,
  type VegetationEmbellishmentsConfig,
} from "./schema.js";
import type { VegetationEmbellishmentsInput } from "./types.js";
import { planVegetationEmbellishments as planVegetationEmbellishmentsImpl } from "./plan.js";

const FeatureKeySchema = Type.Union(
  FEATURE_PLACEMENT_KEYS.map((key) => Type.Literal(key)),
  { description: "Feature placement key (FEATURE_*)." }
);

const VegetationEmbellishmentsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for vegetation embellishments." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    terrainType: TypedArraySchemas.u8({ description: "Terrain type id per tile." }),
    featureKeyField: TypedArraySchemas.i16({
      description: "Existing feature key indices per tile (-1 for empty).",
    }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome symbol indices per tile." }),
    rainfall: TypedArraySchemas.u8({ description: "Rainfall per tile (0..255)." }),
    vegetationDensity: TypedArraySchemas.f32({ description: "Vegetation density per tile (0..1)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation per tile (meters)." }),
    latitude: TypedArraySchemas.f32({ description: "Latitude per tile (degrees)." }),
    volcanicMask: TypedArraySchemas.u8({ description: "Volcanic hotspot mask per tile." }),
    navigableRiverTerrain: Type.Integer({ description: "Terrain id for navigable rivers." }),
  },
  { additionalProperties: false }
);

const VegetationEmbellishmentPlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: FeatureKeySchema,
  },
  { additionalProperties: false }
);

const VegetationEmbellishmentsOutputSchema = Type.Object(
  {
    placements: Type.Array(VegetationEmbellishmentPlacementSchema),
  },
  { additionalProperties: false }
);

export const planVegetationEmbellishments = createOp({
  kind: "plan",
  id: "ecology/features/vegetation-embellishments",
  input: VegetationEmbellishmentsInputSchema,
  output: VegetationEmbellishmentsOutputSchema,
  config: VegetationEmbellishmentsConfigSchema,
  resolveConfig: (config: VegetationEmbellishmentsConfig) =>
    resolveVegetationEmbellishmentsConfig(config),
  run: (input: VegetationEmbellishmentsInput, config: VegetationEmbellishmentsConfig) => {
    const placements = planVegetationEmbellishmentsImpl(
      input,
      config as ResolvedVegetationEmbellishmentsConfig
    );
    return { placements };
  },
} as const);

export type VegetationEmbellishmentsOutput = Static<typeof VegetationEmbellishmentsOutputSchema>;
export type { FeatureKey };

export * from "./schema.js";
export * from "./types.js";
