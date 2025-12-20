import { CrustType } from "@mapgen/lib/plates/crust.js";

export interface BaseHeightConfig {
  continentalHeight?: number;
  oceanicHeight?: number;
  edgeBlend?: number;
  noiseAmplitude?: number;
  noiseFn?: (x: number, y: number) => number;
}

function clamp01(v: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const HEX_OFFSETS_ODD: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, 1],
  [1, 1],
];

const HEX_OFFSETS_EVEN: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
];

const DEFAULT_CONTINENTAL_HEIGHT = 0.32;
const DEFAULT_OCEANIC_HEIGHT = -0.55;
const DEFAULT_EDGE_BLEND = 0.45;
const DEFAULT_NOISE_AMPLITUDE = 0.1;

/**
 * Generate a low-frequency base heightfield from crust typing.
 *
 * Continental plates get a positive baseline; oceanic plates get a negative
 * baseline. A small edge blend softens Voronoi borders, and optional noise can
 * be injected for coastal interest.
 */
export function generateBaseHeightfield(
  plateIds: Int16Array | Int8Array | Uint16Array | Uint8Array | number[],
  crustTypes: Uint8Array,
  width: number,
  height: number,
  config: BaseHeightConfig = {}
): Float32Array {
  const size = width * height;
  const baseHeights = new Float32Array(size);

  const continentalHeight = Number.isFinite(config.continentalHeight)
    ? (config.continentalHeight as number)
    : DEFAULT_CONTINENTAL_HEIGHT;
  const oceanicHeight = Number.isFinite(config.oceanicHeight)
    ? (config.oceanicHeight as number)
    : DEFAULT_OCEANIC_HEIGHT;
  const edgeBlend = clamp01(config.edgeBlend ?? DEFAULT_EDGE_BLEND, DEFAULT_EDGE_BLEND);
  const noiseAmplitude = config.noiseAmplitude ?? DEFAULT_NOISE_AMPLITUDE;
  const noiseFn = config.noiseFn;

  const getNeighborIndices = (x: number, y: number): number[] => {
    const offsets = (x & 1) === 1 ? HEX_OFFSETS_ODD : HEX_OFFSETS_EVEN;
    const indices: number[] = [];
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      const wrappedX = ((nx % width) + width) % width;
      indices.push(ny * width + wrappedX);
    }
    return indices;
  };

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x;
      const plateId = plateIds[i];
      const crust = plateId >= 0 && plateId < crustTypes.length ? crustTypes[plateId] : CrustType.OCEANIC;
      const base = crust === CrustType.CONTINENTAL ? continentalHeight : oceanicHeight;

      // Edge blend: move height toward neighbor average to soften Voronoi seams
      const neighbors = getNeighborIndices(x, y);
      let neighborSum = 0;
      let neighborCount = 0;
      for (const ni of neighbors) {
        const nPlate = plateIds[ni];
        if (nPlate < 0 || nPlate >= crustTypes.length) continue;
        neighborSum += crustTypes[nPlate] === CrustType.CONTINENTAL ? continentalHeight : oceanicHeight;
        neighborCount++;
      }

      const neighborAvg = neighborCount > 0 ? neighborSum / neighborCount : base;
      let heightVal = edgeBlend > 0 ? lerp(base, neighborAvg, edgeBlend) : base;

      if (noiseFn && noiseAmplitude !== 0) {
        const n = noiseFn(x, y);
        const centered = Number.isFinite(n) ? n - 0.5 : 0;
        heightVal += centered * 2 * noiseAmplitude;
      }

      baseHeights[i] = heightVal;
    }
  }

  return baseHeights;
}
