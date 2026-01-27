import { describe, expect, it } from "bun:test";

import morphologyDomain from "../../src/domain/morphology/ops.js";
import { runOpValidated } from "../support/compiler-helpers.js";

const { computeFlowRouting, computeGeomorphicCycle } = morphologyDomain.ops;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function percentileThreshold(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * fraction)));
  return sorted[idx] ?? 0;
}

function buildDeterministicTerrain(width: number, height: number): { elevation: Int16Array; landMask: Uint8Array } {
  const size = width * height;
  const elevation = new Int16Array(size);
  const landMask = new Uint8Array(size);

  const northHeight = 220;
  const coastHeight = 30;
  const ridgePeak = 140;
  const ridgeFalloff = 14;

  for (let y = 0; y < height; y++) {
    const t = height <= 1 ? 0 : y / (height - 1);
    const base = Math.round(northHeight * (1 - t) + coastHeight * t);
    const isCoastBand = y >= Math.floor(height * 0.72);

    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const ridge = Math.max(0, ridgePeak - Math.abs(x - width / 2) * ridgeFalloff);
      const asym = x < width / 2 ? 3 : 0;
      const coastFlatten = isCoastBand ? -Math.round((base - coastHeight) * 0.85) : 0;
      elevation[i] = base + Math.round(ridge * 0.25) + coastFlatten + asym;
    }
  }

  const waterRows = 2;
  for (let y = height - waterRows; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      elevation[i] = -60;
    }
  }

  for (let i = 0; i < size; i++) landMask[i] = elevation[i] > 0 ? 1 : 0;
  return { elevation, landMask };
}

