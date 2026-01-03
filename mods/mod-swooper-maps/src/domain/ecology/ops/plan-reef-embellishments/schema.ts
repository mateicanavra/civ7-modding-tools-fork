import { Type, type Static } from "typebox";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";

import { FeaturesConfigSchema, FeaturesDensityConfigSchema } from "../../config.js";

export const ReefEmbellishmentsConfigSchema = Type.Object(
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

export type ReefEmbellishmentsConfig = Static<typeof ReefEmbellishmentsConfigSchema>;

export type ResolvedReefEmbellishmentsConfig = {
  story: { features: Required<Static<typeof FeaturesConfigSchema>> };
  featuresDensity: Required<Static<typeof FeaturesDensityConfigSchema>>;
};

export const resolveReefEmbellishmentsConfig = (
  config: ReefEmbellishmentsConfig
): ResolvedReefEmbellishmentsConfig =>
  applySchemaDefaults(
    ReefEmbellishmentsConfigSchema,
    config
  ) as ResolvedReefEmbellishmentsConfig;
