import { createStrategy } from "@swooper/mapgen-core/authoring";
import { getHexNeighborIndicesOddQ } from "@swooper/mapgen-core/lib/grid";
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
    const used = new Uint8Array(Math.max(0, (width | 0) * (height | 0)));

    function pushEdit(index: number, kind: "coast" | "peak"): void {
      const idx = index | 0;
      if (idx < 0 || idx >= used.length) return;
      if (used[idx] === 1) return;
      used[idx] = 1;
      edits.push({ index: idx, kind });
    }

    function growPatch(params: {
      seedIndex: number;
      seedKind: "coast" | "peak";
      targetTiles: number;
      label: string;
    }): void {
      const seedIndex = params.seedIndex | 0;
      if (seedIndex < 0 || seedIndex >= used.length) return;
      if (landMask[seedIndex] === 1) return;
      if (used[seedIndex] === 1) return;

      const targetTiles = Math.max(1, Math.floor(params.targetTiles));
      pushEdit(seedIndex, params.seedKind);
      if (targetTiles <= 1) return;

      const frontier: number[] = [seedIndex];
      let added = 1;

      const maxIterations = Math.max(targetTiles * 24, 64);
      let iterations = 0;

      while (frontier.length > 0 && added < targetTiles && iterations < maxIterations) {
        iterations += 1;
        const fromPos = rng(frontier.length, `${params.label}:frontier`) | 0;
        const fromIndex = frontier[fromPos] ?? -1;
        if (fromIndex < 0) break;
        const fy = (fromIndex / width) | 0;
        const fx = fromIndex - fy * width;
        const neighbors = getHexNeighborIndicesOddQ(fx, fy, width, height);
        if (neighbors.length === 0) {
          frontier[fromPos] = frontier[frontier.length - 1] ?? fromIndex;
          frontier.pop();
          continue;
        }

        let picked = -1;
        const start = rng(neighbors.length, `${params.label}:neighborStart`) | 0;
        for (let offset = 0; offset < neighbors.length; offset++) {
          const nextIndex = neighbors[(start + offset) % neighbors.length] ?? -1;
          if (nextIndex < 0) continue;
          if (used[nextIndex] === 1) continue;
          if (landMask[nextIndex] === 1) continue;

          const ny = (nextIndex / width) | 0;
          const nx = nextIndex - ny * width;
          if (isWithinRadius(width, height, nx, ny, minDist, landMask)) continue;

          picked = nextIndex;
          break;
        }

        if (picked < 0) {
          frontier[fromPos] = frontier[frontier.length - 1] ?? fromIndex;
          frontier.pop();
          continue;
        }

        pushEdit(picked, "coast");
        frontier.push(picked);
        added += 1;
      }
    }

    const wantsMicrocontinent =
      microcontinentChance > 0 && rng(1000, "microcontinent:roll") / 1000 < microcontinentChance;
    let microSeedIndex = -1;
    let microCandidates = 0;

    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const i = y * width + x;
        if (landMask[i] === 1) continue;
        if (used[i] === 1) continue;
        if (isWithinRadius(width, height, x, y, minDist, landMask)) continue;

        const noise = perlin.noise2D(x * noiseScale, y * noiseScale);
        const noiseValue = Math.max(0, Math.min(1, (noise + 1) / 2));
        const closenessNorm = boundaryCloseness[i] / 255;
        const bType = boundaryType[i] | 0;
        const nearActive =
          bType === BOUNDARY_CONVERGENT || bType === BOUNDARY_TRANSFORM || closenessNorm >= 0.4;
        const baseDen = nearActive ? baseDenActive : baseDenElse;
        const hotspotSignal = (volcanism[i] ?? 0) / 255;

        if (wantsMicrocontinent && !nearActive && noiseValue >= threshold) {
          microCandidates += 1;
          if (rng(microCandidates, "microcontinent:pick") === 0) {
            microSeedIndex = i;
          }
        }

        const allowSeed = shouldSeedIsland({
          noiseValue,
          threshold,
          baseDenom: baseDen,
          hotspotSignal,
          hotspotDenom,
          rng,
        });
        if (!allowSeed) continue;

        const kind = selectIslandKind({
          hotspotSignal,
          rng,
        });

        const targetTiles = resolveClusterCount(islandsCfg, rng);
        growPatch({
          seedIndex: i,
          seedKind: kind,
          targetTiles,
          label: kind === "peak" ? "island:peak" : "island:coast",
        });
      }
    }

    if (wantsMicrocontinent && microSeedIndex >= 0 && microCandidates > 0) {
      const clusterMax = Math.max(1, islandsCfg.clusterMax | 0);
      const targetTiles = Math.max(20, Math.min(450, Math.round(clusterMax * clusterMax * 0.75)));
      growPatch({
        seedIndex: microSeedIndex,
        seedKind: "peak",
        targetTiles,
        label: "microcontinent",
      });
    }

    return { edits };
  },
});
