import { COAST_TERRAIN, syncHeightfield } from "@swooper/mapgen-core";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { createStep } from "@swooper/mapgen-core/authoring";
import LakesStepContract from "./lakes.contract.js";
import {
  HYDROLOGY_LAKEINESS_EVAP_SCALE_MULTIPLIER,
  HYDROLOGY_LAKEINESS_PERMANENCE_THRESHOLD_DELTA01,
  HYDROLOGY_LAKEINESS_SEEPAGE_LOSS_MULTIPLIER,
} from "@mapgen/domain/hydrology/shared/knob-multipliers.js";
import type { HydrologyLakeinessKnob } from "@mapgen/domain/hydrology/shared/knobs.js";

type LakePhysicsConfig = Readonly<{
  minFillDepthM: number;
  evapScale: number;
  seepageLoss: number;
  seasonalityStrength01: number;
  permanenceThreshold01: number;
}>;

type LakesWaterBalanceInput = Readonly<{
  width: number;
  height: number;
  elevation: Int16Array;
  routingElevation: Float32Array;
  flowDir: Int32Array;
  landMask: Uint8Array;
  waterMask: Uint8Array;
  mountainMask: Uint8Array;
  runoff: Float32Array;
  pet: Float32Array;
  rainfallAmplitude: Uint8Array;
  config: LakePhysicsConfig;
}>;

type LakesWaterBalanceResult = Readonly<{
  floodedFraction01: Float32Array;
  permanentLakeMask: Uint8Array;
  depressionCount: number;
  permanentLakeTiles: number;
  seasonalLakeTiles: number;
}>;

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function computeReceiver(
  size: number,
  landMask: Uint8Array,
  flowDir: Int32Array
): Int32Array {
  const receiver = new Int32Array(size);
  for (let i = 0; i < size; i++) receiver[i] = -1;

  for (let i = 0; i < size; i++) {
    if (landMask[i] !== 1) continue;
    const dest = flowDir[i] ?? -1;
    if (dest < 0 || dest >= size) continue;
    if (landMask[dest] !== 1) continue;
    receiver[i] = dest;
  }

  return receiver;
}

function computeTopologicalOrder(
  size: number,
  landMask: Uint8Array,
  receiver: Int32Array
): Int32Array {
  const indegree = new Int32Array(size);
  for (let i = 0; i < size; i++) {
    if (landMask[i] !== 1) continue;
    const r = receiver[i] ?? -1;
    if (r >= 0) indegree[r] = (indegree[r] ?? 0) + 1;
  }

  const order = new Int32Array(size);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;

  for (let i = 0; i < size; i++) {
    if (landMask[i] !== 1) continue;
    if (indegree[i] === 0) queue[tail++] = i;
  }

  let n = 0;
  while (head < tail) {
    const i = queue[head++]!;
    order[n++] = i;
    const r = receiver[i] ?? -1;
    if (r < 0) continue;
    indegree[r] = (indegree[r] ?? 0) - 1;
    if (indegree[r] === 0) queue[tail++] = r;
  }

  return order.subarray(0, n) as unknown as Int32Array;
}

