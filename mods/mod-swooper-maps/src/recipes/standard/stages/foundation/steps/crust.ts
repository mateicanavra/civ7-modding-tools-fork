import { ctxRandom, ctxRandomLabel } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import CrustStepContract from "./crust.contract.js";
import { validateCrustArtifact, wrapFoundationValidateNoDims } from "./validation.js";

export default createStep(CrustStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.crust], {
    foundationCrust: {
      validate: (value) => wrapFoundationValidateNoDims(value, validateCrustArtifact),
    },
  }),
  run: (context, config, ops, deps) => {
    const mesh = deps.artifacts.foundationMesh.read(context);
    const stepId = `${CrustStepContract.phase}/${CrustStepContract.id}`;
    const rngSeed = ctxRandom(context, ctxRandomLabel(stepId, "foundation/compute-crust"), 2_147_483_647);

    const crustResult = ops.computeCrust(
      {
        mesh,
        rngSeed,
      },
      config.computeCrust
    );

    deps.artifacts.foundationCrust.publish(context, crustResult.crust);
  },
});
