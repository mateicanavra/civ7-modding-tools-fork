import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { crust, mesh, plateGraph, projection, tectonics } from "./steps/index.js";

export default createStage({
  id: "foundation",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [mesh, crust, plateGraph, tectonics, projection],
} as const);
