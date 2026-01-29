import { createStep } from "@swooper/mapgen-core/authoring";
import { COAST_TERRAIN, syncHeightfield } from "@swooper/mapgen-core";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { createLabelRng, deriveStepSeed, weightedChoiceIndex } from "@swooper/mapgen-core/lib/rng";
import { getStandardRuntime } from "../../../runtime.js";
import LakesStepContract from "./lakes.contract.js";
import { HYDROLOGY_LAKEINESS_TILES_PER_LAKE_MULTIPLIER } from "@mapgen/domain/hydrology/shared/knob-multipliers.js";
import type { HydrologyLakeinessKnob } from "@mapgen/domain/hydrology/shared/knobs.js";

type OwnedLakesInput = Readonly<{
  width: number;
  height: number;
  seed: number;
  targetLakeCount: number;
  elevation: Int16Array;
  routingElevation: Float32Array;
  landMask: Uint8Array;
  waterMask: Uint8Array;
  mountainMask: Uint8Array;
}>;

type OwnedLakesResult = Readonly<{
  lakeMask: Uint8Array;
  lakeCount: number;
  lakeTileCount: number;
  meanFillDepth: number;
}>;

export function computeOwnedLakes(input: OwnedLakesInput): OwnedLakesResult {
  const width = input.width | 0;
  const height = input.height | 0;
  const size = Math.max(0, width * height);
  if (size === 0) {
    return { lakeMask: new Uint8Array(0), lakeCount: 0, lakeTileCount: 0, meanFillDepth: 0 };
  }

  if (input.elevation.length !== size) throw new Error("[Lakes] elevation buffer length mismatch.");
  if (input.routingElevation.length !== size)
    throw new Error("[Lakes] routingElevation buffer length mismatch.");
  if (input.landMask.length !== size) throw new Error("[Lakes] landMask buffer length mismatch.");
  if (input.waterMask.length !== size) throw new Error("[Lakes] waterMask buffer length mismatch.");
  if (input.mountainMask.length !== size)
    throw new Error("[Lakes] mountainMask buffer length mismatch.");

  const minFillDepthMeters = 1.0;
  const minComponentTiles = 1;
  const maxLakeTilesHardCap = 16;

  const fillDelta = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    fillDelta[i] = (input.routingElevation[i] ?? 0) - (input.elevation[i] ?? 0);
  }

  const candidate = new Uint8Array(size);
  const isAdjacentToWater = (x: number, y: number): boolean => {
    let adjacent = false;
    forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
      const ni = ny * width + nx;
      if (input.waterMask[ni] === 1) adjacent = true;
    });
    return adjacent;
  };

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x;
      if (input.landMask[i] !== 1) continue;
      if (input.waterMask[i] === 1) continue;
      if (input.mountainMask[i] === 1) continue;
      const d = fillDelta[i] ?? 0;
      if (d < minFillDepthMeters) continue;
      if (isAdjacentToWater(x, y)) continue;
      candidate[i] = 1;
    }
  }

  const componentIdByTile = new Int32Array(size);
  componentIdByTile.fill(-1);

  type Component = {
    id: number;
    tiles: number[];
    maxFillDepth: number;
    sumFillDepth: number;
  };

  const components: Component[] = [];
  const queue: number[] = [];
  let nextComponentId = 0;

  for (let i = 0; i < size; i++) {
    if (candidate[i] !== 1) continue;
    if (componentIdByTile[i] !== -1) continue;

    const componentId = nextComponentId++;
    const tiles: number[] = [];
    let maxFillDepth = 0;
    let sumFillDepth = 0;

    queue.length = 0;
    queue.push(i);
    componentIdByTile[i] = componentId;

    while (queue.length > 0) {
      const cur = queue.pop()!;
      tiles.push(cur);
      const d = fillDelta[cur] ?? 0;
      sumFillDepth += d;
      if (d > maxFillDepth) maxFillDepth = d;

      const x = cur % width;
      const y = (cur / width) | 0;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if (candidate[ni] !== 1) return;
        if (componentIdByTile[ni] !== -1) return;
        componentIdByTile[ni] = componentId;
        queue.push(ni);
      });
    }

    if (tiles.length < minComponentTiles) continue;
    components.push({ id: componentId, tiles, maxFillDepth, sumFillDepth });
  }

  const targetLakeCount = Math.max(0, input.targetLakeCount | 0);
  if (targetLakeCount === 0 || components.length === 0) {
    return { lakeMask: new Uint8Array(size), lakeCount: 0, lakeTileCount: 0, meanFillDepth: 0 };
  }

  const rng = createLabelRng(deriveStepSeed(input.seed, "mapHydrology:ownedLakes"));
  const available = [...components];
  const selected: Component[] = [];

  const pickWeight = (c: Component): number => {
    const area = Math.min(64, c.tiles.length);
    return Math.max(0, c.maxFillDepth) * area;
  };

  while (selected.length < targetLakeCount && available.length > 0) {
    const weights = available.map(pickWeight);
    const roll = rng(1_000_000, `lakes.pick.${selected.length}`);
    const idx = weightedChoiceIndex(weights, roll);
    if (idx < 0 || idx >= available.length) break;
    selected.push(available[idx]!);
    available.splice(idx, 1);
  }

  const lakeMask = new Uint8Array(size);
  let lakeTileCount = 0;
  let fillDepthSum = 0;

  const pickDeepestTile = (tiles: number[], label: string): number => {
    let best = tiles[0] ?? -1;
    let bestD = best >= 0 ? fillDelta[best] ?? 0 : -Infinity;
    for (let i = 1; i < tiles.length; i++) {
      const t = tiles[i]!;
      const d = fillDelta[t] ?? 0;
      if (d > bestD) {
        best = t;
        bestD = d;
      } else if (d === bestD && (rng(2, `${label}.tie.${t}`) | 0) === 0) {
        best = t;
      }
    }
    return best;
  };

  const growLake = (component: Component, lakeId: number): void => {
    const seedTile = pickDeepestTile(component.tiles, `lakes.seed.${lakeId}`);
    if (seedTile < 0) return;

    const depthBonus = Math.min(8, Math.floor(component.maxFillDepth / 2));
    const maxLakeTiles = Math.max(3, Math.min(maxLakeTilesHardCap, 4 + depthBonus));
    const bound = Math.min(component.tiles.length, maxLakeTiles);
    const targetTiles = Math.max(1, 1 + (rng(bound, `lakes.size.${lakeId}`) | 0));

    const chosen = new Set<number>();
    const frontier = new Set<number>();
    const pushFrontier = (t: number): void => {
      const x = t % width;
      const y = (t / width) | 0;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if (componentIdByTile[ni] !== component.id) return;
        if (chosen.has(ni)) return;
        frontier.add(ni);
      });
    };

    chosen.add(seedTile);
    pushFrontier(seedTile);

    while (chosen.size < targetTiles && frontier.size > 0) {
      let best = -1;
      let bestScore = -Infinity;
      for (const t of frontier) {
        const d = fillDelta[t] ?? 0;
        const jitter = (rng(1_000_000, `lakes.grow.${lakeId}.${t}`) | 0) / 1_000_000;
        const score = d + jitter * 1e-3;
        if (score > bestScore) {
          bestScore = score;
          best = t;
        }
      }
      if (best < 0) break;
      frontier.delete(best);
      chosen.add(best);
      pushFrontier(best);
    }

    for (const t of chosen) {
      if (lakeMask[t] === 1) continue;
      lakeMask[t] = 1;
      lakeTileCount += 1;
      fillDepthSum += fillDelta[t] ?? 0;
    }
  };

  for (let i = 0; i < selected.length; i++) {
    growLake(selected[i]!, i);
  }

  const meanFillDepth = lakeTileCount > 0 ? fillDepthSum / lakeTileCount : 0;
  return {
    lakeMask,
    lakeCount: selected.length,
    lakeTileCount,
    meanFillDepth,
  };
}

