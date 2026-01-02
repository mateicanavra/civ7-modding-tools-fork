import { Type, type Static } from "typebox";

import { FeaturesConfigSchema, FeaturesDensityConfigSchema } from "../../config.js";

/**
 * Config for post-placement feature embellishments.
 * These are small, narrative-driven additions layered after baseline placement.
 */
export const FeaturesEmbellishmentsConfigSchema = Type.Object(
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

export type FeaturesEmbellishmentsConfig = Static<typeof FeaturesEmbellishmentsConfigSchema>;
