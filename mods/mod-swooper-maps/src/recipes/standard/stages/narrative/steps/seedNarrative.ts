import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";

const EmptySchema = Type.Object({}, { additionalProperties: false, default: {} });

export default createStep({
  id: "seedNarrative",
  phase: "morphology",
  requires: [],
  provides: [],
  schema: EmptySchema,
  run: () => {},
} as const);
