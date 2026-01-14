import { ctxRandom, ctxRandomLabel } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import MeshStepContract from "./mesh.contract.js";
import { validateMeshArtifact, wrapFoundationValidateNoDims } from "./validation.js";

export default createStep(MeshStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.mesh], {
    foundationMesh: {
      validate: (value) => wrapFoundationValidateNoDims(value, validateMeshArtifact),
    },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const stepId = `${MeshStepContract.phase}/${MeshStepContract.id}`;
    const rngSeed = ctxRandom(context, ctxRandomLabel(stepId, "foundation/compute-mesh"), 2_147_483_647);

    const meshResult = ops.computeMesh(
      {
        width,
        height,
        rngSeed,
      },
      config.computeMesh
    );

    deps.artifacts.foundationMesh.publish(context, meshResult.mesh);
  },
});
