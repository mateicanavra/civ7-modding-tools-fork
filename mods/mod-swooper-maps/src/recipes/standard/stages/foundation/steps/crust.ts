import { ctxRandom } from "@swooper/mapgen-core";
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
    const rng = (max: number, label = "Foundation") => ctxRandom(context, label, max);

    const crustResult = ops.computeCrust(
      {
        mesh,
        rng,
        trace: context.trace,
      },
      config.computeCrust
    );

    deps.artifacts.foundationCrust.publish(context, crustResult.crust);
  },
});
