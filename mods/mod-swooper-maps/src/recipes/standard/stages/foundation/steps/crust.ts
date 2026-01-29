import { ctxRandom, ctxRandomLabel } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import CrustStepContract from "./crust.contract.js";
import { validateCrustArtifact, wrapFoundationValidateNoDims } from "./validation.js";
import { interleaveXY } from "./viz.js";

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

    const positions = interleaveXY(mesh.siteX, mesh.siteY);
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.crust.cellType",
      positions,
      values: crustResult.crust.type,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.crust.cellAge",
      positions,
      values: crustResult.crust.age,
      valueFormat: "u8",
    });
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.crust.cellBaseElevation",
      positions,
      values: crustResult.crust.baseElevation,
      valueFormat: "f32",
    });
  },
});
