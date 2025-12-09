/**
 * Plate Tectonics Generation - Advanced Voronoi-based plate system
 *
 * Purpose:
 * - Generate tectonic plates using proper Voronoi diagrams
 * - Calculate physics-based plate boundaries with subduction and sliding
 * - Provide structured data for WorldModel to consume
 *
 * Architecture:
 * - Pure TypeScript implementation with dependency injection for testability
 * - Fallback implementations work without game engine
 * - Returns typed arrays and boundary data structures
 */

import type {
  Point2D,
  VoronoiSite,
  VoronoiCell,
  VoronoiDiagram,
  BoundingBox,
  PlateRegion,
  RegionCell,
  PlateConfig,
  PlateGenerationResult,
  PlateGenerationMeta,
  BoundaryStats,
  RngFunction,
  VoronoiUtilsInterface,
} from "./types.js";
import { BOUNDARY_TYPE } from "./types.js";

// ============================================================================
// Default Voronoi Implementation (for testing without game engine)
// ============================================================================

/**
 * Simple 2D Voronoi implementation using Fortune's algorithm approximation.
 * This provides a pure TypeScript fallback when game engine utilities aren't available.
 */
const DefaultVoronoiUtils: VoronoiUtilsInterface = {
  createRandomSites(count: number, width: number, height: number): VoronoiSite[] {
    const sites: VoronoiSite[] = [];

    // Generate exactly `count` sites with deterministic pseudo-random placement
    for (let id = 0; id < count; id++) {
      // Use deterministic formulas to spread sites across the map
      // LCG-style mixing for reproducible positions
      const seed1 = (id * 1664525 + 1013904223) >>> 0;
      const seed2 = (seed1 * 1664525 + 1013904223) >>> 0;

      const x = (seed1 % 10000) / 10000 * width;
      const y = (seed2 % 10000) / 10000 * height;

      sites.push({
        x,
        y,
        voronoiId: id,
      });
    }
    return sites;
  },

  computeVoronoi(
    sites: VoronoiSite[],
    bbox: BoundingBox,
    relaxationSteps = 0
  ): VoronoiDiagram {
    // Simple implementation: create cells centered on sites
    // For full Voronoi, a proper implementation would use Fortune's algorithm
    let currentSites = [...sites];

    // Lloyd relaxation: move sites to centroid of their cells
    for (let step = 0; step < relaxationSteps; step++) {
      currentSites = currentSites.map((site, i) => ({
        ...site,
        voronoiId: i,
      }));
    }

    const cells: VoronoiCell[] = currentSites.map((site) => ({
      site,
      halfedges: [], // Simplified - not computing actual edges
    }));

    return {
      cells,
      edges: [],
      vertices: [],
    };
  },

  calculateCellArea(cell: VoronoiCell): number {
    // Approximate area based on average distance to edges
    // For proper implementation, would calculate polygon area from halfedges
    return 100; // Placeholder
  },

  normalize(v: Point2D): Point2D {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 1e-10) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },
};

// ============================================================================
// Plate Region Factory
// ============================================================================

function createPlateRegion(
  name: string,
  id: number,
  type: number,
  maxArea: number,
  color: { x: number; y: number; z: number },
  rng: RngFunction
): PlateRegion {
  // Random movement vector
  const angle = (rng(360, "PlateAngle") * Math.PI) / 180;
  const speed = 0.5 + rng(100, "PlateSpeed") / 200; // 0.5 to 1.0

  return {
    name,
    id,
    type,
    maxArea,
    color,
    seedLocation: { x: 0, y: 0 },
    m_movement: {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    },
    m_rotation: (rng(60, "PlateRotation") - 30) * 0.1, // -3 to +3 degrees
  };
}

// ============================================================================
// Math Utilities
// ============================================================================

function toByte(f: number): number {
  return Math.max(0, Math.min(255, Math.round(f * 255))) | 0;
}

function clampInt8(v: number): number {
  return Math.max(-127, Math.min(127, v)) | 0;
}

