import { createOp } from "@swooper/mapgen-core/authoring";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import { BOUNDARY_TYPE } from "../../constants.js";
import { requireMesh } from "../../lib/require.js";
import type { FoundationTectonicSegments } from "../compute-tectonic-segments/contract.js";
import ComputeTectonicHistoryContract from "./contract.js";

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value))) | 0;
}

function addClampedByte(a: number, b: number): number {
  return Math.max(0, Math.min(255, (a | 0) + (b | 0))) | 0;
}

function chooseDriftNeighbor(params: {
  cellId: number;
  driftU: number;
  driftV: number;
  mesh: {
    wrapWidth: number;
    siteX: Float32Array;
    siteY: Float32Array;
    neighborsOffsets: Int32Array;
    neighbors: Int32Array;
  };
}): number {
  const { mesh } = params;
  const cellId = params.cellId | 0;
  const start = mesh.neighborsOffsets[cellId] | 0;
  const end = mesh.neighborsOffsets[cellId + 1] | 0;
  if (end <= start) return cellId;

  const ux = (params.driftU | 0) / 127;
  const uy = (params.driftV | 0) / 127;
  if (!ux && !uy) return cellId;

  const ax = mesh.siteX[cellId] ?? 0;
  const ay = mesh.siteY[cellId] ?? 0;

  let best = cellId;
  let bestDot = -Infinity;
  for (let cursor = start; cursor < end; cursor++) {
    const n = mesh.neighbors[cursor] | 0;
    const bx = mesh.siteX[n] ?? 0;
    const by = mesh.siteY[n] ?? 0;
    const dx = wrapDeltaPeriodic(bx - ax, mesh.wrapWidth);
    const dy = by - ay;
    const dot = dx * ux + dy * uy;
    if (dot > bestDot) {
      bestDot = dot;
      best = n;
    }
  }
  return best;
}

function computeMeshDistanceField(params: {
  cellCount: number;
  neighborsOffsets: Int32Array;
  neighbors: Int32Array;
  isSeed: Uint8Array;
  maxDistance: number;
}): { distance: Uint8Array; nearestSeed: Int32Array } {
  const cellCount = params.cellCount | 0;
  const distance = new Uint8Array(cellCount);
  distance.fill(255);

  const nearestSeed = new Int32Array(cellCount);
  nearestSeed.fill(-1);

  const queue = new Int32Array(cellCount);
  let head = 0;
  let tail = 0;

  for (let i = 0; i < cellCount; i++) {
    if (params.isSeed[i]) {
      distance[i] = 0;
      nearestSeed[i] = i;
      queue[tail++] = i;
    }
  }

  while (head < tail) {
    const cellId = queue[head++]!;
    const d = distance[cellId]!;
    if (d >= (params.maxDistance | 0)) continue;

    const start = params.neighborsOffsets[cellId] | 0;
    const end = params.neighborsOffsets[cellId + 1] | 0;
    for (let cursor = start; cursor < end; cursor++) {
      const n = params.neighbors[cursor] | 0;
      if (n < 0 || n >= cellCount) continue;
      const next = (d + 1) as number;
      if (distance[n]! > next) {
        distance[n] = next;
        nearestSeed[n] = nearestSeed[cellId]!;
        queue[tail++] = n;
      }
    }
  }

  return { distance, nearestSeed } as const;
}

function pickRegimeFromSeedIntensities(seed: {
  compression: number;
  extension: number;
  shear: number;
  minIntensity: number;
}): number {
  const c = seed.compression | 0;
  const e = seed.extension | 0;
  const s = seed.shear | 0;
  const max = Math.max(c, e, s);
  if (max < (seed.minIntensity | 0)) return BOUNDARY_TYPE.none;
  if (c >= e && c >= s) return BOUNDARY_TYPE.convergent;
  if (e >= c && e >= s) return BOUNDARY_TYPE.divergent;
  return BOUNDARY_TYPE.transform;
}

