import {
  Type,
  defineOpContract,
  TypedArraySchemas,
} from "@swooper/mapgen-core/authoring";

import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";

const FeaturesConfigSchema = Type.Object(
  {
    volcanicForestChance: Type.Number({ default: 22, minimum: 0, maximum: 100 }),
    volcanicTaigaChance: Type.Number({ default: 25, minimum: 0, maximum: 100 }),
    volcanicForestBonus: Type.Number({ default: 6, minimum: 0, maximum: 100 }),
    volcanicTaigaBonus: Type.Number({ default: 5, minimum: 0, maximum: 100 }),
    volcanicRadius: Type.Number({ default: 1, minimum: 1 }),
    volcanicForestMinRainfall: Type.Number({ default: 95, minimum: 0 }),
    volcanicTaigaMinLatitude: Type.Number({ default: 20, minimum: 0 }),
    volcanicTaigaMaxElevation: Type.Number({ default: 600 }),
    volcanicTaigaMinRainfall: Type.Number({ default: 70, minimum: 0 }),
  },
  { additionalProperties: false }
);

const FeaturesDensityConfigSchema = Type.Object(
  {
    rainforestExtraChance: Type.Number({ default: 55, minimum: 0, maximum: 100 }),
    forestExtraChance: Type.Number({ default: 30, minimum: 0, maximum: 100 }),
    taigaExtraChance: Type.Number({ default: 35, minimum: 0, maximum: 100 }),
    rainforestVegetationScale: Type.Number({ default: 50, minimum: 0 }),
    forestVegetationScale: Type.Number({ default: 30, minimum: 0 }),
    taigaVegetationScale: Type.Number({ default: 20, minimum: 0 }),
    rainforestMinRainfall: Type.Number({ default: 130, minimum: 0 }),
    forestMinRainfall: Type.Number({ default: 100, minimum: 0 }),
    taigaMaxElevation: Type.Number({ default: 300 }),
    minVegetationForBonus: Type.Number({ default: 0.01, minimum: 0, maximum: 1 }),
  },
  { additionalProperties: false }
);

const VegetationEmbellishmentsConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        features: FeaturesConfigSchema,
      },
      { additionalProperties: false }
    ),
    featuresDensity: FeaturesDensityConfigSchema,
  },
  { additionalProperties: false }
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

export const PlanVegetationEmbellishmentsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/vegetation-embellishments",
  input: VegetationEmbellishmentsInputSchema,
  output: VegetationEmbellishmentsOutputSchema,
  strategies: {
    default: VegetationEmbellishmentsConfigSchema,
  },
});

export default PlanVegetationEmbellishmentsContract;
