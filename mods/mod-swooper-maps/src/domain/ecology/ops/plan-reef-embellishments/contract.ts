import {
  Type,
  applySchemaDefaults,
  defineOpContract,
  TypedArraySchemas,
  type Static,
} from "@swooper/mapgen-core/authoring";

import { EcologyConfigSchema } from "../../config.js";
import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "../../types.js";


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
        features: EcologyConfigSchema.properties.features,
      },
      { additionalProperties: false, default: {} }
    ),
    featuresDensity: EcologyConfigSchema.properties.featuresDensity,
  },
  { additionalProperties: false, default: { story: {}, featuresDensity: {} } }
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
} as const);

export type ResolvedReefEmbellishmentsConfig = {
  story: { features: Required<Static<typeof EcologyConfigSchema["properties"]["features"]>> };
  featuresDensity: Required<Static<typeof EcologyConfigSchema["properties"]["featuresDensity"]>>;
};

type ReefEmbellishmentsConfig = Static<typeof ReefEmbellishmentsConfigSchema>;

export const resolveReefEmbellishmentsConfig = (
  config: ReefEmbellishmentsConfig
): ResolvedReefEmbellishmentsConfig =>
  applySchemaDefaults(ReefEmbellishmentsConfigSchema, config) as ResolvedReefEmbellishmentsConfig;
