import { ctxRandom, ctxRandomLabel } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { foundationArtifacts } from "../artifacts.js";
import PlateGraphStepContract from "./plateGraph.contract.js";
import { validatePlateGraphArtifact, wrapFoundationValidateNoDims } from "./validation.js";
import { FOUNDATION_PLATE_COUNT_MULTIPLIER } from "@mapgen/domain/foundation/shared/knob-multipliers.js";
import type { FoundationPlateCountKnob } from "@mapgen/domain/foundation/shared/knobs.js";
import { interleaveXY, pointsFromPlateSeeds } from "./viz.js";

function clampInt(value: number, bounds: { min: number; max?: number }): number {
  const rounded = Math.round(value);
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, rounded));
}

export default createStep(PlateGraphStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.plateGraph], {
    foundationPlateGraph: {
      validate: (value) => wrapFoundationValidateNoDims(value, validatePlateGraphArtifact),
    },
  }),
  normalize: (config, ctx) => {
    const { plateCount } = ctx.knobs as Readonly<{ plateCount?: FoundationPlateCountKnob }>;
    const multiplier = FOUNDATION_PLATE_COUNT_MULTIPLIER[plateCount ?? "normal"] ?? 1.0;

    const computePlateGraph =
      config.computePlateGraph.strategy === "default"
        ? {
            ...config.computePlateGraph,
            config: {
              ...config.computePlateGraph.config,
              plateCount: clampInt((config.computePlateGraph.config.plateCount ?? 0) * multiplier, {
                min: 2,
                max: 256,
              }),
            },
          }
        : config.computePlateGraph;

    return { ...config, computePlateGraph };
  },
  run: (context, config, ops, deps) => {
    const mesh = deps.artifacts.foundationMesh.read(context);
    const crust = deps.artifacts.foundationCrust.read(context);
    const stepId = `${PlateGraphStepContract.phase}/${PlateGraphStepContract.id}`;
    const rngSeed = ctxRandom(context, ctxRandomLabel(stepId, "foundation/compute-plate-graph"), 2_147_483_647);

    const plateGraphResult = ops.computePlateGraph(
      {
        mesh,
        crust,
        rngSeed,
      },
      config.computePlateGraph
    );

    deps.artifacts.foundationPlateGraph.publish(context, plateGraphResult.plateGraph);

    const positions = interleaveXY(mesh.siteX, mesh.siteY);
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.plateGraph.cellToPlate",
      positions,
      values: plateGraphResult.plateGraph.cellToPlate,
      valueFormat: "i16",
    });

    const seeds = pointsFromPlateSeeds(plateGraphResult.plateGraph.plates);
    context.viz?.dumpPoints(context.trace, {
      layerId: "foundation.plateGraph.plateSeeds",
      positions: seeds.positions,
      values: seeds.ids,
      valueFormat: "i16",
    });
  },
});
