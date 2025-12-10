/**
 * Volcano Placement — Plate-Aware Wrapper
 *
 * Purpose:
 * - Replace the base game's continent-edge heuristic with a WorldModel-driven
 *   placement strategy that favors convergent arcs while still allowing inland
 *   hotspot-style volcanoes when configured.
 * - Exposes tunables through the `volcanoes` config block so presets can adjust
 *   density, spacing, and boundary weighting without touching this layer.
 *
 * Fallback:
 * - If the WorldModel is disabled or required fields are unavailable, the layer
 *   gracefully degrades (no placement rather than crash).
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter, FeatureData } from "@civ7/adapter";
import type { VolcanoesConfig as BootstrapVolcanoesConfig } from "../bootstrap/types.js";
import { writeHeightfield } from "../core/types.js";
import { BOUNDARY_TYPE } from "../world/constants.js";

// ============================================================================
// Types
// ============================================================================

// Re-export canonical type
export type VolcanoesConfig = BootstrapVolcanoesConfig;

/** Volcano candidate */
interface VolcanoCandidate {
  x: number;
  y: number;
  weight: number;
  closeness: number;
  boundaryType: number;
}

/** Placed volcano position */
interface PlacedVolcano {
  x: number;
  y: number;
}

// ============================================================================
// Constants
// ============================================================================

const MOUNTAIN_TERRAIN = 5;
const VOLCANO_FEATURE = 1; // Standard volcano feature type

// ============================================================================
// Helper Functions
// ============================================================================

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

function clamp(value: number, min: number, max: number): number {
  if (typeof max === "number" && max >= min) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }
  return Math.max(value, min);
}

function isTooCloseToExisting(
  x: number,
  y: number,
  placed: PlacedVolcano[],
  minSpacing: number
): boolean {
  for (const p of placed) {
    const dx = Math.abs(x - p.x);
    const dy = Math.abs(y - p.y);
    const dist = Math.max(dx, dy); // Chebyshev distance
    if (dist < minSpacing) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Plate-aware volcano placement.
 *
 * @param ctx - Map context
 * @param options - Volcano placement options
 */
export function layerAddVolcanoesPlateAware(
  ctx: ExtendedMapContext,
  options: Partial<VolcanoesConfig> = {}
): void {
  const {
    enabled = true,
    baseDensity = 1 / 170,
    minSpacing = 3,
    boundaryThreshold = 0.35,
    boundaryWeight = 1.2,
    convergentMultiplier = 2.4,
    transformMultiplier = 1.1,
    divergentMultiplier = 0.35,
    hotspotWeight = 0.12,
    shieldPenalty = 0.6,
    randomJitter = 0.08,
    minVolcanoes = 5,
    maxVolcanoes = 40,
  } = options;

  const dimensions = ctx?.dimensions;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;
  const adapter = ctx?.adapter;

  if (!width || !height || !adapter) {
    return;
  }

  if (!enabled) {
    return;
  }

  // Require foundation context for plate data
  const foundation = ctx?.foundation;
  if (!foundation) {
    // Foundation unavailable - skip placement
    return;
  }

  const { plates } = foundation;
  const boundaryCloseness = plates.boundaryCloseness;
  const boundaryType = plates.boundaryType;
  const shieldStability = plates.shieldStability;

  if (!boundaryCloseness || !boundaryType) {
    return;
  }

  // Count land tiles for density target
  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!adapter.isWater(x, y)) landTiles++;
    }
  }

  const rawDesired = Math.round(landTiles * Math.max(0, baseDensity));
  const targetVolcanoes = clamp(
    Math.max(minVolcanoes | 0, rawDesired),
    minVolcanoes | 0,
    maxVolcanoes > 0 ? maxVolcanoes | 0 : rawDesired
  );

  if (targetVolcanoes <= 0) {
    return;
  }

  const candidates: VolcanoCandidate[] = [];
  const hotspotBase = Math.max(0, hotspotWeight);
  const threshold = Math.max(0, Math.min(1, boundaryThreshold));
  const shieldWeight = Math.max(0, Math.min(1, shieldPenalty));
  const jitter = Math.max(0, randomJitter);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      if (adapter.getFeatureType(x, y) === VOLCANO_FEATURE) continue;

      const i = idx(x, y, width);
      const closeness = boundaryCloseness[i] / 255;
      const shield = shieldStability ? shieldStability[i] / 255 : 0;
      const bType = boundaryType[i] | 0;

      let weight = 0;
      let boundaryBand = 0;

      if (closeness >= threshold) {
        boundaryBand = (closeness - threshold) / Math.max(1e-3, 1 - threshold);
        const base = boundaryBand * Math.max(0, boundaryWeight);
        let multiplier = 1;
        if (bType === BOUNDARY_TYPE.convergent) multiplier = Math.max(0, convergentMultiplier);
        else if (bType === BOUNDARY_TYPE.transform) multiplier = Math.max(0, transformMultiplier);
        else if (bType === BOUNDARY_TYPE.divergent) multiplier = Math.max(0, divergentMultiplier);
        weight += base * multiplier;
      } else {
        // Interior hotspot chance
        const interiorBand = 1 - closeness;
        weight += hotspotBase * interiorBand;
      }

      if (weight <= 0) continue;

      if (shieldWeight > 0) {
        const penalty = shield * shieldWeight;
        weight *= Math.max(0, 1 - penalty);
      }

      if (jitter > 0) {
        const randomScale = adapter.getRandomNumber(1000, "VolcanoJitter") / 1000;
        weight += randomScale * jitter;
      }

      if (weight > 0) {
        candidates.push({ x, y, weight, closeness, boundaryType: bType });
      }
    }
  }

  if (candidates.length === 0) {
    return;
  }

  candidates.sort((a, b) => b.weight - a.weight);

  const placed: PlacedVolcano[] = [];
  const minSpacingClamped = Math.max(1, minSpacing | 0);

  for (const candidate of candidates) {
    if (placed.length >= targetVolcanoes) break;
    if (adapter.getFeatureType(candidate.x, candidate.y) === VOLCANO_FEATURE) continue;
    if (isTooCloseToExisting(candidate.x, candidate.y, placed, minSpacingClamped)) continue;

    // Set terrain to mountain
    writeHeightfield(ctx, candidate.x, candidate.y, {
      terrain: MOUNTAIN_TERRAIN,
      isLand: true,
    });

    // Set volcano feature
    const featureData: FeatureData = {
      Feature: VOLCANO_FEATURE,
      Direction: -1,
      Elevation: 0,
    };
    adapter.setFeatureType(candidate.x, candidate.y, featureData);

    placed.push({ x: candidate.x, y: candidate.y });
  }
}

export default layerAddVolcanoesPlateAware;