function buildEraFields(params: {
  mesh: {
    cellCount: number;
    wrapWidth: number;
    siteX: Float32Array;
    siteY: Float32Array;
    neighborsOffsets: Int32Array;
    neighbors: Int32Array;
  };
  segments: FoundationTectonicSegments;
  weight: number;
  driftSteps: number;
  influenceDistance: number;
  decay: number;
  regimeMinIntensity: number;
}): {
  boundaryType: Uint8Array;
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  shearStress: Uint8Array;
  volcanism: Uint8Array;
  fracture: Uint8Array;
} {
  const cellCount = params.mesh.cellCount | 0;
  const isSeed = new Uint8Array(cellCount);

  const seedCompression = new Uint8Array(cellCount);
  const seedExtension = new Uint8Array(cellCount);
  const seedShear = new Uint8Array(cellCount);
  const seedVolcanism = new Uint8Array(cellCount);
  const seedFracture = new Uint8Array(cellCount);
  const seedRegime = new Uint8Array(cellCount);

  const segmentCount = params.segments.segmentCount | 0;
  for (let s = 0; s < segmentCount; s++) {
    const driftU = params.segments.driftU[s] ?? 0;
    const driftV = params.segments.driftV[s] ?? 0;

    let a = params.segments.aCell[s] ?? 0;
    let b = params.segments.bCell[s] ?? 0;

    for (let step = 0; step < params.driftSteps; step++) {
      a = chooseDriftNeighbor({ cellId: a, driftU, driftV, mesh: params.mesh });
      b = chooseDriftNeighbor({ cellId: b, driftU, driftV, mesh: params.mesh });
    }

    const c = params.segments.compression[s] ?? 0;
    const e = params.segments.extension[s] ?? 0;
    const sh = params.segments.shear[s] ?? 0;
    const v = params.segments.volcanism[s] ?? 0;
    const f = params.segments.fracture[s] ?? 0;

    for (const cellId of [a, b]) {
      if (cellId < 0 || cellId >= cellCount) continue;
      isSeed[cellId] = 1;
      seedCompression[cellId] = Math.max(seedCompression[cellId] ?? 0, c);
      seedExtension[cellId] = Math.max(seedExtension[cellId] ?? 0, e);
      seedShear[cellId] = Math.max(seedShear[cellId] ?? 0, sh);
      seedVolcanism[cellId] = Math.max(seedVolcanism[cellId] ?? 0, v);
      seedFracture[cellId] = Math.max(seedFracture[cellId] ?? 0, f);
    }
  }

  for (let i = 0; i < cellCount; i++) {
    if (!isSeed[i]) continue;
    seedRegime[i] = pickRegimeFromSeedIntensities({
      compression: seedCompression[i] ?? 0,
      extension: seedExtension[i] ?? 0,
      shear: seedShear[i] ?? 0,
      minIntensity: params.regimeMinIntensity,
    });
  }

  const { distance, nearestSeed } = computeMeshDistanceField({
    cellCount,
    neighborsOffsets: params.mesh.neighborsOffsets,
    neighbors: params.mesh.neighbors,
    isSeed,
    maxDistance: Math.max(1, params.influenceDistance | 0),
  });

  const boundaryType = new Uint8Array(cellCount);
  const upliftPotential = new Uint8Array(cellCount);
  const riftPotential = new Uint8Array(cellCount);
  const shearStress = new Uint8Array(cellCount);
  const volcanism = new Uint8Array(cellCount);
  const fracture = new Uint8Array(cellCount);

  const maxDistance = Math.max(1, params.influenceDistance | 0);
  const weight = params.weight;
  const decay = params.decay;

  for (let i = 0; i < cellCount; i++) {
    const d = distance[i] ?? 255;
    if (d > maxDistance) continue;
    const seed = nearestSeed[i] | 0;
    if (seed < 0) continue;

    const influence = Math.exp(-d * decay) * weight;

    boundaryType[i] = seedRegime[seed] ?? BOUNDARY_TYPE.none;
    upliftPotential[i] = clampByte((seedCompression[seed] ?? 0) * influence);
    riftPotential[i] = clampByte((seedExtension[seed] ?? 0) * influence);
    shearStress[i] = clampByte((seedShear[seed] ?? 0) * influence);
    volcanism[i] = clampByte((seedVolcanism[seed] ?? 0) * influence);
    fracture[i] = clampByte((seedFracture[seed] ?? 0) * influence);
  }

  return { boundaryType, upliftPotential, riftPotential, shearStress, volcanism, fracture } as const;
}

