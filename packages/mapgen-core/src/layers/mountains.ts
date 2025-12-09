/**
 * Mountains Layer — Physics-Based Mountain and Rift Placement
 *
 * Purpose:
 * - Replace random fractal mountain placement with plate-boundary-driven orogenesis
 * - Place mountain chains along convergent boundaries (collision zones)
 * - Create rift valleys and lowlands along divergent boundaries (spreading zones)
 * - Use WorldModel.upliftPotential and tile-precise boundary data for accurate placement
 *
 * Architecture:
 * - Reads WorldModel plate boundary data
 * - Uses ExtendedMapContext + Adapter pattern
 * - Blends WorldModel-driven placement with optional fractal noise for variety
 * - Backward compatible: Falls back to base game fractals if WorldModel disabled
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import type { MountainsConfig as BootstrapMountainsConfig } from "../bootstrap/types.js";
import { writeHeightfield } from "../core/types.js";
import { BOUNDARY_TYPE } from "../world/constants.js";

// ============================================================================
// Types
// ============================================================================

// Re-export canonical type
export type MountainsConfig = BootstrapMountainsConfig;

// ============================================================================
// Constants
// ============================================================================

const MOUNTAIN_FRACTAL = 0;
const HILL_FRACTAL = 1;
const MOUNTAIN_TERRAIN = 5;
const HILL_TERRAIN = 4;
const COAST_TERRAIN = 1;
const OCEAN_TERRAIN = 0;

// ============================================================================
// Helper Functions
// ============================================================================

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

/**
 * Normalize fractal output to 0..1, adapting to engines that emit 8, 16, or 32-bit heights.
 * - Values > 65535 are treated as 32-bit; use the top 8 bits (>>> 24)
 * - Values > 255 are treated as 16-bit; use the top 8 bits (>>> 8)
 * - Values <= 255 are treated as 8-bit
 * - Negative values are clamped to 0 to avoid wrapping artifacts
 */
function normalizeFractal(raw: number): number {
  let val = raw | 0;
  if (val < 0) val = 0;

  if (val > 65535) {
    return (val >>> 24) / 255;
  }
  if (val > 255) {
    return (val >>> 8) / 255;
  }
  return val / 255;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Add mountains using WorldModel plate boundaries.
 *
 * ARCHITECTURE: Physics-threshold based (not quota based)
 * - Mountains appear where physics score > mountainThreshold
 * - No forced quota - if tectonics don't create mountains, there are fewer mountains
 * - tectonicIntensity scales the physics parameters to control mountain prevalence
 *
 * @param ctx - Map context
 * @param options - Mountain generation options
 */
export function layerAddMountainsPhysics(
  ctx: ExtendedMapContext,
  options: Partial<MountainsConfig> = {}
): void {
  const {
    tectonicIntensity = 1.0,
    // Crust-first defaults: mountains only where collisions are strong
    mountainThreshold = 0.58,
    hillThreshold = 0.32,
    upliftWeight = 0.35,
    fractalWeight = 0.15,
    riftDepth = 0.2,
    boundaryWeight = 1.0,
    boundaryExponent = 1.6,
    interiorPenaltyWeight = 0.0, // disabled in the new formulation
    convergenceBonus = 1.0,
    transformPenalty = 0.6,
    riftPenalty = 1.0,
    hillBoundaryWeight = 0.35,
    hillRiftBonus = 0.25,
    hillConvergentFoothill = 0.35,
    hillInteriorFalloff = 0.1,
    hillUpliftWeight = 0.2,
  } = options;

  // Scale physics parameters by tectonic intensity
  const scaledConvergenceBonus = convergenceBonus * tectonicIntensity;
  const scaledBoundaryWeight = boundaryWeight * tectonicIntensity;
  const scaledUpliftWeight = upliftWeight * tectonicIntensity;
  const scaledHillBoundaryWeight = hillBoundaryWeight * tectonicIntensity;
  const scaledHillConvergentFoothill = hillConvergentFoothill * tectonicIntensity;

  const dimensions = ctx?.dimensions;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;
  const adapter = ctx?.adapter;

  if (!width || !height || !adapter) {
    return;
  }

  const isWater = createIsWaterTile(ctx, adapter, width, height);

  const terrainWriter = (x: number, y: number, terrain: number): void => {
    const isLand = terrain !== COAST_TERRAIN && terrain !== OCEAN_TERRAIN;
    writeHeightfield(ctx, x, y, { terrain, isLand });
  };

  // Use foundation context for plate data
  const foundation = ctx?.foundation;
  const foundationEnabled = !!foundation;

  // Create fractals for base noise
  const grainAmount = 5;
  const iFlags = 0;

  adapter.createFractal(MOUNTAIN_FRACTAL, width, height, grainAmount, iFlags);
  adapter.createFractal(HILL_FRACTAL, width, height, grainAmount, iFlags);

  // Count land tiles
  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isWater(x, y)) {
        landTiles++;
      }
    }
  }

  // Compute placement scores
  const size = width * height;
  const scores = new Float32Array(size);
  const hillScores = new Float32Array(size);

  if (foundationEnabled && foundation) {
    computePlateBasedScores(
      ctx,
      scores,
      hillScores,
      {
        upliftWeight: scaledUpliftWeight,
        fractalWeight,
        boundaryWeight: scaledBoundaryWeight,
        boundaryExponent,
        interiorPenaltyWeight,
        convergenceBonus: scaledConvergenceBonus,
        transformPenalty,
        riftPenalty,
        hillBoundaryWeight: scaledHillBoundaryWeight,
        hillRiftBonus,
        hillConvergentFoothill: scaledHillConvergentFoothill,
        hillInteriorFalloff,
        hillUpliftWeight,
      },
      isWater,
      adapter,
      foundation
    );
  } else {
    computeFractalOnlyScores(ctx, scores, hillScores, adapter);
  }

  // Apply rift depressions
  if (foundationEnabled && foundation && riftDepth > 0) {
    applyRiftDepressions(ctx, scores, hillScores, riftDepth, foundation);
  }

  const selectionAdapter = { isWater };

  const mountainTiles = selectTilesAboveThreshold(
    scores,
    width,
    height,
    mountainThreshold,
    selectionAdapter
  );
  const hillTiles = selectTilesAboveThreshold(
    hillScores,
    width,
    height,
    hillThreshold,
    selectionAdapter,
    mountainTiles
  );

  // Place mountains
  for (const i of mountainTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, MOUNTAIN_TERRAIN);
  }

  // Place hills
  for (const i of hillTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, HILL_TERRAIN);
  }
}

