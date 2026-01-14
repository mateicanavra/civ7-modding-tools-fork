import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import TectonicsStepContract from "./tectonics.contract.js";
import { validateTectonicsArtifact, wrapFoundationValidateNoDims } from "./validation.js";

export default createStep(TectonicsStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.tectonics], {
    foundationTectonics: {
      validate: (value) => wrapFoundationValidateNoDims(value, validateTectonicsArtifact),
    },
  }),
  run: (context, config, ops, deps) => {
    const mesh = deps.artifacts.foundationMesh.read(context);
    const crust = deps.artifacts.foundationCrust.read(context);
    const plateGraph = deps.artifacts.foundationPlateGraph.read(context);

    const tectonicsResult = ops.computeTectonics(
      {
        mesh,
        crust,
        plateGraph,
      },
      config.computeTectonics
    );

    deps.artifacts.foundationTectonics.publish(context, tectonicsResult.tectonics);
  },
});