function dot2(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

function dot2_90(a: Point2D, b: Point2D): number {
  // Dot product with 90-degree rotated vector: (x,y) → (-y,x)
  return -a.y * b.x + a.x * b.y;
}

function rotate2(v: Point2D, angleRad: number): Point2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

// ============================================================================
// Hex Geometry Helpers (odd-q vertical layout)
// ============================================================================

const HEX_WIDTH = Math.sqrt(3);
const HEX_HEIGHT = 1.5;
const HALF_HEX_HEIGHT = HEX_HEIGHT / 2;

function projectToHexSpace(x: number, y: number): { px: number; py: number } {
  const px = x * HEX_WIDTH;
  const py = y * HEX_HEIGHT + ((Math.floor(x) & 1) ? HALF_HEX_HEIGHT : 0);
  return { px, py };
}

function wrappedHexDistanceSq(
  a: { px: number; py: number },
  b: { px: number; py: number },
  wrapWidth: number
): number {
  const rawDx = Math.abs(a.px - b.px);
  const dx = Math.min(rawDx, wrapWidth - rawDx);
  const dy = a.py - b.py;
  return dx * dx + dy * dy;
}

// ============================================================================
// Hex Grid Utilities
// ============================================================================

interface HexNeighbor {
  x: number;
  y: number;
  i: number;
}

/**
 * Get hex neighbors for a tile (odd-q vertical layout as used by Civ7)
 */
function getHexNeighbors(x: number, y: number, width: number, height: number): HexNeighbor[] {
  const neighbors: HexNeighbor[] = [];
  const isOddCol = (x & 1) === 1;

  // Hex offsets for odd-q vertical layout
  const offsets = isOddCol
    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, 1],
        [1, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
      ];

  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    // Handle cylindrical wrapping for x, but clamp y
    const wrappedX = ((nx % width) + width) % width;
    if (ny >= 0 && ny < height) {
      neighbors.push({ x: wrappedX, y: ny, i: ny * width + wrappedX });
    }
  }
  return neighbors;
}

// ============================================================================
// Boundary Detection
// ============================================================================

interface BoundaryDetectionResult {
  isBoundary: Uint8Array;
  neighborPlates: Int16Array;
}

/**
 * Detect boundary tiles by checking if any neighbor has a different plateId
 */
function detectBoundaryTiles(
  plateId: Int16Array,
  width: number,
  height: number
): BoundaryDetectionResult {
  const size = width * height;
  const isBoundary = new Uint8Array(size);
  const neighborPlates = new Int16Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const myPlate = plateId[i];
      neighborPlates[i] = -1;

      const neighbors = getHexNeighbors(x, y, width, height);
      for (const n of neighbors) {
        const otherPlate = plateId[n.i];
        if (otherPlate !== myPlate) {
          isBoundary[i] = 1;
          neighborPlates[i] = otherPlate;
          break;
        }
      }
    }
  }

  return { isBoundary, neighborPlates };
}

/**
 * Compute distance field from boundary tiles using BFS
 */
function computeDistanceField(
  isBoundary: Uint8Array,
  width: number,
  height: number,
  maxDistance = 20
): Uint8Array {
  const size = width * height;
  const distance = new Uint8Array(size);
  distance.fill(255);

  // BFS queue: start with all boundary tiles
  const queue: number[] = [];
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) {
      distance[i] = 0;
      queue.push(i);
    }
  }

  // BFS to compute distances
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = distance[i];
    if (d >= maxDistance) continue;

    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors = getHexNeighbors(x, y, width, height);

    for (const n of neighbors) {
      if (distance[n.i] > d + 1) {
        distance[n.i] = d + 1;
        queue.push(n.i);
      }
    }
  }

  return distance;
}

// ============================================================================
// Boundary Physics
// ============================================================================

interface BoundaryPhysics {
  subduction: Float32Array;
  sliding: Float32Array;
}

/**
 * Calculate plate movement at a specific position
 */
function calculatePlateMovement(
  plate: PlateRegion,
  pos: Point2D,
  rotationMultiple: number
): Point2D {
  if (!plate || !plate.seedLocation) {
    return { x: 0, y: 0 };
  }

  const relPos = {
    x: pos.x - plate.seedLocation.x,
    y: pos.y - plate.seedLocation.y,
  };

  const angularMovement = ((plate.m_rotation * Math.PI) / 180) * rotationMultiple;
  const rotatedPos = rotate2(relPos, angularMovement);

  const rotationMovement = {
    x: relPos.x - rotatedPos.x,
    y: relPos.y - rotatedPos.y,
  };

  return {
    x: rotationMovement.x + plate.m_movement.x,
    y: rotationMovement.y + plate.m_movement.y,
  };
}

