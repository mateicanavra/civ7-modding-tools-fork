import type { EngineAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "../../../core/types.js";
import { BOUNDARY_TYPE } from "../../../world/constants.js";
import { idx } from "../../../lib/grid/index.js";
import { normalizeFractal } from "../../../lib/noise/index.js";

export const MOUNTAIN_FRACTAL = 0;
export const HILL_FRACTAL = 1;

/**
 * Computes mountain scores based purely on fractal noise.
 * Used when no tectonic foundation data is available.
 */
export function computeFractalOnlyScores(
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
      const rawMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL, x, y);
      const rawHill = adapter.getFractalHeight(HILL_FRACTAL, x, y);
      scores[i] = normalizeFractal(rawMtn);
      hillScores[i] = normalizeFractal(rawHill);
    }
  }
}

/**
 * Computes mountain/hill scores using Plate Tectonics data.
 *
 * Key Improvements for Wider Ranges:
 * - Removed hardcoded 0.35 boundaryGate (now uses configurable or 0.1).
 * - Uses a smooth curve for boundary strength instead of a sharp power falloff.
 * - Blends stress and uplift more organically to create "massifs" rather than lines.
 */
export function computePlateBasedScores(
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

  // Lower gate allows mountains to start forming further from the fault line.
  // 0.1 means we only ignore the very deep interior (bottom 10% of closeness).
  const boundaryGate = 0.1;
  const falloffExponent = options.boundaryExponent; // Suggest lowering this in config to ~1.0-1.2

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);

      if (isWaterCheck(x, y)) {
        scores[i] = 0;
        hillScores[i] = 0;
        continue;
      }

      const closenessRaw = boundaryCloseness ? boundaryCloseness[i] / 255 : 0;

      // Optimization: Skip tiles deep in the plate interior
      if (closenessRaw < boundaryGate) {
        const rawHill = adapter.getFractalHeight(HILL_FRACTAL, x, y);
        const fractalHill = normalizeFractal(rawHill);
        scores[i] = 0;
        hillScores[i] = Math.max(0, fractalHill * options.fractalWeight * 0.5);
        continue;
      }

      // 1. Calculate Boundary Strength (Wider Profile)
      // Normalize closeness to 0..1 range above the gate
      const normalized = (closenessRaw - boundaryGate) / (1 - boundaryGate);

      // Use power curve for falloff, but since normalized range is wider, the slope is gentler.
      const boundaryStrength = Math.pow(normalized, falloffExponent);

      // 2. Fetch Tectonic Data
      const uplift = upliftPotential ? upliftPotential[i] / 255 : 0;
      const bType = boundaryType[i];
      const rift = riftPotential ? riftPotential[i] / 255 : 0;
      // Stress usually correlates with closeness but can be high in "shield" areas too
      const stress = tectonicStress ? tectonicStress[i] / 255 : uplift;

      // 3. Fetch Noise
      const rawMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL, x, y);
      const rawHill = adapter.getFractalHeight(HILL_FRACTAL, x, y);
      const fractalMtn = normalizeFractal(rawMtn);
      const fractalHill = normalizeFractal(rawHill);

      // 4. Determine Boundary Type Influence
      // We allow "near" convergent boundaries to count, even if this specific tile
      // isn't strictly labeled convergent (which happens at the pixel level).
      // However, we rely on the primary bType for the multiplier.
      const collision = bType === BOUNDARY_TYPE.convergent ? boundaryStrength : 0;
      const transform = bType === BOUNDARY_TYPE.transform ? boundaryStrength : 0;
      const divergence = bType === BOUNDARY_TYPE.divergent ? boundaryStrength : 0;

      // 5. Compute Mountain Score
      // Base score: Blend of Uplift (physics) and Stress (proximity)
      // We give more weight to Stress here to widen the range, as Uplift is often narrow.
      let mountainScore =
        collision * options.boundaryWeight * (0.5 * stress + 0.5 * uplift) +
        uplift * options.upliftWeight * 0.5 +
        fractalMtn * options.fractalWeight * 0.3;

      // Apply Bonuses/Penalties
      if (collision > 0) {
        // Convergence bonus creates the "spine"
        mountainScore += collision * options.convergenceBonus * (0.6 + fractalMtn * 0.4);
      }

      // Rifts and Transforms suppress mountains
      if (divergence > 0) {
        mountainScore *= Math.max(0, 1 - divergence * options.riftPenalty);
      }
      if (transform > 0) {
        mountainScore *= Math.max(0, 1 - transform * options.transformPenalty);
      }

      // Final clamp
      scores[i] = Math.max(0, mountainScore);

      // 6. Compute Hill Score (Foothills)
      // Hills should extend even further than mountains
      const hillIntensity = Math.sqrt(boundaryStrength); // Sqrt makes falloff even slower (wider)
      const foothillExtent = 0.5 + fractalHill * 0.5;

      let hillScore =
        fractalHill * options.fractalWeight * 0.8 + uplift * options.hillUpliftWeight * 0.3;

      if (collision > 0 && options.hillBoundaryWeight > 0) {
        // Hills surround the collision zone
        hillScore += hillIntensity * options.hillBoundaryWeight * foothillExtent;
        hillScore += hillIntensity * options.hillConvergentFoothill * foothillExtent;
      }

      if (divergence > 0) {
        // Rift shoulders
        hillScore += hillIntensity * rift * options.hillRiftBonus * foothillExtent * 0.5;
      }

      hillScores[i] = Math.max(0, hillScore);
    }
  }
}

export function applyRiftDepressions(
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
