import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { foundation } from "./steps/index.js";

export default createStage({
  id: "foundation",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  public: Type.Partial(foundation.contract.schema),
  compile: ({ env, knobs, config }) => {
    void env;
    void knobs;
    return {
      foundation: config,
    };
  },
  steps: [foundation],
} as const);
