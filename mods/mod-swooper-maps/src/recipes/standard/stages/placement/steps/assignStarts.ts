import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";

const EmptySchema = Type.Object({}, { additionalProperties: false, default: {} });

export default createStep({
  id: "assignStarts",
  phase: "placement",
  requires: [],
  provides: [],
  schema: EmptySchema,
  run: () => {},
} as const);