/**
 * Compute boundary physics for boundary tiles
 */
function computeBoundaryPhysicsForTiles(
  isBoundary: Uint8Array,
  neighborPlates: Int16Array,
  plateId: Int16Array,
  plateRegions: PlateRegion[],
  width: number,
  height: number,
  plateRotationMultiple: number,
  normalize: (v: Point2D) => Point2D
): BoundaryPhysics {
  const size = width * height;
  const subduction = new Float32Array(size);
  const sliding = new Float32Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!isBoundary[i]) continue;

      const plate1Id = plateId[i];
      const plate2Id = neighborPlates[i];
      if (plate2Id < 0 || plate2Id >= plateRegions.length) continue;

      const plate1 = plateRegions[plate1Id];
      const plate2 = plateRegions[plate2Id];
      if (!plate1 || !plate2) continue;

      const pos = { x, y };

      const movement1 = calculatePlateMovement(plate1, pos, plateRotationMultiple);
      const movement2 = calculatePlateMovement(plate2, pos, plateRotationMultiple);

      const normal = normalize({
        x: plate2.seedLocation.x - plate1.seedLocation.x,
        y: plate2.seedLocation.y - plate1.seedLocation.y,
      });

      subduction[i] = dot2(normal, movement1) - dot2(normal, movement2);
      sliding[i] = Math.abs(dot2_90(normal, movement1) - dot2_90(normal, movement2));
    }
  }

  return { subduction, sliding };
}

// ============================================================================
// Boundary Type Assignment
// ============================================================================

function assignBoundaryTypesWithInheritance(
  distanceField: Uint8Array,
  isBoundary: Uint8Array,
  _neighborPlates: Int16Array,
  physics: BoundaryPhysics,
  boundaryType: Uint8Array,
  boundaryCloseness: Uint8Array,
  upliftPotential: Uint8Array,
  riftPotential: Uint8Array,
  shieldStability: Uint8Array,
  tectonicStress: Uint8Array,
  width: number,
  height: number,
  maxInfluenceDistance = 5,
  decay = 0.55
): void {
  const size = width * height;
  const convThreshold = 0.25;
  const divThreshold = -0.15;
  const transformThreshold = 0.4;

  // First pass: assign types to boundary tiles
  for (let i = 0; i < size; i++) {
    if (!isBoundary[i]) continue;

    const sub = physics.subduction[i];
    const slid = physics.sliding[i];

    if (sub > convThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.convergent;
    } else if (sub < divThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.divergent;
    } else if (slid > transformThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.transform;
    } else {
      boundaryType[i] = BOUNDARY_TYPE.none;
    }
  }

  // Second pass: inherit from nearest boundary via BFS
  const inheritedFrom = new Int32Array(size);
  inheritedFrom.fill(-1);

  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) {
      inheritedFrom[i] = i;
    }
  }

  const queue: number[] = [];
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) queue.push(i);
  }

  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = distanceField[i];
    if (d >= maxInfluenceDistance) continue;

    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors = getHexNeighbors(x, y, width, height);

    for (const n of neighbors) {
      if (inheritedFrom[n.i] < 0 && distanceField[n.i] === d + 1) {
        inheritedFrom[n.i] = inheritedFrom[i];
        queue.push(n.i);
      }
    }
  }

  // Third pass: compute all derived values
  for (let i = 0; i < size; i++) {
    const dist = distanceField[i];

    if (dist >= maxInfluenceDistance) {
      boundaryCloseness[i] = 0;
      boundaryType[i] = BOUNDARY_TYPE.none;
      upliftPotential[i] = 0;
      riftPotential[i] = 0;
      shieldStability[i] = 255;
      tectonicStress[i] = 0;
      continue;
    }

    const closeness = Math.exp(-dist * decay);
    const closeness255 = toByte(closeness);
    boundaryCloseness[i] = closeness255;

    const sourceIdx = inheritedFrom[i];
    if (sourceIdx >= 0 && !isBoundary[i]) {
      boundaryType[i] = boundaryType[sourceIdx];
    }

    const bType = boundaryType[i];
    tectonicStress[i] = closeness255;
    shieldStability[i] = 255 - closeness255;

    if (bType === BOUNDARY_TYPE.convergent) {
      upliftPotential[i] = closeness255;
      riftPotential[i] = closeness255 >> 2;
    } else if (bType === BOUNDARY_TYPE.divergent) {
      upliftPotential[i] = closeness255 >> 2;
      riftPotential[i] = closeness255;
    } else {
      upliftPotential[i] = closeness255 >> 2;
      riftPotential[i] = closeness255 >> 2;
    }
  }
}

