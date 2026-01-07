import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

export const PedologyStepContract = defineStepContract({
  id: "pedology",
  phase: "ecology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield, M3_DEPENDENCY_TAGS.artifact.climateField],
  provides: [M3_DEPENDENCY_TAGS.artifact.pedologyV1],
  schema: Type.Object(
    {
      classify: ecology.ops.classifyPedology.config,
    },
    {
      additionalProperties: false,
      default: {
        classify: ecology.ops.classifyPedology.defaultConfig,
      },
    }
  ),
});
