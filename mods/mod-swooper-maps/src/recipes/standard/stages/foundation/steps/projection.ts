import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import ProjectionStepContract from "./projection.contract.js";
import {
  validateDiagnosticsArtifact,
  validatePlatesArtifact,
  validateSeedArtifact,
  wrapFoundationValidate,
  wrapFoundationValidateNoDims,
} from "./validation.js";

export default createStep(ProjectionStepContract, {
  artifacts: implementArtifacts(
    [foundationArtifacts.plates, foundationArtifacts.seed, foundationArtifacts.diagnostics],
    {
      foundationPlates: {
        validate: (value, context) => wrapFoundationValidate(value, context.dimensions, validatePlatesArtifact),
      },
      foundationSeed: {
        validate: (value, context) => wrapFoundationValidate(value, context.dimensions, validateSeedArtifact),
      },
      foundationDiagnostics: {
        validate: (value) => wrapFoundationValidateNoDims(value, validateDiagnosticsArtifact),
      },
    }
  ),
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
        trace: context.trace,
      },
      config.computePlates
    );

    deps.artifacts.foundationPlates.publish(context, platesResult.plates);
    deps.artifacts.foundationSeed.publish(context, platesResult.plateSeed);
    deps.artifacts.foundationDiagnostics.publish(context, platesResult.diagnostics);
  },
});
