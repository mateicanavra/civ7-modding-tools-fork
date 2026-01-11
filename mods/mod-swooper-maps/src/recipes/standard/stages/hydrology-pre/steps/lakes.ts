import { createStep } from "@mapgen/authoring/steps";
import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { publishHeightfieldArtifact } from "../../../artifacts.js";
import { getStandardRuntime } from "../../../runtime.js";
import LakesStepContract from "./lakes.contract.js";
export default createStep(LakesStepContract, {
  run: (context: ExtendedMapContext) => {
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const iTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
    context.adapter.generateLakes(width, height, iTilesPerLake);
    syncHeightfield(context);
    publishHeightfieldArtifact(context);
  },
});