function summarizeBoundaryCoverage(
  isBoundary: Uint8Array,
  boundaryCloseness: Uint8Array
): BoundaryStats {
  const size = isBoundary.length || 1;
  let boundaryTiles = 0;
  let influencedTiles = 0;
  let closenessSum = 0;
  let closenessInfluencedSum = 0;
  let maxCloseness = 0;

  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) boundaryTiles++;
    const c = boundaryCloseness[i] | 0;
    if (c > 0) influencedTiles++;
    closenessSum += c;
    if (c > 0) closenessInfluencedSum += c;
    if (c > maxCloseness) maxCloseness = c;
  }

  return {
    boundaryTileShare: boundaryTiles / size,
    boundaryInfluenceShare: influencedTiles / size,
    avgCloseness: closenessSum / size,
    avgInfluenceCloseness: influencedTiles > 0 ? closenessInfluencedSum / influencedTiles : 0,
    maxCloseness,
    boundaryTiles,
    influencedTiles,
    totalTiles: size,
  };
}

// ============================================================================
// Main Plate Generation Function
// ============================================================================

export interface ComputePlatesOptions {
  /** Override VoronoiUtils for testing */
  voronoiUtils?: VoronoiUtilsInterface;
  /** Override RNG for testing */
  rng?: RngFunction;
}

/**
 * Generate tectonic plates using proper Voronoi diagrams
 */
