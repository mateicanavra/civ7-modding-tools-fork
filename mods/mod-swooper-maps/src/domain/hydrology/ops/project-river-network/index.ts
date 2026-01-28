import { createOp } from "@swooper/mapgen-core/authoring";
import ProjectRiverNetworkContract from "./contract.js";
import { defaultStrategy, physicsStrategy } from "./strategies/index.js";

const projectRiverNetwork = createOp(ProjectRiverNetworkContract, {
  strategies: { default: defaultStrategy, physics: physicsStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default projectRiverNetwork;
