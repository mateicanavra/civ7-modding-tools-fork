import { Type } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { M4_EFFECT_TAGS } from "../../../tags.js";

const EmptySchema = Type.Object({}, { additionalProperties: false, default: {} });

export default createStep({
  id: "coastlines",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.landmassApplied],
  provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  schema: EmptySchema,
  run: (context: ExtendedMapContext) => {
    const { width, height } = context.dimensions;
    context.adapter.expandCoasts(width, height);
  },
} as const);