/**
 * Compute plate-based mountain scores using foundation context plate data.
 */
function computePlateBasedScores(
  ctx: ExtendedMapContext,
  scores: Float32Array,
  hillScores: Float32Array,
  options: {
    upliftWeight: number;
    fractalWeight: number;
    boundaryWeight: number;
    boundaryExponent: number;
    interiorPenaltyWeight: number;
    convergenceBonus: number;
    transformPenalty: number;
    riftPenalty: number;
    hillBoundaryWeight: number;
    hillRiftBonus: number;
    hillConvergentFoothill: number;
    hillInteriorFalloff: number;
    hillUpliftWeight: number;
  },
  isWaterCheck: (x: number, y: number) => boolean,
  adapter: EngineAdapter,
  foundation: NonNullable<ExtendedMapContext["foundation"]>
): void {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;

  const { plates } = foundation;
  const upliftPotential = plates.upliftPotential;
  const boundaryType = plates.boundaryType;
  const boundaryCloseness = plates.boundaryCloseness;
  const riftPotential = plates.riftPotential;
  const tectonicStress = plates.tectonicStress;

  if (!upliftPotential || !boundaryType) {
    computeFractalOnlyScores(ctx, scores, hillScores, adapter);
    return;
  }

  // Require proximity to boundaries before allowing uplift to form mountains.
  const boundaryGate = 0.35;
  const falloffExponent = options.boundaryExponent || 2.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);

      const uplift = upliftPotential ? upliftPotential[i] / 255 : 0;
      const bType = boundaryType[i];
      const closenessRaw = boundaryCloseness ? boundaryCloseness[i] / 255 : 0;
      const rift = riftPotential ? riftPotential[i] / 255 : 0;
      const stress = tectonicStress ? tectonicStress[i] / 255 : uplift;

      // Adaptive noise normalization supports 8, 16, or 32-bit heights
      const rawMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL, x, y);
      const rawHill = adapter.getFractalHeight(HILL_FRACTAL, x, y);
      const fractalMtn = normalizeFractal(rawMtn);
      const fractalHill = normalizeFractal(rawHill);

      // Early exit: if we're far from any boundary, mountains remain zero and hills only use light fractal.
      if (closenessRaw < boundaryGate) {
        scores[i] = 0;
        hillScores[i] = Math.max(0, fractalHill * options.fractalWeight * 0.5);
        continue;
      }

      const normalized = (closenessRaw - boundaryGate) / (1 - boundaryGate);
      const boundaryStrength = Math.pow(normalized, falloffExponent);
      const collision = bType === BOUNDARY_TYPE.convergent ? boundaryStrength : 0;
      const transform = bType === BOUNDARY_TYPE.transform ? boundaryStrength : 0;
      const divergence = bType === BOUNDARY_TYPE.divergent ? boundaryStrength : 0;

      // Base score: collision-driven uplift with a touch of upliftPotential and jitter.
      let mountainScore =
        collision * options.boundaryWeight * (0.7 * stress + 0.3 * uplift) +
        uplift * options.upliftWeight * 0.4 +
        fractalMtn * options.fractalWeight * 0.2;

      // Boundary-specific adjustments: boost convergent, suppress divergent/transform.
      if (collision > 0) {
        mountainScore += collision * options.convergenceBonus * (0.6 + fractalMtn * 0.2);
      }
      if (divergence > 0) {
        mountainScore *= Math.max(0, 1 - divergence * options.riftPenalty);
      }
      if (transform > 0) {
        mountainScore *= Math.max(0, 1 - transform * options.transformPenalty);
      }

      scores[i] = Math.max(0, mountainScore);

      // Hill scoring
      const hillIntensity = Math.sqrt(boundaryStrength);
      const foothillExtent = 0.5 + fractalHill * 0.5;

      let hillScore =
        fractalHill * options.fractalWeight * 0.8 +
        uplift * options.hillUpliftWeight * 0.3;

      if (collision > 0 && options.hillBoundaryWeight > 0) {
        hillScore += hillIntensity * options.hillBoundaryWeight * foothillExtent;
        hillScore += hillIntensity * options.hillConvergentFoothill * foothillExtent;
      }

      if (divergence > 0) {
        hillScore += hillIntensity * rift * options.hillRiftBonus * foothillExtent * 0.5;
      }

      hillScores[i] = Math.max(0, hillScore);
    }
  }
}

