import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { ctxRandom } from "@mapgen/core/types.js";
import { buildPlateTopology, type PlateGraph } from "@mapgen/lib/plates/topology.js";
import { CrustType } from "@mapgen/lib/plates/crust.js";
import { generateBaseHeightfield } from "@mapgen/lib/heightfield/base.js";
import { clampInt, clampPct } from "@mapgen/lib/math/index.js";
import type {
  AreaCrustResult,
  CrustFirstResult,
  CrustSummary,
  GeometryPostConfig,
  LandmassConfig,
} from "@mapgen/domain/morphology/landmass/types.js";

const DEFAULT_CLOSENESS_LIMIT = 255;
const CLOSENESS_STEP_PER_TILE = 8;
const MIN_CLOSENESS_LIMIT = 150;
const MAX_CLOSENESS_LIMIT = 255;

export function computeClosenessLimit(postCfg: GeometryPostConfig | undefined): number {
  const expand = postCfg?.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
  const limit = DEFAULT_CLOSENESS_LIMIT + expand * CLOSENESS_STEP_PER_TILE;
  return clampInt(limit, MIN_CLOSENESS_LIMIT, MAX_CLOSENESS_LIMIT);
}

export function summarizeCrustTypes(crustTypes: Uint8Array, graph: PlateGraph): CrustSummary {
  const continentalPlateIds: number[] = [];
  const oceanicPlateIds: number[] = [];
  let continentalArea = 0;
  let oceanicArea = 0;

  for (const plate of graph) {
    const type =
      crustTypes[plate.id] === CrustType.CONTINENTAL ? CrustType.CONTINENTAL : CrustType.OCEANIC;
    if (type === CrustType.CONTINENTAL) {
      continentalPlateIds.push(plate.id);
      continentalArea += plate.area;
    } else {
      oceanicPlateIds.push(plate.id);
      oceanicArea += plate.area;
    }
  }

  return {
    continentalPlateIds,
    oceanicPlateIds,
    continentalArea,
    oceanicArea,
  };
}

export function assignCrustTypesByArea(graph: PlateGraph, targetLandTiles: number): AreaCrustResult {
  const types = new Uint8Array(graph.length).fill(CrustType.OCEANIC);
  const sorted = graph
    .filter((plate) => plate.area > 0)
    .slice()
    .sort((a, b) => b.area - a.area);

  let assignedArea = 0;
  const continentalPlateIds: number[] = [];
  const desiredContinents = Math.min(sorted.length, Math.max(2, Math.min(5, sorted.length)));

  for (const plate of sorted) {
    const needMoreLand = assignedArea < targetLandTiles;
    const needMoreContinents = continentalPlateIds.length < desiredContinents;
    if (!needMoreLand && !needMoreContinents && continentalPlateIds.length > 0) break;
    types[plate.id] = CrustType.CONTINENTAL;
    assignedArea += plate.area;
    continentalPlateIds.push(plate.id);
  }

  const summary = summarizeCrustTypes(types, graph);

  return {
    crustTypes: types,
    ...summary,
  };
}

export function tryCrustFirstLandmask(
  width: number,
  height: number,
  plateIds: Int16Array | Int8Array | Uint16Array | Uint8Array | number[],
  closeness: Uint8Array | null,
  closenessLimit: number,
  targetLandTiles: number,
  landmassCfg: LandmassConfig,
  ctx: ExtendedMapContext
): CrustFirstResult | null {
  const size = width * height;
  if (plateIds.length !== size) return null;
  if (closeness && closeness.length !== size) return null;

  let maxPlateId = -1;
  for (let i = 0; i < size; i++) {
    const id = plateIds[i];
    if (id > maxPlateId) maxPlateId = id;
  }

  const plateCount = maxPlateId + 1;
  if (plateCount <= 0) return null;

  const edgeBlend = clampPct((landmassCfg.crustEdgeBlend as number) ?? NaN, 0, 1, 0.45);
  const noiseAmplitude = clampPct((landmassCfg.crustNoiseAmplitude as number) ?? NaN, 0, 1, 0.08);
  const continentalHeight = Number.isFinite(landmassCfg.continentalHeight)
    ? (landmassCfg.continentalHeight as number)
    : 0.32;
  const oceanicHeight = Number.isFinite(landmassCfg.oceanicHeight)
    ? (landmassCfg.oceanicHeight as number)
    : -0.55;

  const mode = "area" as const;
  const graph = buildPlateTopology(plateIds, width, height, plateCount);

  const areaResult = assignCrustTypesByArea(graph, targetLandTiles);
  const rngNext = (max: number, label = "CrustRand"): number => ctxRandom(ctx, label, max);
  const rngUnit = (label: string): number => rngNext(1_000_000, label) / 1_000_000;

  const crustTypes = areaResult.crustTypes;

  const noiseFn =
    noiseAmplitude === 0
      ? undefined
      : (_x: number, _y: number) => rngUnit("CrustNoise");

  const baseHeight = generateBaseHeightfield(plateIds, crustTypes, width, height, {
    continentalHeight,
    oceanicHeight,
    edgeBlend,
    noiseAmplitude,
    noiseFn,
  });

  const seaLevel = 0;
  const landMask = new Uint8Array(size);

  let landTiles = 0;
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < size; i++) {
    const h = baseHeight[i];
    if (h < minHeight) minHeight = h;
    if (h > maxHeight) maxHeight = h;

    const passesCloseness = !closeness || closeness[i] <= closenessLimit;
    const isLand = passesCloseness && h > seaLevel;
    if (isLand) {
      landMask[i] = 1;
      landTiles++;
    }
  }

  const summary = areaResult || summarizeCrustTypes(crustTypes, graph);
  const continentalPlates = summary.continentalPlateIds.length;
  const appliedContinentalFraction =
    summary.continentalArea / Math.max(1, summary.continentalArea + summary.oceanicArea);

  return {
    mode,
    landMask,
    landTiles,
    seaLevel,
    plateCount,
    continentalPlates,
    continentalPlateIds: summary.continentalPlateIds,
    oceanicPlateIds: summary.oceanicPlateIds,
    continentalArea: summary.continentalArea,
    oceanicArea: summary.oceanicArea,
    targetLandTiles,
    baseHeightRange: { min: minHeight, max: maxHeight },
    crustConfigApplied: {
      mode,
      continentalFraction: appliedContinentalFraction,
      clusteringBias: 0,
      microcontinentChance: 0,
      edgeBlend,
      noiseAmplitude,
      continentalHeight,
      oceanicHeight,
    },
  };
}
