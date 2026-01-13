import { ctxRandom } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import PlateGraphStepContract from "./plateGraph.contract.js";
import { validatePlateGraphArtifact, wrapFoundationValidateNoDims } from "./validation.js";

export default createStep(PlateGraphStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.plateGraph], {
    foundationPlateGraph: {
      validate: (value) => wrapFoundationValidateNoDims(value, validatePlateGraphArtifact),
    },
  }),
  run: (context, config, ops, deps) => {
    const mesh = deps.artifacts.foundationMesh.read(context);
    const crust = deps.artifacts.foundationCrust.read(context);
    const rng = (max: number, label = "Foundation") => ctxRandom(context, label, max);

    const plateGraphResult = ops.computePlateGraph(
      {
        mesh,
        crust,
        rng,
        trace: context.trace,
      },
      config.computePlateGraph
    );

    deps.artifacts.foundationPlateGraph.publish(context, plateGraphResult.plateGraph);
  },
});
