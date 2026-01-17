import { Type, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

export const HydrologyWindFieldSchema = Type.Object(
  {
    windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
    windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
    currentU: TypedArraySchemas.i8({ description: "Current U component per tile (-127..127)." }),
    currentV: TypedArraySchemas.i8({ description: "Current V component per tile (-127..127)." }),
  },
  { additionalProperties: false }
);

export type HydrologyWindFields = Static<typeof HydrologyWindFieldSchema>;