export default createStep(LakesStepContract, {
  normalize: (config, ctx) => {
    const { lakeiness = "normal" as HydrologyLakeinessKnob } = ctx.knobs as {
      lakeiness?: HydrologyLakeinessKnob;
    };
    const tilesPerLakeMultiplier =
      config.tilesPerLakeMultiplier * HYDROLOGY_LAKEINESS_TILES_PER_LAKE_MULTIPLIER[lakeiness];
    return tilesPerLakeMultiplier === config.tilesPerLakeMultiplier
      ? config
      : { ...config, tilesPerLakeMultiplier };
  },
  run: (context, config, _ops, deps) => {
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const topography = deps.artifacts.topography.read(context);
    const routing = deps.artifacts.routing.read(context);
    const routingElevation = routing.routingElevation;
    if (!routingElevation) {
      throw new Error(
        "[Lakes] Missing morphology routingElevation; owned lakes require priority-flood routing integration."
      );
    }

    const baseTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
    const targetLakeCount = Math.max(0, Math.round(baseTilesPerLake * config.tilesPerLakeMultiplier));

    const size = width * height;
    const waterMask = new Uint8Array(size);
    const mountainMask = new Uint8Array(size);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        waterMask[i] = context.adapter.isWater(x, y) ? 1 : 0;
        mountainMask[i] = context.adapter.isMountain(x, y) ? 1 : 0;
      }
    }

    const result = computeOwnedLakes({
      width,
      height,
      seed: context.env.seed,
      targetLakeCount,
      elevation: topography.elevation,
      routingElevation,
      landMask: topography.landMask,
      waterMask,
      mountainMask,
    });

    if (result.lakeTileCount > 0) {
      for (let i = 0; i < size; i++) {
        if (result.lakeMask[i] !== 1) continue;
        const x = i % width;
        const y = (i / width) | 0;
        context.adapter.setTerrainType(x, y, COAST_TERRAIN);
      }

      context.adapter.validateAndFixTerrain();
      syncHeightfield(context);
      context.adapter.recalculateAreas();
    } else {
      syncHeightfield(context);
    }

    context.trace.event(() => ({
      type: "lakes.owned",
      targetLakeCount,
      lakes: result.lakeCount,
      lakeTiles: result.lakeTileCount,
      meanFillDepthMeters: Number(result.meanFillDepth.toFixed(3)),
    }));
  },
});