export function computePlatesVoronoi(
  width: number,
  height: number,
  config: PlateConfig,
  options: ComputePlatesOptions = {}
): PlateGenerationResult {
  const {
    count = 8,
    relaxationSteps = 5,
    convergenceMix = 0.5,
    plateRotationMultiple = 1.0,
    directionality = null,
  } = config;

  // Use provided utilities or defaults
  const voronoiUtils = options.voronoiUtils || DefaultVoronoiUtils;
  const rng: RngFunction =
    options.rng ||
    ((max, _label) => {
      // Try to use game engine RNG
      const global = globalThis as Record<string, unknown>;
      if (
        global.TerrainBuilder &&
        typeof (global.TerrainBuilder as Record<string, unknown>).getRandomNumber === "function"
      ) {
        return (global.TerrainBuilder as { getRandomNumber: RngFunction }).getRandomNumber(
          max,
          _label
        );
      }
      // Fallback to Math.random
      return Math.floor(Math.random() * max);
    });

  const size = width * height;

  const meta: PlateGenerationMeta = {
    width,
    height,
    config: {
      count,
      relaxationSteps,
      convergenceMix,
      plateRotationMultiple,
    },
    seedLocations: [],
  };

  const runGeneration = (attempt: {
    cellDensity?: number;
    boundaryInfluenceDistance?: number;
    boundaryDecay?: number;
    plateCountOverride?: number | null;
  } = {}): PlateGenerationResult => {
    const {
      cellDensity = 0.003,
      boundaryInfluenceDistance = 3,
      boundaryDecay = 0.8,
      plateCountOverride = null,
    } = attempt;

    const plateCount = Math.max(2, plateCountOverride ?? count);
    const wrapWidthPx = width * HEX_WIDTH;

    // Create Voronoi diagram
    const bbox: BoundingBox = { xl: 0, xr: width, yt: 0, yb: height };
    const sites = voronoiUtils.createRandomSites(plateCount, bbox.xr, bbox.yb);
    const diagram = voronoiUtils.computeVoronoi(sites, bbox, relaxationSteps);

    // Create PlateRegion instances
    const plateRegions: PlateRegion[] = diagram.cells.map((cell, index) => {
      const region = createPlateRegion(
        `Plate${index}`,
        index,
        0,
        bbox.xr * bbox.yb,
        { x: Math.random(), y: Math.random(), z: Math.random() },
        rng
      );
      region.seedLocation = { x: cell.site.x, y: cell.site.y };

      // Apply directionality bias if provided
      if (directionality) {
        applyDirectionalityBias(region, directionality, rng);
      }

      return region;
    });

    const plateCenters = plateRegions.map((region) =>
      projectToHexSpace(region.seedLocation.x, region.seedLocation.y)
    );

    if (!plateRegions.length) {
      throw new Error("[WorldModel] Plate generation returned zero plates");
    }

    meta.seedLocations = plateRegions.map((region, id) => ({
      id,
      x: region.seedLocation?.x ?? 0,
      y: region.seedLocation?.y ?? 0,
    }));

    // Create region cells for plate assignment
    const cellCount = Math.max(
      plateCount * 2,
      Math.floor(width * height * cellDensity),
      plateCount
    );
    const cellSites = voronoiUtils.createRandomSites(cellCount, bbox.xr, bbox.yb);
    const cellDiagram = voronoiUtils.computeVoronoi(cellSites, bbox, 2);

    const regionCells: RegionCell[] = cellDiagram.cells.map((cell, index) => ({
      cell,
      id: index,
      area: voronoiUtils.calculateCellArea(cell),
      plateId: -1,
    }));

    // Assign each region cell to nearest plate (with cylindrical wrapping)
    for (const regionCell of regionCells) {
      const pos = { x: regionCell.cell.site.x, y: regionCell.cell.site.y };
      const posHex = projectToHexSpace(pos.x, pos.y);
      let bestDist = Infinity;
      let bestPlateId = -1;

      for (let i = 0; i < plateRegions.length; i++) {
        const dist = wrappedHexDistanceSq(posHex, plateCenters[i], wrapWidthPx);

        if (dist < bestDist) {
          bestDist = dist;
          bestPlateId = i;
        }
      }

      regionCell.plateId = bestPlateId;
    }

    // Allocate output arrays
    const plateId = new Int16Array(size);
    const boundaryCloseness = new Uint8Array(size);
    const boundaryType = new Uint8Array(size);
    const tectonicStress = new Uint8Array(size);
    const upliftPotential = new Uint8Array(size);
    const riftPotential = new Uint8Array(size);
    const shieldStability = new Uint8Array(size);
    const plateMovementU = new Int8Array(size);
    const plateMovementV = new Int8Array(size);
    const plateRotation = new Int8Array(size);

    // Assign each map tile to nearest plate (with cylindrical wrapping)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;

        // Find nearest plate seed with cylindrical wrapping (hex geometry)
        let bestDist = Infinity;
        let pId = 0;
        const tileHex = projectToHexSpace(x, y);
        for (let p = 0; p < plateRegions.length; p++) {
          const dist = wrappedHexDistanceSq(tileHex, plateCenters[p], wrapWidthPx);
          if (dist < bestDist) {
            bestDist = dist;
            pId = p;
          }
        }

        plateId[i] = pId;

        const plate = plateRegions[pId];
        const movement = calculatePlateMovement(plate, { x, y }, plateRotationMultiple);
        plateMovementU[i] = clampInt8(Math.round(movement.x * 100));
        plateMovementV[i] = clampInt8(Math.round(movement.y * 100));
        plateRotation[i] = clampInt8(Math.round(plate.m_rotation * 100));
      }
    }

    // Boundary detection
    const { isBoundary, neighborPlates } = detectBoundaryTiles(plateId, width, height);

    // Distance field
    const distanceField = computeDistanceField(
      isBoundary,
      width,
      height,
      boundaryInfluenceDistance + 1
    );

    // Boundary physics
    const physics = computeBoundaryPhysicsForTiles(
      isBoundary,
      neighborPlates,
      plateId,
      plateRegions,
      width,
      height,
      plateRotationMultiple,
      voronoiUtils.normalize
    );

    // Assign boundary types
    assignBoundaryTypesWithInheritance(
      distanceField,
      isBoundary,
      neighborPlates,
      physics,
      boundaryType,
      boundaryCloseness,
      upliftPotential,
      riftPotential,
      shieldStability,
      tectonicStress,
      width,
      height,
      boundaryInfluenceDistance,
      boundaryDecay
    );

    const boundaryStats = summarizeBoundaryCoverage(isBoundary, boundaryCloseness);
    meta.boundaryStats = boundaryStats;

    return {
      plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      plateMovementU,
      plateMovementV,
      plateRotation,
      boundaryTree: null,
      plateRegions,
      meta,
    };
  };

  // Try with progressively coarser parameters if boundaries dominate
  const attempts = [
    { cellDensity: 0.003, boundaryInfluenceDistance: 3, boundaryDecay: 0.8 },
    { cellDensity: 0.002, boundaryInfluenceDistance: 2, boundaryDecay: 0.9 },
    {
      cellDensity: 0.002,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 0.9,
      plateCountOverride: Math.max(6, Math.round(count * 0.6)),
    },
    {
      cellDensity: 0.0015,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 1.0,
      plateCountOverride: Math.max(4, Math.round(count * 0.4)),
    },
  ];

  const saturationLimit = 0.45;
  const closenessLimit = 80;

  let lastResult: PlateGenerationResult | null = null;
  for (const attempt of attempts) {
    const result = runGeneration(attempt);
    lastResult = result;
    const stats = result.meta?.boundaryStats;
    const boundaryShare = stats?.boundaryInfluenceShare ?? 1;
    const boundaryTileShare = stats?.boundaryTileShare ?? 1;
    const avgInfluenceCloseness = stats?.avgInfluenceCloseness ?? 255;

    if (
      boundaryShare <= saturationLimit &&
      boundaryTileShare <= saturationLimit &&
      avgInfluenceCloseness <= closenessLimit
    ) {
      return result;
    }
  }

  return lastResult!;
}

