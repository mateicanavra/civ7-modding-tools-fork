import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";
import { normalizeFractal } from "@swooper/mapgen-core/lib/noise";

import PlanIslandChainsContract from "../contract.js";
import {
  isWithinRadius,
  normalizeIslandTunables,
  resolveClusterCount,
  selectIslandKind,
  shouldSeedIsland,
  validateIslandInputs,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(PlanIslandChainsContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const { landMask, seaLaneMask, activeMarginMask, hotspotMask, fractal } =
      validateIslandInputs(input);

    const rng = createLabelRng(input.rngSeed | 0);
    const islandsCfg = config.islands;
    const hotspotCfg = config.hotspot;
    const {
      threshold,
      minDist,
      seaLaneRadius,
      baseDenActive,
      baseDenElse,
      hotspotDenom,
      microcontinentChance,
    } = normalizeIslandTunables(config);

    const edits: Array<{ index: number; kind: "coast" | "peak" }> = [];

    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const i = y * width + x;
        if (landMask[i] === 1) continue;
        if (isWithinRadius(width, height, x, y, minDist, landMask)) continue;
        if (seaLaneRadius > 0 && isWithinRadius(width, height, x, y, seaLaneRadius, seaLaneMask)) continue;

        const fractalNorm = normalizeFractal(fractal[i]);
        const nearActive = activeMarginMask[i] === 1;
        const baseDen = nearActive ? baseDenActive : baseDenElse;
        const allowSeed = shouldSeedIsland({
          fractalNorm,
          threshold,
          baseDenom: baseDen,
          hotspotMask: hotspotMask[i] === 1,
          hotspotDenom,
          microcontinentChance,
          rng,
        });
        if (!allowSeed) continue;

        const kind = selectIslandKind({
          hotspotMask: hotspotMask[i] === 1,
          hotspotConfig: hotspotCfg,
          rng,
        });

        edits.push({ index: i, kind });

        const count = resolveClusterCount(islandsCfg, rng);
        for (let n = 0; n < count; n++) {
          const dx = rng(3, "island-dx") - 1;
          const dy = rng(3, "island-dy") - 1;
          const nx = x + dx;
          const ny = y + dy;
          if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
          const ni = ny * width + nx;
          if (landMask[ni] === 1) continue;
          if (seaLaneRadius > 0 && isWithinRadius(width, height, nx, ny, seaLaneRadius, seaLaneMask)) continue;
          edits.push({ index: ni, kind: "coast" });
        }
      }
    }

    return { edits };
  },
});