export function computeLakesFromWaterBalance(input: LakesWaterBalanceInput): LakesWaterBalanceResult {
  const width = input.width | 0;
  const height = input.height | 0;
  const size = Math.max(0, width * height);

  const floodedFraction01 = new Float32Array(size);
  const permanentLakeMask = new Uint8Array(size);

  if (size === 0) {
    return { floodedFraction01, permanentLakeMask, depressionCount: 0, permanentLakeTiles: 0, seasonalLakeTiles: 0 };
  }

  if (input.elevation.length !== size) throw new Error("[Lakes] elevation buffer length mismatch.");
  if (input.routingElevation.length !== size) throw new Error("[Lakes] routingElevation buffer length mismatch.");
  if (input.flowDir.length !== size) throw new Error("[Lakes] flowDir buffer length mismatch.");
  if (input.landMask.length !== size) throw new Error("[Lakes] landMask buffer length mismatch.");
  if (input.waterMask.length !== size) throw new Error("[Lakes] waterMask buffer length mismatch.");
  if (input.mountainMask.length !== size) throw new Error("[Lakes] mountainMask buffer length mismatch.");
  if (input.runoff.length !== size) throw new Error("[Lakes] runoff buffer length mismatch.");
  if (input.pet.length !== size) throw new Error("[Lakes] pet buffer length mismatch.");
  if (input.rainfallAmplitude.length !== size)
    throw new Error("[Lakes] rainfallAmplitude buffer length mismatch.");

  const minFillDepthM = Math.max(0, input.config.minFillDepthM);
  const evapScale = Math.max(0, input.config.evapScale);
  const seepageLoss = Math.max(0, input.config.seepageLoss);
  const seasonalityStrength01 = clamp01(input.config.seasonalityStrength01);
  const permanenceThreshold01 = clamp01(input.config.permanenceThreshold01);

  const isAdjacentToWater = (x: number, y: number): boolean => {
    let adjacent = false;
    forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
      const ni = ny * width + nx;
      if (input.waterMask[ni] === 1) adjacent = true;
    });
    return adjacent;
  };

  const fillDelta = new Float32Array(size);
  const candidate = new Uint8Array(size);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x;
      fillDelta[i] = (input.routingElevation[i] ?? 0) - (input.elevation[i] ?? 0);

      if (input.landMask[i] !== 1) continue;
      if (input.waterMask[i] === 1) continue;
      if (input.mountainMask[i] === 1) continue;
      if ((fillDelta[i] ?? 0) < minFillDepthM) continue;
      if (isAdjacentToWater(x, y)) continue;

      candidate[i] = 1;
    }
  }

  const depressionIdByTile = new Int32Array(size);
  depressionIdByTile.fill(-1);

  type Depression = {
    id: number;
    tiles: number[];
  };

  const depressions: Depression[] = [];
  const queue: number[] = [];
  let nextId = 0;

  for (let i = 0; i < size; i++) {
    if (candidate[i] !== 1) continue;
    if (depressionIdByTile[i] !== -1) continue;

    const id = nextId++;
    const tiles: number[] = [];
    queue.length = 0;
    queue.push(i);
    depressionIdByTile[i] = id;

    while (queue.length > 0) {
      const cur = queue.pop()!;
      tiles.push(cur);
      const x = cur % width;
      const y = (cur / width) | 0;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if (candidate[ni] !== 1) return;
        if (depressionIdByTile[ni] !== -1) return;
        depressionIdByTile[ni] = id;
        queue.push(ni);
      });
    }

    depressions.push({ id, tiles });
  }

  if (depressions.length === 0) {
    return {
      floodedFraction01,
      permanentLakeMask,
      depressionCount: 0,
      permanentLakeTiles: 0,
      seasonalLakeTiles: 0,
    };
  }

  // Assign each land tile to the first depression it drains through (if any).
  const receiver = computeReceiver(size, input.landMask, input.flowDir);
  const topo = computeTopologicalOrder(size, input.landMask, receiver);
  for (let k = topo.length - 1; k >= 0; k--) {
    const i = topo[k]!;
    if (input.landMask[i] !== 1) continue;
    if (depressionIdByTile[i] !== -1) continue;
    const r = receiver[i] ?? -1;
    if (r < 0) continue;
    depressionIdByTile[i] = depressionIdByTile[r] ?? -1;
  }

  const inflow = new Float32Array(depressions.length);
  const runoffWeight = new Float32Array(depressions.length);
  const ampWeighted = new Float32Array(depressions.length);

  for (let i = 0; i < size; i++) {
    if (input.landMask[i] !== 1) continue;
    const id = depressionIdByTile[i] ?? -1;
    if (id < 0 || id >= depressions.length) continue;

    const r = Math.max(0, input.runoff[i] ?? 0);
    inflow[id] = (inflow[id] ?? 0) + r;
    runoffWeight[id] = (runoffWeight[id] ?? 0) + r;

    const amp01 = (input.rainfallAmplitude[i] ?? 0) / 255;
    ampWeighted[id] = (ampWeighted[id] ?? 0) + amp01 * r;
  }

  const applySeason = (tilesSorted: number[], seasonInflow: number, weight: number) => {
    let cumulativeLoss = 0;
    for (let j = 0; j < tilesSorted.length; j++) {
      const t = tilesSorted[j]!;
      const loss = Math.max(0, (input.pet[t] ?? 0) * evapScale + seepageLoss);
      if (loss <= 0) continue;

      const nextLoss = cumulativeLoss + loss;
      if (nextLoss <= seasonInflow) {
        floodedFraction01[t] = (floodedFraction01[t] ?? 0) + 1 * weight;
        cumulativeLoss = nextLoss;
        continue;
      }

      const remain = seasonInflow - cumulativeLoss;
      const frac = clamp01(remain / loss);
      if (frac > 0) floodedFraction01[t] = (floodedFraction01[t] ?? 0) + frac * weight;
      break;
    }
  };

  for (const dep of depressions) {
    const baseInflow = inflow[dep.id] ?? 0;
    if (baseInflow <= 0) continue;

    const w = runoffWeight[dep.id] ?? 0;
    const amp01 = w > 0 ? clamp01((ampWeighted[dep.id] ?? 0) / w) : 0;
    const seasonalAmp = clamp01(amp01 * seasonalityStrength01);

    const wetInflow = Math.max(0, baseInflow * (1 + seasonalAmp));
    const dryInflow = Math.max(0, baseInflow * (1 - seasonalAmp));

    const tiles = dep.tiles.slice();
    tiles.sort((a, b) => {
      const ea = input.elevation[a] ?? 0;
      const eb = input.elevation[b] ?? 0;
      return ea - eb || a - b;
    });

    // Two-mode approximation: wet + dry seasons equally weighted.
    applySeason(tiles, wetInflow, 0.5);
    applySeason(tiles, dryInflow, 0.5);
  }

  let permanentLakeTiles = 0;
  let seasonalLakeTiles = 0;
  for (let i = 0; i < size; i++) {
    const f = clamp01(floodedFraction01[i] ?? 0);
    floodedFraction01[i] = f;
    if (f <= 0) continue;
    if (f >= permanenceThreshold01) {
      permanentLakeMask[i] = 1;
      permanentLakeTiles += 1;
    } else {
      seasonalLakeTiles += 1;
    }
  }

  return {
    floodedFraction01,
    permanentLakeMask,
    depressionCount: depressions.length,
    permanentLakeTiles,
    seasonalLakeTiles,
  };
}

