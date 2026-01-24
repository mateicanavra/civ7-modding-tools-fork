import { ctxRandom, ctxRandomLabel } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import MeshStepContract from "./mesh.contract.js";
import { validateMeshArtifact, wrapFoundationValidateNoDims } from "./validation.js";
import { FOUNDATION_PLATE_COUNT_MULTIPLIER } from "@mapgen/domain/foundation/shared/knob-multipliers.js";
import type { FoundationPlateCountKnob } from "@mapgen/domain/foundation/shared/knobs.js";

function clampInt(value: number, bounds: { min: number; max?: number }): number {
  const rounded = Math.round(value);
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, rounded));
}

export default createStep(MeshStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.mesh], {
    foundationMesh: {
      validate: (value) => wrapFoundationValidateNoDims(value, validateMeshArtifact),
    },
  }),
  normalize: (config, ctx) => {
    const { plateCount } = ctx.knobs as Readonly<{ plateCount?: FoundationPlateCountKnob }>;
    const multiplier = FOUNDATION_PLATE_COUNT_MULTIPLIER[plateCount ?? "normal"] ?? 1.0;

    const computeMesh =
      config.computeMesh.strategy === "default"
        ? {
            ...config.computeMesh,
            config: {
              ...config.computeMesh.config,
              plateCount: clampInt((config.computeMesh.config.plateCount ?? 0) * multiplier, {
                min: 2,
                max: 256,
              }),
            },
          }
        : config.computeMesh;

    return { ...config, computeMesh };
  },
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
