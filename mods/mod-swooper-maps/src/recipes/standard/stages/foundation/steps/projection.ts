import { computeSampleStep, renderAsciiGrid } from "@swooper/mapgen-core";
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

    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tilePlateId",
      dims: { width, height },
      format: "i16",
      values: platesResult.plates.id,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileBoundaryType",
      dims: { width, height },
      format: "u8",
      values: platesResult.plates.boundaryType,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileBoundaryCloseness",
      dims: { width, height },
      format: "u8",
      values: platesResult.plates.boundaryCloseness,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileTectonicStress",
      dims: { width, height },
      format: "u8",
      values: platesResult.plates.tectonicStress,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileUpliftPotential",
      dims: { width, height },
      format: "u8",
      values: platesResult.plates.upliftPotential,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileRiftPotential",
      dims: { width, height },
      format: "u8",
      values: platesResult.plates.riftPotential,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileShieldStability",
      dims: { width, height },
      format: "u8",
      values: platesResult.plates.shieldStability,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileVolcanism",
      dims: { width, height },
      format: "u8",
      values: platesResult.plates.volcanism,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileMovementU",
      dims: { width, height },
      format: "i8",
      values: platesResult.plates.movementU,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileMovementV",
      dims: { width, height },
      format: "i8",
      values: platesResult.plates.movementV,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.plates.tileRotation",
      dims: { width, height },
      format: "i8",
      values: platesResult.plates.rotation,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.crustTiles.type",
      dims: { width, height },
      format: "u8",
      values: platesResult.crustTiles.type,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.crustTiles.age",
      dims: { width, height },
      format: "u8",
      values: platesResult.crustTiles.age,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.crustTiles.buoyancy",
      dims: { width, height },
      format: "f32",
      values: platesResult.crustTiles.buoyancy,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.crustTiles.baseElevation",
      dims: { width, height },
      format: "f32",
      values: platesResult.crustTiles.baseElevation,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.crustTiles.strength",
      dims: { width, height },
      format: "f32",
      values: platesResult.crustTiles.strength,
    });
    context.viz?.dumpGrid(context.trace, {
      layerId: "foundation.tileToCellIndex",
      dims: { width, height },
      format: "i32",
      values: platesResult.tileToCellIndex,
    });

    context.trace.event(() => {
      const sampleStep = computeSampleStep(width, height);
      const boundaryType = platesResult.plates.boundaryType;
      const rows = renderAsciiGrid({
        width,
        height,
        sampleStep,
        cellFn: (x, y) => {
          const idx = y * width + x;
          const t = boundaryType[idx] ?? 0;
          const base = t === 1 ? "C" : t === 2 ? "D" : t === 3 ? "T" : ".";
          return { base };
        },
      });
      return {
        kind: "foundation.plates.ascii.boundaryType",
        sampleStep,
        legend: ".=none C=convergent D=divergent T=transform",
        rows,
      };
    });
  },
});
