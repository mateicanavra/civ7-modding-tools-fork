import { createStrategy } from "@swooper/mapgen-core/authoring";
import { PerlinNoise } from "@swooper/mapgen-core/lib/noise";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

import ComputeCoastlineMetricsContract from "../contract.js";
import { computePlateBias, resolveBayPolicy, resolveFjordDenom } from "../rules/index.js";

const BOUNDARY_CONVERGENT = 1;
const BOUNDARY_DIVERGENT = 2;
const BOUNDARY_TRANSFORM = 3;

export const defaultStrategy = createStrategy(ComputeCoastlineMetricsContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const size = Math.max(0, (width | 0) * (height | 0));
    const landMask = input.landMask as Uint8Array;
    const closeness = input.boundaryCloseness as Uint8Array;
    const boundaryType = input.boundaryType as Uint8Array;

    if (landMask.length !== size || closeness.length !== size || boundaryType.length !== size) {
      throw new Error("[CoastlineMetrics] Input tensors must match width*height.");
    }

    const coastCfg = config.coast;
    const bayCfg = coastCfg.bay;
    const fjordCfg = coastCfg.fjord;
    const plateBiasCfg = coastCfg.plateBias;

    const rng = createLabelRng(input.rngSeed | 0);
    const perlin = new PerlinNoise((input.rngSeed | 0) ^ 0x9e3779b9);
    const noiseScale = 0.1;

    const updatedLandMask = new Uint8Array(landMask);
    const coastMask = new Uint8Array(size);

    const isCoastalLand = (x: number, y: number): boolean => {
      const i = y * width + x;
      if (updatedLandMask[i] !== 1) return false;
      let touchesWater = false;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        if (touchesWater) return;
        const ni = ny * width + nx;
        if (updatedLandMask[ni] === 0) touchesWater = true;
      });
      return touchesWater;
    };

    const isWaterAdjacentToLand = (x: number, y: number): boolean => {
      const i = y * width + x;
      if (updatedLandMask[i] !== 0) return false;
      let touchesLand = false;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        if (touchesLand) return;
        const ni = ny * width + nx;
        if (updatedLandMask[ni] === 1) touchesLand = true;
      });
      return touchesLand;
    };

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const bType = boundaryType[i] | 0;
        const isActiveBoundary = bType === BOUNDARY_CONVERGENT || bType === BOUNDARY_TRANSFORM;
        const isPassiveBoundary = bType === BOUNDARY_DIVERGENT;

        if (isCoastalLand(x, y)) {
          const closenessNorm = closeness[i] / 255;
          const { noiseGate, rollDen } = resolveBayPolicy({
            bay: bayCfg,
            plateBias: plateBiasCfg,
            closenessNorm,
            boundaryType: bType,
            activeMargin: isActiveBoundary || closenessNorm >= plateBiasCfg.threshold,
          });
          const noise = perlin.noise2D(x * noiseScale, y * noiseScale);
          const gate = Math.max(0, Math.min(1, (noise + 1) / 2)) * 100;
          if (gate < noiseGate && rng(Math.max(1, rollDen), "bay") === 0) {
            updatedLandMask[i] = 0;
            coastMask[i] = 1;
          }
          continue;
        }

        if (isWaterAdjacentToLand(x, y)) {
          const closenessNorm = closeness[i] / 255;
          const bias = computePlateBias(closenessNorm, bType, plateBiasCfg);
          let nearActive = isActiveBoundary || closenessNorm >= plateBiasCfg.threshold;
          let nearPassive = isPassiveBoundary;

          forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
            if (nearActive && nearPassive) return;
            const ni = ny * width + nx;
            const neighborType = boundaryType[ni] | 0;
            if (!nearActive) {
              if (neighborType === BOUNDARY_CONVERGENT || neighborType === BOUNDARY_TRANSFORM) {
                nearActive = true;
              }
            }
            if (!nearPassive && neighborType === BOUNDARY_DIVERGENT) nearPassive = true;
          });

          const denomUsed = resolveFjordDenom({
            fjord: fjordCfg,
            plateBias: plateBiasCfg,
            bias,
            nearActive,
            nearPassive,
          });

          if (rng(denomUsed, "fjord") === 0) {
            coastMask[i] = 1;
          }
        }
      }
    }

    const coastalLand = new Uint8Array(size);
    const coastalWater = new Uint8Array(size);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const isLand = updatedLandMask[i] === 1;
        let hasOpposite = false;
        forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
          if (hasOpposite) return;
          const ni = ny * width + nx;
          if ((updatedLandMask[ni] === 1) !== isLand) hasOpposite = true;
        });
        if (!hasOpposite) continue;
        if (isLand) coastalLand[i] = 1;
        else coastalWater[i] = 1;
      }
    }

    return { coastalLand, coastalWater, coastMask, landMask: updatedLandMask };
  },
});
