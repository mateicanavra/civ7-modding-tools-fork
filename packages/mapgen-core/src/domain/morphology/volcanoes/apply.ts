import type { FeatureData } from "@civ7/adapter";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { ctxRandom, writeHeightfield } from "@mapgen/core/types.js";
import { idx } from "@mapgen/lib/grid/index.js";
import { clamp } from "@mapgen/lib/math/index.js";
import { MOUNTAIN_TERRAIN, VOLCANO_FEATURE } from "@mapgen/core/terrain-constants.js";
import type { PlacedVolcano, VolcanoCandidate, VolcanoesConfig } from "@mapgen/domain/morphology/volcanoes/types.js";
import { isTooCloseToExisting } from "@mapgen/domain/morphology/volcanoes/selection.js";
import { scoreVolcanoWeight } from "@mapgen/domain/morphology/volcanoes/scoring.js";

export function layerAddVolcanoesPlateAware(
  ctx: ExtendedMapContext,
  options: Partial<VolcanoesConfig> = {}
): void {
  assertFoundationContext(ctx, "volcanoes");
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

  if (!width || !height || !adapter) return;
  if (!enabled) return;

  const { plates } = ctx.foundation;
  const boundaryCloseness = plates.boundaryCloseness;
  const boundaryType = plates.boundaryType;
  const shieldStability = plates.shieldStability;

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
  if (targetVolcanoes <= 0) return;

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

      let weight = scoreVolcanoWeight({
        closeness,
        boundaryType: bType,
        hotspotBase,
        threshold,
        boundaryWeight,
        convergentMultiplier,
        transformMultiplier,
        divergentMultiplier,
      });

      if (weight <= 0) continue;

      if (shieldWeight > 0) {
        const penalty = shield * shieldWeight;
        weight *= Math.max(0, 1 - penalty);
      }

      if (jitter > 0) {
        const randomScale = ctxRandom(ctx, "VolcanoJitter", 1000) / 1000;
        weight += randomScale * jitter;
      }

      if (weight > 0) {
        candidates.push({ x, y, weight, closeness, boundaryType: bType });
      }
    }
  }

  if (candidates.length === 0) return;

  candidates.sort((a, b) => b.weight - a.weight);

  const placed: PlacedVolcano[] = [];
  const minSpacingClamped = Math.max(1, minSpacing | 0);

  for (const candidate of candidates) {
    if (placed.length >= targetVolcanoes) break;
    if (adapter.getFeatureType(candidate.x, candidate.y) === VOLCANO_FEATURE) continue;
    if (isTooCloseToExisting(candidate.x, candidate.y, placed, minSpacingClamped)) continue;

    writeHeightfield(ctx, candidate.x, candidate.y, { terrain: MOUNTAIN_TERRAIN, isLand: true });

    const featureData: FeatureData = { Feature: VOLCANO_FEATURE, Direction: -1, Elevation: 0 };
    adapter.setFeatureType(candidate.x, candidate.y, featureData);

    placed.push({ x: candidate.x, y: candidate.y });
  }
}
