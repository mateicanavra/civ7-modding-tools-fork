import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { FoundationPlateFields } from "@swooper/mapgen-core";
import { writeHeightfield } from "@swooper/mapgen-core";
import { devLogIf } from "@swooper/mapgen-core";
import type { MountainsConfig } from "@mapgen/domain/morphology/mountains/types.js";
import { createIsWaterTile, selectTilesAboveThreshold } from "@mapgen/domain/morphology/mountains/selection.js";
import { applyRiftDepressions, computePlateBasedScores, HILL_FRACTAL, MOUNTAIN_FRACTAL } from "@mapgen/domain/morphology/mountains/scoring.js";
import { MOUNTAIN_TERRAIN, HILL_TERRAIN, COAST_TERRAIN, OCEAN_TERRAIN } from "@swooper/mapgen-core";

export function layerAddMountainsPhysics(
  ctx: ExtendedMapContext,
  plates: FoundationPlateFields,
  options: Partial<MountainsConfig> = {}
): void {
  const {
    tectonicIntensity = 1.0,
    mountainThreshold = 0.58,
    hillThreshold = 0.32,
    upliftWeight = 0.35,
    fractalWeight = 0.15,
    riftDepth = 0.2,
    boundaryWeight = 1.0,
    boundaryGate = 0.1,
    boundaryExponent = 1.6,
    interiorPenaltyWeight = 0.0,
    convergenceBonus = 1.0,
    transformPenalty = 0.6,
    riftPenalty = 1.0,
    hillBoundaryWeight = 0.35,
    hillRiftBonus = 0.25,
    hillConvergentFoothill = 0.35,
    hillInteriorFalloff = 0.1,
    hillUpliftWeight = 0.2,
  } = options;

  devLogIf(ctx.trace, "LOG_MOUNTAINS", "[Mountains] Physics Config (Input):", JSON.stringify(options));
  devLogIf(
    ctx.trace,
    "LOG_MOUNTAINS",
    "[Mountains] Physics Config (Effective):",
    JSON.stringify({
      tectonicIntensity,
      mountainThreshold,
      hillThreshold,
      upliftWeight,
      fractalWeight,
      riftDepth,
      boundaryWeight,
      boundaryGate,
      boundaryExponent,
      interiorPenaltyWeight,
      convergenceBonus,
      transformPenalty,
      riftPenalty,
      hillBoundaryWeight,
      hillRiftBonus,
      hillConvergentFoothill,
      hillInteriorFalloff,
      hillUpliftWeight,
    })
  );

  const scaledConvergenceBonus = convergenceBonus * tectonicIntensity;
  const scaledBoundaryWeight = boundaryWeight * tectonicIntensity;
  const scaledUpliftWeight = upliftWeight * tectonicIntensity;
  const scaledHillBoundaryWeight = hillBoundaryWeight * tectonicIntensity;
  const scaledHillConvergentFoothill = hillConvergentFoothill * tectonicIntensity;

  const dimensions = ctx?.dimensions;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;
  const adapter = ctx?.adapter;

  if (!width || !height || !adapter) return;

  const isWater = createIsWaterTile(ctx, adapter, width, height);

  const terrainWriter = (x: number, y: number, terrain: number): void => {
    const isLand = terrain !== COAST_TERRAIN && terrain !== OCEAN_TERRAIN;
    writeHeightfield(ctx, x, y, { terrain, isLand });
  };

  const grainAmount = 5;
  const iFlags = 0;

  adapter.createFractal(MOUNTAIN_FRACTAL, width, height, grainAmount, iFlags);
  adapter.createFractal(HILL_FRACTAL, width, height, grainAmount, iFlags);

  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isWater(x, y)) {
        landTiles++;
      }
    }
  }

  const size = width * height;
  const scores = new Float32Array(size);
  const hillScores = new Float32Array(size);

  computePlateBasedScores(
    ctx,
    scores,
    hillScores,
    {
      upliftWeight: scaledUpliftWeight,
      fractalWeight,
      boundaryWeight: scaledBoundaryWeight,
      boundaryGate,
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
    plates
  );

  if (riftDepth > 0) {
    applyRiftDepressions(ctx, scores, hillScores, riftDepth, plates);
  }

  const selectionAdapter = { isWater };

  const mountainTiles = selectTilesAboveThreshold(scores, width, height, mountainThreshold, selectionAdapter);
  const hillTiles = selectTilesAboveThreshold(hillScores, width, height, hillThreshold, selectionAdapter, mountainTiles);

  for (const i of mountainTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, MOUNTAIN_TERRAIN);
  }

  for (const i of hillTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, HILL_TERRAIN);
  }

  const mtnCount = mountainTiles.size;
  const hillCount = hillTiles.size;
  const flatCount = Math.max(0, landTiles - mtnCount - hillCount);
  const total = Math.max(1, landTiles);

  if (ctx.trace.isVerbose) {
    ctx.trace.event(() => ({
      type: "mountains.distribution",
      landTiles,
      mountains: { count: mtnCount, share: Number(((mtnCount / total) * 100).toFixed(1)) },
      hills: { count: hillCount, share: Number(((hillCount / total) * 100).toFixed(1)) },
      flat: { count: flatCount, share: Number(((flatCount / total) * 100).toFixed(1)) },
    }));
  }
}
