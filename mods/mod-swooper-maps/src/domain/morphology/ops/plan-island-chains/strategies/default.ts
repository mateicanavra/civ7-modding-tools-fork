import { createStrategy } from "@swooper/mapgen-core/authoring";
import { PerlinNoise } from "@swooper/mapgen-core/lib/noise";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import PlanIslandChainsContract from "../contract.js";
import {
  isWithinRadius,
  normalizeIslandTunables,
  resolveClusterCount,
  selectIslandKind,
  shouldSeedIsland,
  validateIslandInputs,
} from "../rules/index.js";

const BOUNDARY_CONVERGENT = 1;
const BOUNDARY_TRANSFORM = 3;

export const defaultStrategy = createStrategy(PlanIslandChainsContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const { landMask, boundaryCloseness, boundaryType, volcanism } = validateIslandInputs(input);

    const rng = createLabelRng(input.rngSeed | 0);
    const perlin = new PerlinNoise((input.rngSeed | 0) ^ 0x5f356495);
    const noiseScale = 0.1;
    const islandsCfg = config.islands;
    const {
      threshold,
      minDist,
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

        const noise = perlin.noise2D(x * noiseScale, y * noiseScale);
        const noiseValue = Math.max(0, Math.min(1, (noise + 1) / 2));
        const closenessNorm = boundaryCloseness[i] / 255;
        const bType = boundaryType[i] | 0;
        const nearActive =
          bType === BOUNDARY_CONVERGENT || bType === BOUNDARY_TRANSFORM || closenessNorm >= 0.4;
        const baseDen = nearActive ? baseDenActive : baseDenElse;
        const hotspotSignal = (volcanism[i] ?? 0) / 255;
        const allowSeed = shouldSeedIsland({
          noiseValue,
          threshold,
          baseDenom: baseDen,
          hotspotSignal,
          hotspotDenom,
          microcontinentChance,
          rng,
        });
        if (!allowSeed) continue;

        const kind = selectIslandKind({
          hotspotSignal,
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
          edits.push({ index: ni, kind: "coast" });
        }
      }
    }

    return { edits };
  },
});
