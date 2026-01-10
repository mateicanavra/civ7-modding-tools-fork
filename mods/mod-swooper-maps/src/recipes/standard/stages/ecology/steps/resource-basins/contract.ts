import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const ResourceBasinsStepContract = defineStep({
  id: "resource-basins",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.pedologyV1,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.resourceBasinsV1],
  schema: Type.Object({
    plan: ecology.ops.planResourceBasins.config,
    score: ecology.ops.scoreResourceBasins.config,
  }),
});

export default ResourceBasinsStepContract;
