import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import PlanVolcanoesContract from "../contract.js";
import {
  applyVolcanoWeightAdjustments,
  isTooClose,
  normalizeVolcanoTuning,
  resolveTargetVolcanoes,
  scoreVolcanoWeight,
  validateVolcanoInputs,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(PlanVolcanoesContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const { size, landMask, boundaryCloseness, boundaryType, shieldStability, volcanism } =
      validateVolcanoInputs(input);

    if (!config.enabled) return { volcanoes: [] };

    let landTiles = 0;
    for (let i = 0; i < size; i++) {
      if (landMask[i] === 1) landTiles++;
    }

    const targetVolcanoes = resolveTargetVolcanoes(landTiles, config);

    if (targetVolcanoes <= 0) return { volcanoes: [] };

    const rng = createLabelRng(input.rngSeed | 0);
    const candidates: Array<{ index: number; weight: number }> = [];

    const { hotspotBase, threshold, shieldWeight, jitter, minSpacing } =
      normalizeVolcanoTuning(config);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (landMask[i] === 0) continue;

        const closeness = boundaryCloseness[i] / 255;
        const shield = shieldStability[i] / 255;
        const bType = boundaryType[i] | 0;
        const hotspotBoost = (volcanism[i] / 255) * hotspotBase;

        let weight = scoreVolcanoWeight({
          closeness,
          boundaryType: bType,
          hotspotBase,
          hotspotBoost,
          threshold,
          boundaryWeight: config.boundaryWeight,
          convergentMultiplier: config.convergentMultiplier,
          transformMultiplier: config.transformMultiplier,
          divergentMultiplier: config.divergentMultiplier,
        });

        if (weight <= 0) continue;

        weight = applyVolcanoWeightAdjustments({
          weight,
          shield,
          shieldPenalty: shieldWeight,
          jitter,
          rng,
        });

        if (weight > 0) {
          candidates.push({ index: i, weight });
        }
      }
    }

    if (candidates.length === 0) return { volcanoes: [] };

    candidates.sort((a, b) => b.weight - a.weight);

    const placed: Array<{ x: number; y: number; index: number }> = [];
    for (const candidate of candidates) {
      if (placed.length >= targetVolcanoes) break;
      const y = (candidate.index / width) | 0;
      const x = candidate.index - y * width;
      if (isTooClose(x, y, placed, minSpacing)) continue;
      placed.push({ x, y, index: candidate.index });
    }

    return { volcanoes: placed.map((entry) => ({ index: entry.index })) };
  },
});
