import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyPreArtifacts } from "../../../hydrology-pre/artifacts.js";

const ResourceBasinsStepContract = defineStep({
  id: "resource-basins",
  phase: "ecology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      ecologyArtifacts.pedology,
      hydrologyPreArtifacts.heightfield,
      hydrologyPreArtifacts.climateField,
    ],
    provides: [ecologyArtifacts.resourceBasins],
  },
  ops: {
    plan: ecology.ops.planResourceBasins,
    score: ecology.ops.scoreResourceBasins,
  },
  schema: Type.Object(
    {},
    {
      description: "Configuration for planning and scoring resource basins.",
    }
  ),
});

export default ResourceBasinsStepContract;
