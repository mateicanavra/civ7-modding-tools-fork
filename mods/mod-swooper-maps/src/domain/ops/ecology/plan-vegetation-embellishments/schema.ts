import {
  Type,
  applySchemaDefaults,
  defineOpSchema,
  TypedArraySchemas,
  type Static,
} from "@swooper/mapgen-core/authoring";

import { EcologyConfigSchema } from '../../../ecology/config.js';
import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from '../../../ecology/types.js';

const VegetationEmbellishmentsConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        features: EcologyConfigSchema.properties.features,
      },
      { additionalProperties: false, default: {} }
    ),
    featuresDensity: EcologyConfigSchema.properties.featuresDensity,
  },
  { additionalProperties: false, default: { story: {}, featuresDensity: {} } }
);

const FeatureKeySchema = Type.Unsafe<FeatureKey>(
  Type.Union(
    FEATURE_PLACEMENT_KEYS.map((key) => Type.Literal(key)),
    { description: "Feature placement key (FEATURE_*)." }
  )
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

export const PlanVegetationEmbellishmentsSchema = defineOpSchema<
  typeof VegetationEmbellishmentsInputSchema,
  typeof VegetationEmbellishmentsConfigSchema,
  typeof VegetationEmbellishmentsOutputSchema
>(
  {
    input: VegetationEmbellishmentsInputSchema,
    config: VegetationEmbellishmentsConfigSchema,
    output: VegetationEmbellishmentsOutputSchema,
  },
  {
    title: "PlanVegetationEmbellishmentsSchema",
    description: "Plan vegetation embellishments",
    additionalProperties: false,
  }
);

type VegetationEmbellishmentsConfig =
  Static<typeof PlanVegetationEmbellishmentsSchema["properties"]["config"]>;

export type ResolvedVegetationEmbellishmentsConfig = {
  story: { features: Required<Static<typeof EcologyConfigSchema["properties"]["features"]>> };
  featuresDensity: Required<Static<typeof EcologyConfigSchema["properties"]["featuresDensity"]>>;
};

export const resolveVegetationEmbellishmentsConfig = (
  config: VegetationEmbellishmentsConfig
): ResolvedVegetationEmbellishmentsConfig =>
  applySchemaDefaults(
    VegetationEmbellishmentsConfigSchema,
    config
  ) as ResolvedVegetationEmbellishmentsConfig;
