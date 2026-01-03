import { Type, type Static } from "typebox";
import { createOp, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import {
  FEATURE_PLACEMENT_KEYS,
  type FeatureKey,
} from "../plan-feature-placements/schema.js";
import {
  ReefEmbellishmentsConfigSchema,
  resolveReefEmbellishmentsConfig,
  type ReefEmbellishmentsConfig,
  type ResolvedReefEmbellishmentsConfig,
} from "./schema.js";
import type { ReefEmbellishmentsInput } from "./types.js";
import { planReefEmbellishments as planReefEmbellishmentsImpl } from "./plan.js";

const FeatureKeySchema = Type.Union(
  FEATURE_PLACEMENT_KEYS.map((key) => Type.Literal(key)),
  { description: "Feature placement key (FEATURE_*)." }
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

const ReefEmbellishmentPlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: FeatureKeySchema,
  },
  { additionalProperties: false }
);

const ReefEmbellishmentsOutputSchema = Type.Object(
  {
    placements: Type.Array(ReefEmbellishmentPlacementSchema),
  },
  { additionalProperties: false }
);

export const planReefEmbellishments = createOp({
  kind: "plan",
  id: "ecology/features/reef-embellishments",
  input: ReefEmbellishmentsInputSchema,
  output: ReefEmbellishmentsOutputSchema,
  config: ReefEmbellishmentsConfigSchema,
  resolveConfig: (config: ReefEmbellishmentsConfig) => resolveReefEmbellishmentsConfig(config),
  run: (input: ReefEmbellishmentsInput, config: ReefEmbellishmentsConfig) => {
    const placements = planReefEmbellishmentsImpl(
      input,
      config as ResolvedReefEmbellishmentsConfig
    );
    return { placements };
  },
} as const);

export type ReefEmbellishmentsOutput = Static<typeof ReefEmbellishmentsOutputSchema>;
export type { FeatureKey };

export * from "./schema.js";
export * from "./types.js";