export default createStep(LakesStepContract, {
  normalize: (config, ctx) => {
    const { lakeiness = "normal" as HydrologyLakeinessKnob } = ctx.knobs as {
      lakeiness?: HydrologyLakeinessKnob;
    };

    const seepageLoss = config.seepageLoss * HYDROLOGY_LAKEINESS_SEEPAGE_LOSS_MULTIPLIER[lakeiness];
    const evapScale = config.evapScale * HYDROLOGY_LAKEINESS_EVAP_SCALE_MULTIPLIER[lakeiness];
    const permanenceThreshold01 = clamp01(
      config.permanenceThreshold01 + HYDROLOGY_LAKEINESS_PERMANENCE_THRESHOLD_DELTA01[lakeiness]
    );

    if (
      seepageLoss === config.seepageLoss &&
      evapScale === config.evapScale &&
      permanenceThreshold01 === config.permanenceThreshold01
    ) {
      return config;
    }

    return { ...config, seepageLoss, evapScale, permanenceThreshold01 };
  },
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const topography = deps.artifacts.topography.read(context);
    const routing = deps.artifacts.routing.read(context);
    const hydrography = deps.artifacts.hydrography.read(context) as { runoff: Float32Array };
    const seasonality = deps.artifacts.climateSeasonality.read(context) as { rainfallAmplitude: Uint8Array };
    const climateIndices = deps.artifacts.climateIndices.read(context) as { pet: Float32Array };

    const routingElevation = routing.routingElevation;
    if (!routingElevation) {
      throw new Error("[Lakes] Missing morphology routingElevation; lakes require hydrologic conditioning.");
    }

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

    const result = computeLakesFromWaterBalance({
      width,
      height,
      elevation: topography.elevation,
      routingElevation,
      flowDir: routing.flowDir,
      landMask: topography.landMask,
      waterMask,
      mountainMask,
      runoff: hydrography.runoff,
      pet: climateIndices.pet,
      rainfallAmplitude: seasonality.rainfallAmplitude,
      config,
    });

    if (result.permanentLakeTiles > 0) {
      for (let i = 0; i < size; i++) {
        if (result.permanentLakeMask[i] !== 1) continue;
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
      type: "lakes.waterBalance",
      depressions: result.depressionCount,
      permanentLakeTiles: result.permanentLakeTiles,
      seasonalLakeTiles: result.seasonalLakeTiles,
      permanenceThreshold01: Number(config.permanenceThreshold01.toFixed(3)),
      seasonalityStrength01: Number(config.seasonalityStrength01.toFixed(3)),
    }));
  },
});