function computeLastActiveEra(
  eras: ReadonlyArray<{
    upliftPotential: Uint8Array;
    riftPotential: Uint8Array;
    shearStress: Uint8Array;
    volcanism: Uint8Array;
    fracture: Uint8Array;
  }>,
  threshold: number
): Uint8Array {
  const cellCount = eras[0]?.upliftPotential.length ?? 0;
  const last = new Uint8Array(cellCount);
  last.fill(255);

  for (let i = 0; i < cellCount; i++) {
    let lastEra = 255;
    for (let e = eras.length - 1; e >= 0; e--) {
      const era = eras[e]!;
      const max = Math.max(
        era.upliftPotential[i] ?? 0,
        era.riftPotential[i] ?? 0,
        era.shearStress[i] ?? 0,
        era.volcanism[i] ?? 0,
        era.fracture[i] ?? 0
      );
      if (max > threshold) {
        lastEra = e;
        break;
      }
    }
    last[i] = lastEra;
  }
  return last;
}

const computeTectonicHistory = createOp(ComputeTectonicHistoryContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const mesh = requireMesh(input.mesh, "foundation/compute-tectonic-history");
        const segments = input.segments as FoundationTectonicSegments;

        const weights = config.eraWeights;
        const driftSteps = config.driftStepsByEra;
        const eraCount = Math.min(weights.length, driftSteps.length, 3);
        if (eraCount !== 3) {
          throw new Error("[Foundation] compute-tectonic-history expects exactly 3 eras.");
        }

        const eras = [];
        for (let era = 0; era < eraCount; era++) {
          eras.push(
            buildEraFields({
              mesh,
              segments,
              weight: weights[era] ?? 0,
              driftSteps: driftSteps[era] ?? 0,
              influenceDistance: config.beltInfluenceDistance,
              decay: config.beltDecay,
              regimeMinIntensity: 1,
            })
          );
        }

        const cellCount = mesh.cellCount | 0;
        const upliftTotal = new Uint8Array(cellCount);
        const fractureTotal = new Uint8Array(cellCount);
        const volcanismTotal = new Uint8Array(cellCount);
        const upliftRecentFraction = new Uint8Array(cellCount);

        for (let i = 0; i < cellCount; i++) {
          let upliftSum = 0;
          let fracSum = 0;
          let volcSum = 0;
          for (let era = 0; era < eraCount; era++) {
            const e = eras[era]!;
            upliftSum = addClampedByte(upliftSum, e.upliftPotential[i] ?? 0);
            fracSum = addClampedByte(fracSum, e.fracture[i] ?? 0);
            volcSum = addClampedByte(volcSum, e.volcanism[i] ?? 0);
          }
          upliftTotal[i] = upliftSum;
          fractureTotal[i] = fracSum;
          volcanismTotal[i] = volcSum;

          const recent = eras[eraCount - 1]!.upliftPotential[i] ?? 0;
          upliftRecentFraction[i] = upliftSum > 0 ? clampByte((recent / upliftSum) * 255) : 0;
        }

        const lastActiveEra = computeLastActiveEra(eras as any, config.activityThreshold);

        const newest = eras[eraCount - 1]!;
        const tectonics = {
          boundaryType: newest.boundaryType,
          upliftPotential: newest.upliftPotential,
          riftPotential: newest.riftPotential,
          shearStress: newest.shearStress,
          volcanism: newest.volcanism,
          fracture: newest.fracture,
          cumulativeUplift: upliftTotal,
        } as const;

        return {
          tectonicHistory: {
            eraCount,
            eras,
            upliftTotal,
            fractureTotal,
            volcanismTotal,
            upliftRecentFraction,
            lastActiveEra,
          },
          tectonics,
        } as const;
      },
    },
  },
});

export default computeTectonicHistory;

