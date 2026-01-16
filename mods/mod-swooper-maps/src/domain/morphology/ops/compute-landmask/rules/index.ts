import type { ComputeLandmaskTypes } from "../types.js";

/**
 * Ensures landmask inputs match the expected map size.
 */
export function validateLandmaskInputs(
  input: ComputeLandmaskTypes["input"]
): { size: number; elevation: Int16Array } {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const elevation = input.elevation as Int16Array;
  if (elevation.length !== size) {
    throw new Error(`Expected elevation length ${size} (received ${elevation.length}).`);
  }
  return { size, elevation };
}

/**
 * Applies plate-aware basin separation to carve ocean buffers.
 */
export function applyBasinSeparation(
  width: number,
  height: number,
  landMask: Uint8Array,
  config: ComputeLandmaskTypes["config"]["default"]["basinSeparation"]
): void {
  if (!config.enabled) return;
  const base = Math.max(0, Math.round(config.baseSeparationTiles));
  if (base <= 0) return;

  const bandPairs = config.bandPairs ?? [];
  let maxBand = 1;
  for (const [a, b] of bandPairs) {
    maxBand = Math.max(maxBand, a, b);
  }
  const bands = Math.max(2, maxBand + 1);
  const half = Math.max(1, Math.floor(base / 2));

  const boundaries = new Set<number>();
  for (const [a, b] of bandPairs) {
    const boundary = Math.max(a | 0, b | 0);
    if (boundary > 0 && boundary < bands) boundaries.add(boundary);
  }
  if (boundaries.size === 0) {
    for (let boundary = 1; boundary < bands; boundary++) {
      boundaries.add(boundary);
    }
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  for (const band of sortedBoundaries) {
    const center = Math.round((band / bands) * width);
    const start = Math.max(0, center - half);
    const end = Math.min(width - 1, center + half);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = start; x <= end; x++) {
        landMask[row + x] = 0;
      }
    }
  }

  if (config.edgeWest.enabled) {
    const edge = Math.max(0, Math.round(config.edgeWest.baseTiles));
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < Math.min(width, edge); x++) {
        landMask[row + x] = 0;
      }
    }
  }

  if (config.edgeEast.enabled) {
    const edge = Math.max(0, Math.round(config.edgeEast.baseTiles));
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = Math.max(0, width - edge); x < width; x++) {
        landMask[row + x] = 0;
      }
    }
  }
}
