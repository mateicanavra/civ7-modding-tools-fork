import { Type, type Static } from "typebox";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";

import { FeaturesConfigSchema, FeaturesDensityConfigSchema } from "../../config.js";

export const VegetationEmbellishmentsConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        features: FeaturesConfigSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    featuresDensity: FeaturesDensityConfigSchema,
  },
  { additionalProperties: false, default: { story: {}, featuresDensity: {} } }
);

export type VegetationEmbellishmentsConfig = Static<typeof VegetationEmbellishmentsConfigSchema>;

export type ResolvedVegetationEmbellishmentsConfig = {
  story: { features: Required<Static<typeof FeaturesConfigSchema>> };
  featuresDensity: Required<Static<typeof FeaturesDensityConfigSchema>>;
};

export const resolveVegetationEmbellishmentsConfig = (
  config: VegetationEmbellishmentsConfig
): ResolvedVegetationEmbellishmentsConfig =>
  applySchemaDefaults(
    VegetationEmbellishmentsConfigSchema,
    config
  ) as ResolvedVegetationEmbellishmentsConfig;
