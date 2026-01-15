import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { normalizeFractal } from "@swooper/mapgen-core/lib/noise";

import ComputeCoastlineMetricsContract from "../contract.js";
import {
  computePlateBias,
  expandMaskRadius,
  resolveBayPolicy,
  resolveFjordDenom,
  resolveSeaLaneProtection,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeCoastlineMetricsContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const size = Math.max(0, (width | 0) * (height | 0));
    const landMask = input.landMask as Uint8Array;
    const closeness = input.boundaryCloseness as Uint8Array;
    const boundaryType = input.boundaryType as Uint8Array;
    const seaLaneMask = input.seaLaneMask as Uint8Array;
    const activeMarginMask = input.activeMarginMask as Uint8Array;
    const passiveShelfMask = input.passiveShelfMask as Uint8Array;
    const fractal = input.fractal as Int16Array;

    if (
      landMask.length !== size ||
      closeness.length !== size ||
      boundaryType.length !== size ||
      seaLaneMask.length !== size ||
      activeMarginMask.length !== size ||
      passiveShelfMask.length !== size ||
      fractal.length !== size
    ) {
      throw new Error("[CoastlineMetrics] Input tensors must match width*height.");
    }

    const coastCfg = config.coast;
    const bayCfg = coastCfg.bay;
    const fjordCfg = coastCfg.fjord;
    const plateBiasCfg = coastCfg.plateBias;

    const protectionConfig = config.seaLanes;
    const seaLaneRadius = Math.max(0, Math.round(coastCfg.minSeaLaneWidth));
    const expandedSeaLaneMask = expandMaskRadius(width, height, seaLaneMask, seaLaneRadius);
    const rng = createLabelRng(input.rngSeed | 0);

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
        const onSeaLane = expandedSeaLaneMask[i] === 1;
        const protection = resolveSeaLaneProtection(protectionConfig, onSeaLane);
        if (protection.skip) continue;
        const chanceMult = protection.chanceMultiplier;

        if (isCoastalLand(x, y)) {
          const closenessNorm = closeness[i] / 255;
          const { noiseGate, rollDen } = resolveBayPolicy({
            bay: bayCfg,
            plateBias: plateBiasCfg,
            closenessNorm,
            boundaryType: boundaryType[i],
            activeMargin: activeMarginMask[i] === 1,
            chanceMultiplier: chanceMult,
          });
          const gate = normalizeFractal(fractal[i]) * 100;
          if (gate < noiseGate && rng(Math.max(1, rollDen), "bay") === 0) {
            updatedLandMask[i] = 0;
            coastMask[i] = 1;
          }
          continue;
        }

        if (isWaterAdjacentToLand(x, y)) {
          const closenessNorm = closeness[i] / 255;
          const bias = computePlateBias(closenessNorm, boundaryType[i], plateBiasCfg);
          let nearActive = activeMarginMask[i] === 1 || closenessNorm >= plateBiasCfg.threshold;
          let nearPassive = passiveShelfMask[i] === 1;

          forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
            if (nearActive && nearPassive) return;
            const ni = ny * width + nx;
            if (!nearActive && activeMarginMask[ni] === 1) nearActive = true;
            if (!nearPassive && passiveShelfMask[ni] === 1) nearPassive = true;
          });

          const denomUsed = resolveFjordDenom({
            fjord: fjordCfg,
            plateBias: plateBiasCfg,
            bias,
            nearActive,
            nearPassive,
            chanceMultiplier: chanceMult,
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