describe("m11 geomorphology (stream-power erosion + sediment transport)", () => {
  it("is deterministic and correlates erosion/deposition with physics proxies (no noise)", () => {
    const width = 80;
    const height = 54;
    const size = width * height;

    const { elevation, landMask } = buildDeterministicTerrain(width, height);

    const routing = runOpValidated(
      computeFlowRouting,
      { width, height, elevation, landMask },
      { strategy: "default", config: {} }
    );
    const slopeSurface: { readonly [i: number]: number } = routing.routingElevation ?? elevation;

    const erodibilityK = new Float32Array(size);
    const sedimentDepth = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      erodibilityK[i] = landMask[i] === 1 ? 1 : 0;
      sedimentDepth[i] = landMask[i] === 1 ? 0.12 : 0;
    }

    const selection = {
      strategy: "default",
      config: {
        geomorphology: {
          fluvial: { rate: 0.22, m: 0.6, n: 1.15 },
          diffusion: { rate: 0.06 },
          deposition: { rate: 0.28 },
          eras: 3,
        },
        worldAge: "mature",
      },
    } as const;

    const first = runOpValidated(
      computeGeomorphicCycle,
      {
        width,
        height,
        elevation,
        landMask,
        flowDir: routing.flowDir,
        flowAccum: routing.flowAccum,
        erodibilityK,
        sedimentDepth,
      },
      selection
    );

    const second = runOpValidated(
      computeGeomorphicCycle,
      {
        width,
        height,
        elevation,
        landMask,
        flowDir: routing.flowDir,
        flowAccum: routing.flowAccum,
        erodibilityK,
        sedimentDepth,
      },
      selection
    );

    expect(Array.from(first.elevationDelta)).toEqual(Array.from(second.elevationDelta));
    expect(Array.from(first.sedimentDelta)).toEqual(Array.from(second.sedimentDelta));

    let maxFlow = 1;
    let maxDrop = 1;
    for (let i = 0; i < size; i++) {
      if (landMask[i] !== 1) continue;
      const flow = routing.flowAccum[i] ?? 0;
      if (flow > maxFlow) maxFlow = flow;
      const dest = routing.flowDir[i] ?? -1;
      if (dest >= 0 && dest < size) {
        const drop = (slopeSurface[i] ?? 0) - (slopeSurface[dest] ?? 0);
        if (drop > maxDrop) maxDrop = drop;
      }
    }

    const erosionByPowerTop: number[] = [];
    const erosionByPowerBottom: number[] = [];
    const depositHighFlowLowSlope: number[] = [];
    const depositHighFlowHighSlope: number[] = [];

    const flowValues: number[] = [];
    const slopeValues: number[] = [];
    for (let i = 0; i < size; i++) {
      if (landMask[i] !== 1) continue;
      flowValues.push(routing.flowAccum[i] ?? 0);
      const dest = routing.flowDir[i] ?? -1;
      const drop =
        dest >= 0 && dest < size ? Math.max(0, (slopeSurface[i] ?? 0) - (slopeSurface[dest] ?? 0)) : 0;
      slopeValues.push(drop / maxDrop);
    }

    const highFlowThreshold = percentileThreshold(flowValues, 0.8);
    const lowSlopeThreshold = percentileThreshold(slopeValues, 0.25);
    const highSlopeThreshold = percentileThreshold(slopeValues, 0.75);

    const powers: { power: number; erosion: number }[] = [];

    for (let i = 0; i < size; i++) {
      if (landMask[i] !== 1) continue;

      const aNorm = Math.max(0, Math.min(1, (routing.flowAccum[i] ?? 0) / maxFlow));
      const dest = routing.flowDir[i] ?? -1;
      const drop =
        dest >= 0 && dest < size ? Math.max(0, (slopeSurface[i] ?? 0) - (slopeSurface[dest] ?? 0)) : 0;
      const slopeNorm = Math.max(0, Math.min(1, drop / maxDrop));
      const power = Math.pow(aNorm, selection.config.geomorphology.fluvial.m) * Math.pow(slopeNorm, selection.config.geomorphology.fluvial.n);

      const delta = first.elevationDelta[i] ?? 0;
      const erosion = delta < 0 ? -delta : 0;
      powers.push({ power, erosion });

      const deposit = delta > 0 ? delta : 0;
      const flow = routing.flowAccum[i] ?? 0;
      if (flow >= highFlowThreshold && slopeNorm <= lowSlopeThreshold) depositHighFlowLowSlope.push(deposit);
      if (flow >= highFlowThreshold && slopeNorm >= highSlopeThreshold) depositHighFlowHighSlope.push(deposit);
    }

    powers.sort((a, b) => a.power - b.power);
    const cut = Math.max(1, Math.floor(powers.length * 0.2));
    for (let i = 0; i < powers.length; i++) {
      if (i < cut) erosionByPowerBottom.push(powers[i]!.erosion);
      if (i >= powers.length - cut) erosionByPowerTop.push(powers[i]!.erosion);
    }

    const bottomMean = mean(erosionByPowerBottom);
    const topMean = mean(erosionByPowerTop);
    expect(topMean).toBeGreaterThan(bottomMean * 2.0);

    const lowSlopeDeposit = mean(depositHighFlowLowSlope);
    const highSlopeDeposit = mean(depositHighFlowHighSlope);
    expect(lowSlopeDeposit).toBeGreaterThan(highSlopeDeposit * 0.75);
  });

  it("runs within a loose budget for a medium fixture size", () => {
    const width = 128;
    const height = 96;
    const size = width * height;

    const { elevation, landMask } = buildDeterministicTerrain(width, height);
    const routing = runOpValidated(
      computeFlowRouting,
      { width, height, elevation, landMask },
      { strategy: "default", config: {} }
    );

    const erodibilityK = new Float32Array(size);
    const sedimentDepth = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      erodibilityK[i] = landMask[i] === 1 ? 1 : 0;
      sedimentDepth[i] = landMask[i] === 1 ? 0.08 : 0;
    }

    const start = performance.now();
    void runOpValidated(
      computeGeomorphicCycle,
      {
        width,
        height,
        elevation,
        landMask,
        flowDir: routing.flowDir,
        flowAccum: routing.flowAccum,
        erodibilityK,
        sedimentDepth,
      },
      {
        strategy: "default",
        config: {
          geomorphology: {
            fluvial: { rate: 0.2, m: 0.55, n: 1.0 },
            diffusion: { rate: 0.05 },
            deposition: { rate: 0.22 },
            eras: 2,
          },
          worldAge: "mature",
        },
      }
    );
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(1000);
  });
});
