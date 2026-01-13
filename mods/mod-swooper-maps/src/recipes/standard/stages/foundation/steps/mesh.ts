import { ctxRandom } from "@swooper/mapgen-core";
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
    const rng = (max: number, label = "Foundation") => ctxRandom(context, label, max);

    const meshResult = ops.computeMesh(
      {
        width,
        height,
        rng,
        trace: context.trace,
      },
      config.computeMesh
    );

    deps.artifacts.foundationMesh.publish(context, meshResult.mesh);
  },
});