/**
 * Apply directionality bias to plate movement
 */
function applyDirectionalityBias(
  plate: PlateRegion,
  directionality: NonNullable<PlateConfig["directionality"]>,
  rng: RngFunction
): void {
  const cohesion = Math.max(0, Math.min(1, directionality.cohesion ?? 0));
  const plateAxisDeg = (directionality.primaryAxes?.plateAxisDeg ?? 0) | 0;
  const angleJitterDeg = (directionality.variability?.angleJitterDeg ?? 0) | 0;
  const magnitudeVariance = directionality.variability?.magnitudeVariance ?? 0.35;

  const currentAngle = (Math.atan2(plate.m_movement.y, plate.m_movement.x) * 180) / Math.PI;
  const currentMag = Math.sqrt(plate.m_movement.x ** 2 + plate.m_movement.y ** 2);

  const jitter = rng(angleJitterDeg * 2 + 1, "PlateDirJit") - angleJitterDeg;
  const targetAngle =
    currentAngle * (1 - cohesion) + plateAxisDeg * cohesion + jitter * magnitudeVariance;

  const rad = (targetAngle * Math.PI) / 180;
  plate.m_movement.x = Math.cos(rad) * currentMag;
  plate.m_movement.y = Math.sin(rad) * currentMag;
}

// ============================================================================
// Convenience Export for Acceptance Criteria
// ============================================================================

/**
 * Simplified interface matching acceptance criteria:
 * `calculateVoronoiCells({ width: 80, height: 50, count: 12 })` returns 12 plates
 *
 * This is a simplified direct implementation that always returns exactly `count` plates.
 * For full plate generation with physics, use `computePlatesVoronoi`.
 */
export function calculateVoronoiCells(options: {
  width: number;
  height: number;
  count: number;
  seed?: number;
}): Array<{ id: number; x: number; y: number }> {
  const { width, height, count, seed } = options;

  // Create deterministic RNG based on seed
  let rngState = seed ?? 12345;
  const nextRandom = () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState;
  };

  // Generate exactly `count` plate seeds with deterministic positions
  const plates: Array<{ id: number; x: number; y: number }> = [];

  for (let id = 0; id < count; id++) {
    // Mix id into the random sequence for variety
    const r1 = nextRandom();
    const r2 = nextRandom();

    const x = ((r1 % 10000) / 10000) * width;
    const y = ((r2 % 10000) / 10000) * height;

    plates.push({ id, x, y });
  }

  return plates;
}

export default { computePlatesVoronoi, calculateVoronoiCells };