/**
 * Fallback: pure fractal-based scores.
 */
function computeFractalOnlyScores(
  ctx: ExtendedMapContext,
  scores: Float32Array,
  hillScores: Float32Array,
  adapter: EngineAdapter
): void {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      // Adaptive noise normalization for fallback path too
      const rawMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL, x, y);
      const rawHill = adapter.getFractalHeight(HILL_FRACTAL, x, y);
      scores[i] = normalizeFractal(rawMtn);
      hillScores[i] = normalizeFractal(rawHill);
    }
  }
}

/**
 * Apply rift depressions.
 */
function applyRiftDepressions(
  ctx: ExtendedMapContext,
  scores: Float32Array,
  hillScores: Float32Array,
  riftDepth: number,
  foundation: NonNullable<ExtendedMapContext["foundation"]>
): void {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;
  const { plates } = foundation;
  const riftPotential = plates.riftPotential;
  const boundaryType = plates.boundaryType;

  if (!riftPotential || !boundaryType) return;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const rift = riftPotential[i] / 255;
      const bType = boundaryType[i];

      if (bType === BOUNDARY_TYPE.divergent) {
        const depression = rift * riftDepth;
        scores[i] = Math.max(0, scores[i] - depression);
        hillScores[i] = Math.max(0, hillScores[i] - depression * 0.5);
      }
    }
  }
}

/**
 * Build a water check using landMask buffer or adapter.
 */
function createIsWaterTile(
  ctx: ExtendedMapContext,
  adapter: EngineAdapter,
  width: number,
  height: number
): (x: number, y: number) => boolean {
  const landMask = ctx?.buffers?.heightfield?.landMask || null;
  return (x: number, y: number): boolean => {
    if (landMask) {
      const i = y * width + x;
      if (i >= 0 && i < landMask.length) {
        return landMask[i] === 0;
      }
    }
    return adapter.isWater(x, y);
  };
}

/**
 * Select tiles where score exceeds threshold.
 */
function selectTilesAboveThreshold(
  scores: Float32Array,
  width: number,
  height: number,
  threshold: number,
  adapter: { isWater: (x: number, y: number) => boolean },
  excludeSet: Set<number> | null = null
): Set<number> {
  const selected = new Set<number>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      if (adapter.isWater(x, y)) continue;
      if (excludeSet && excludeSet.has(i)) continue;

      if (scores[i] > threshold) {
        selected.add(i);
      }
    }
  }

  return selected;
}

/**
 * Backward-compatible wrapper.
 */
export function addMountainsCompat(
  width: number,
  height: number,
  ctx?: ExtendedMapContext | null
): void {
  if (!ctx) return;
  const foundationEnabled = !!ctx.foundation;
  layerAddMountainsPhysics(ctx, {
    tectonicIntensity: 1.0,
    mountainThreshold: 0.45,
    hillThreshold: 0.25,
    upliftWeight: foundationEnabled ? 0.75 : 0,
    fractalWeight: foundationEnabled ? 0.25 : 1.0,
  });
}

export default layerAddMountainsPhysics;
