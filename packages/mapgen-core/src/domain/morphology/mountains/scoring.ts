import type { EngineAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "../../../core/types.js";
import { BOUNDARY_TYPE } from "../../../world/constants.js";
import { idx } from "../../../lib/grid/index.js";
import { normalizeFractal } from "../../../lib/noise/index.js";

export const MOUNTAIN_FRACTAL = 0;
export const HILL_FRACTAL = 1;

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

  const boundaryGate = 0.35;
  const falloffExponent = options.boundaryExponent || 2.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);

      if (isWaterCheck(x, y)) {
        scores[i] = 0;
        hillScores[i] = 0;
        continue;
      }

      const uplift = upliftPotential ? upliftPotential[i] / 255 : 0;
      const bType = boundaryType[i];
      const closenessRaw = boundaryCloseness ? boundaryCloseness[i] / 255 : 0;
      const rift = riftPotential ? riftPotential[i] / 255 : 0;
      const stress = tectonicStress ? tectonicStress[i] / 255 : uplift;

      const rawMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL, x, y);
      const rawHill = adapter.getFractalHeight(HILL_FRACTAL, x, y);
      const fractalMtn = normalizeFractal(rawMtn);
      const fractalHill = normalizeFractal(rawHill);

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

      let mountainScore =
        collision * options.boundaryWeight * (0.7 * stress + 0.3 * uplift) +
        uplift * options.upliftWeight * 0.4 +
        fractalMtn * options.fractalWeight * 0.2;

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

      const hillIntensity = Math.sqrt(boundaryStrength);
      const foothillExtent = 0.5 + fractalHill * 0.5;

      let hillScore = fractalHill * options.fractalWeight * 0.8 + uplift * options.hillUpliftWeight * 0.3;

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

