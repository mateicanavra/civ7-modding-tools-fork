import { createOp } from "@swooper/mapgen-core/authoring";
import { devLogIf } from "@swooper/mapgen-core";
import type { TraceScope } from "@swooper/mapgen-core";

import PlateSeedManager from "../../plate-seed.js";
import { computePlatesVoronoi } from "../../plates.js";
import type { PlateConfig, RngFunction, VoronoiUtilsInterface } from "../../types.js";
import ComputePlatesTensorsContract from "./contract.js";
import type { ComputePlatesTensorsConfig } from "./contract.js";

function requireRng(rng: RngFunction | undefined, scope: string): RngFunction {
  if (!rng) {
    throw new Error(`[Foundation] RNG not provided for ${scope}.`);
  }
  return rng;
}

function buildPlateConfig(
  config: ComputePlatesTensorsConfig
): PlateConfig {
  const count = (config.plateCount ?? 8) | 0;
  const convergenceMix = config.convergenceMix ?? 0.5;
  const relaxationSteps = (config.relaxationSteps ?? 5) | 0;
  const plateRotationMultiple = config.plateRotationMultiple ?? 1;
  const seedMode = config.seedMode ?? "engine";
  const seedOffset = Math.trunc(config.seedOffset ?? 0);
  const fixedSeedValue = config.fixedSeed;
  const fixedSeed =
    typeof fixedSeedValue === "number" && Number.isFinite(fixedSeedValue) ? Math.trunc(fixedSeedValue) : undefined;

  return {
    count,
    relaxationSteps,
    convergenceMix,
    plateRotationMultiple,
    seedMode,
    fixedSeed,
    seedOffset,
  };
}

const computePlatesTensors = createOp(ComputePlatesTensorsContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const trace = (input.trace ?? null) as TraceScope | null;

        const rng = requireRng(input.rng as unknown as RngFunction | undefined, "foundation/compute-plates-tensors");
        const voronoiUtils = input.voronoiUtils as unknown as VoronoiUtilsInterface;

        const plateConfig = buildPlateConfig(config as unknown as ComputePlatesTensorsConfig);

        devLogIf(
          trace,
          "LOG_FOUNDATION_PLATES",
          `[Foundation] Config plates.count=${plateConfig.count}, relaxationSteps=${plateConfig.relaxationSteps}, ` +
            `convergenceMix=${plateConfig.convergenceMix}, rotationMultiple=${plateConfig.plateRotationMultiple}, ` +
            `seedMode=${plateConfig.seedMode}, seedOffset=${plateConfig.seedOffset}, fixedSeed=${
              plateConfig.fixedSeed ?? "n/a"
            }`
        );

        const { snapshot: seedBase } = PlateSeedManager.capture(width, height, plateConfig);
        const plateData = computePlatesVoronoi(width, height, plateConfig, { rng, voronoiUtils });

        if (!plateData) {
          throw new Error("[Foundation] Plate generation failed.");
        }

        const meta = plateData.meta;
        const plateSeed =
          PlateSeedManager.finalize(seedBase, {
            config: plateConfig,
            meta: meta ? { seedLocations: meta.seedLocations } : undefined,
          }) ||
          Object.freeze({
            width,
            height,
            seedMode: "engine" as const,
            config: Object.freeze({ ...plateConfig }),
          });

        return {
          plates: Object.freeze({
            id: plateData.plateId,
            boundaryCloseness: plateData.boundaryCloseness,
            boundaryType: plateData.boundaryType,
            tectonicStress: plateData.tectonicStress,
            upliftPotential: plateData.upliftPotential,
            riftPotential: plateData.riftPotential,
            shieldStability: plateData.shieldStability,
            movementU: plateData.plateMovementU,
            movementV: plateData.plateMovementV,
            rotation: plateData.plateRotation,
          }),
          plateSeed,
          diagnostics: Object.freeze({ boundaryTree: plateData.boundaryTree ?? null }),
        } as const;
      },
    },
  },
});

export default computePlatesTensors;
