import {
  Type,
  defineOpContract,
  TypedArraySchemas,
} from "@swooper/mapgen-core/authoring";

import { FeaturesConfigSchema, FeaturesDensityConfigSchema } from "../../config.js";
import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";


const FeatureKeySchema = Type.Unsafe<FeatureKey>(
  Type.Union(
    FEATURE_PLACEMENT_KEYS.map((key) => Type.Literal(key)),
    { description: "Feature placement key (FEATURE_*)." }
  )
);


const ReefEmbellishmentPlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: FeatureKeySchema,
  },
  { additionalProperties: false }
);

const ReefEmbellishmentsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for reef embellishments." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    featureKeyField: TypedArraySchemas.i16({
      description: "Existing feature key indices per tile (-1 for empty).",
    }),
    paradiseMask: TypedArraySchemas.u8({ description: "Paradise hotspot mask per tile." }),
    passiveShelfMask: TypedArraySchemas.u8({ description: "Passive shelf mask per tile." }),
  },
  { additionalProperties: false }
);

const ReefEmbellishmentsConfigSchema = Type.Object(
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

const ReefEmbellishmentsOutputSchema = Type.Object(
  {
    placements: Type.Array(ReefEmbellishmentPlacementSchema),
  },
  { additionalProperties: false }
);

export const PlanReefEmbellishmentsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/reef-embellishments",
  input: ReefEmbellishmentsInputSchema,
  output: ReefEmbellishmentsOutputSchema,
  strategies: {
    default: ReefEmbellishmentsConfigSchema,
  },
});

export default PlanReefEmbellishmentsContract;
