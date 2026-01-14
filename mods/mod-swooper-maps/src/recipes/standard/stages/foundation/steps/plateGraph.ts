import { ctxRandom, ctxRandomLabel } from "@swooper/mapgen-core";
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
    const stepId = `${PlateGraphStepContract.phase}/${PlateGraphStepContract.id}`;
    const rngSeed = ctxRandom(context, ctxRandomLabel(stepId, "foundation/compute-plate-graph"), 2_147_483_647);

    const plateGraphResult = ops.computePlateGraph(
      {
        mesh,
        crust,
        rngSeed,
      },
      config.computePlateGraph
    );

    deps.artifacts.foundationPlateGraph.publish(context, plateGraphResult.plateGraph);
  },
});
