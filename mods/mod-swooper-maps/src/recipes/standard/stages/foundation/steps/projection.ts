import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import ProjectionStepContract from "./projection.contract.js";
import { validatePlatesArtifact, wrapFoundationValidate } from "./validation.js";

export default createStep(ProjectionStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.plates], {
    foundationPlates: {
      validate: (value, context) => wrapFoundationValidate(value, context.dimensions, validatePlatesArtifact),
    },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const mesh = deps.artifacts.foundationMesh.read(context);
    const plateGraph = deps.artifacts.foundationPlateGraph.read(context);
    const tectonics = deps.artifacts.foundationTectonics.read(context);

    const platesResult = ops.computePlates(
      {
        width,
        height,
        mesh,
        plateGraph,
        tectonics,
      },
      config.computePlates
    );

    deps.artifacts.foundationPlates.publish(context, platesResult.plates);
  },
});
