import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import ProjectionStepContract from "./projection.contract.js";
import {
  validateCrustTilesArtifact,
  validatePlatesArtifact,
  validateTileToCellIndexArtifact,
  wrapFoundationValidate,
} from "./validation.js";
import {
  FOUNDATION_PLATE_ACTIVITY_BOUNDARY_INFLUENCE_DISTANCE_DELTA,
  FOUNDATION_PLATE_ACTIVITY_KINEMATICS_MULTIPLIER,
} from "@mapgen/domain/foundation/shared/knob-multipliers.js";
import type { FoundationPlateActivityKnob } from "@mapgen/domain/foundation/shared/knobs.js";

function clampInt(value: number, bounds: { min: number; max?: number }): number {
  const rounded = Math.round(value);
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, rounded));
}

function clampNumber(value: number, bounds: { min: number; max?: number }): number {
  if (!Number.isFinite(value)) return bounds.min;
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, value));
}

export default createStep(ProjectionStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.plates, foundationArtifacts.tileToCellIndex, foundationArtifacts.crustTiles], {
    foundationPlates: {
      validate: (value, context) => wrapFoundationValidate(value, context.dimensions, validatePlatesArtifact),
    },
    foundationTileToCellIndex: {
      validate: (value, context) => wrapFoundationValidate(value, context.dimensions, validateTileToCellIndexArtifact),
    },
    foundationCrustTiles: {
      validate: (value, context) => wrapFoundationValidate(value, context.dimensions, validateCrustTilesArtifact),
    },
  }),
  normalize: (config, ctx) => {
    const { plateActivity } = ctx.knobs as Readonly<{ plateActivity?: FoundationPlateActivityKnob }>;
    const kinematicsMultiplier = FOUNDATION_PLATE_ACTIVITY_KINEMATICS_MULTIPLIER[plateActivity ?? "normal"] ?? 1.0;
    const boundaryDelta =
      FOUNDATION_PLATE_ACTIVITY_BOUNDARY_INFLUENCE_DISTANCE_DELTA[plateActivity ?? "normal"] ?? 0;

    const computePlates =
      config.computePlates.strategy === "default"
        ? {
            ...config.computePlates,
            config: {
              ...config.computePlates.config,
              boundaryInfluenceDistance: clampInt(
                (config.computePlates.config.boundaryInfluenceDistance ?? 0) + boundaryDelta,
                { min: 1, max: 32 }
              ),
              movementScale: clampNumber((config.computePlates.config.movementScale ?? 0) * kinematicsMultiplier, {
                min: 1,
                max: 200,
              }),
              rotationScale: clampNumber((config.computePlates.config.rotationScale ?? 0) * kinematicsMultiplier, {
                min: 1,
                max: 200,
              }),
            },
          }
        : config.computePlates;

    return { ...config, computePlates };
  },
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const mesh = deps.artifacts.foundationMesh.read(context);
    const crust = deps.artifacts.foundationCrust.read(context);
    const plateGraph = deps.artifacts.foundationPlateGraph.read(context);
    const tectonics = deps.artifacts.foundationTectonics.read(context);

    const platesResult = ops.computePlates(
      {
        width,
        height,
        mesh,
        crust,
        plateGraph,
        tectonics,
      },
      config.computePlates
    );

    deps.artifacts.foundationPlates.publish(context, platesResult.plates);
    deps.artifacts.foundationTileToCellIndex.publish(context, platesResult.tileToCellIndex);
    deps.artifacts.foundationCrustTiles.publish(context, platesResult.crustTiles);
  },
});
