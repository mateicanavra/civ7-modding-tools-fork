// @ts-nocheck
/**
 * Plate Tectonics Generation - Advanced Voronoi-based plate system
 *
 * Purpose:
 * - Generate tectonic plates using proper Voronoi diagrams (not simple distance)
 * - Calculate physics-based plate boundaries with subduction and sliding
 * - Provide structured data for WorldModel to consume
 *
 * Dependencies (from base-standard module):
 * - /base-standard/scripts/kd-tree.js - VoronoiUtils + spatial queries + region/boundary helpers
 * - /base-standard/scripts/voronoi-region.js - PlateRegion with movement vectors
 *
 * Architecture:
 * - Imports base game's proven plate generation algorithms
 * - Wraps them for WorldModel integration
 * - Returns typed arrays and boundary data structures
 */

import { VoronoiUtils, RegionCell, RegionCellPosGetter, kdTree } from '/base-standard/scripts/kd-tree.js';
import { PlateRegion } from '/base-standard/scripts/voronoi-region.js';

/**
 * @typedef {Object} PlateGenerationResult
 * @property {Int16Array} plateId - Plate assignment per tile
 * @property {Uint8Array} boundaryCloseness - 0..255, higher near boundaries
 * @property {Uint8Array} boundaryType - ENUM_BOUNDARY values
 * @property {Uint8Array} tectonicStress - 0..255, tracks boundary closeness
 * @property {Uint8Array} upliftPotential - 0..255, high at convergent boundaries
 * @property {Uint8Array} riftPotential - 0..255, high at divergent boundaries
 * @property {Uint8Array} shieldStability - 0..255, inverse of stress (plate interiors)
 * @property {Int8Array} plateMovementU - -127..127, horizontal plate movement
 * @property {Int8Array} plateMovementV - -127..127, vertical plate movement
 * @property {Int8Array} plateRotation - -127..127, plate rotation value
 * @property {null} boundaryTree - Deprecated: tile-precise boundaries used instead
 * @property {Array<PlateRegion>} plateRegions - Array of PlateRegion instances
 */

/**
 * @typedef {Object} PlateConfig
 * @property {number} count - Number of plates to generate
 * @property {number} relaxationSteps - Lloyd relaxation iterations (default 5)
 * @property {number} convergenceMix - 0..1, ratio of convergent vs divergent boundaries
 * @property {number} plateRotationMultiple - Multiplier for plate rotation influence
 * @property {Object} directionality - Optional directionality config
 * @property {"engine"|"fixed"} [seedMode] - Use Civ's seed (engine) or a fixed seed value (fixed)
 * @property {number} [fixedSeed] - Seed value when seedMode is "fixed"
 * @property {number} [seedOffset] - Integer offset applied to the chosen base seed
 */

const ENUM_BOUNDARY = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});

/**
 * Generate tectonic plates using proper Voronoi diagrams
 *
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {PlateConfig} config - Plate generation configuration
 * @returns {PlateGenerationResult} Complete plate data for WorldModel
 */
export function computePlatesVoronoi(width, height, config) {
    const {
        count = 8,
        relaxationSteps = 5,
        convergenceMix = 0.5,
        plateRotationMultiple = 1.0,
        directionality = null,
        seedMode = "engine",
        fixedSeed = undefined,
        seedOffset = 0,
    } = config;

    const size = width * height;
    const meta = {
        width,
        height,
        config: {
            count,
            relaxationSteps,
            convergenceMix,
            plateRotationMultiple,
            seedMode,
            fixedSeed,
            seedOffset,
        },
        seedLocations: [],
    };

    const runGeneration = (attempt = {}) => {
        const {
            // Density of intermediate Voronoi cells that approximate plate areas.
            // Lower density → larger cells → thicker interiors and fewer boundary seams.
            cellDensity = 0.003,
            // How far boundary influence propagates into interiors (in hex tiles).
            boundaryInfluenceDistance = 3,
            // Exponential falloff for boundary closeness; higher = faster decay.
            boundaryDecay = 0.8,
            // Optionally override plate count for retries.
            plateCountOverride = null,
        } = attempt;
        const plateCount = Math.max(2, plateCountOverride ?? count);
        // Create Voronoi diagram using base game utilities
        const bbox = { xl: 0, xr: width, yt: 0, yb: height };
        const sites = VoronoiUtils.createRandomSites(plateCount, bbox.xr, bbox.yb);
        const diagram = VoronoiUtils.computeVoronoi(sites, bbox, relaxationSteps);

        // Create PlateRegion instances with movement vectors
        const plateRegions = diagram.cells.map((cell, index) => {
            const region = new PlateRegion(
                `Plate${index}`,
                index,
                0, // type
                bbox.xr * bbox.yb, // maxArea
                { x: Math.random(), y: Math.random(), z: Math.random() } // color (not used in WorldModel)
            );
            region.seedLocation = { x: cell.site.x, y: cell.site.y };

            // Apply directionality bias if provided
            if (directionality) {
                applyDirectionalityBias(region, directionality);
            }

            return region;
        });
        if (!plateRegions.length) {
            throw new Error(
                `[WorldModel] Plate generation returned zero plates (sites=${sites.length}, cells=${diagram.cells?.length ?? 0}).`
            );
        }
        const invalidPlateIndex = plateRegions.findIndex(
            (p) => !p || !p.seedLocation || !isFinite(p.seedLocation.x) || !isFinite(p.seedLocation.y)
        );
        if (invalidPlateIndex >= 0) {
            throw new Error(
                `[WorldModel] Plate generation produced invalid plate ${invalidPlateIndex}; seed missing or NaN (cells=${diagram.cells?.length ?? 0}).`
            );
        }
        meta.seedLocations = plateRegions.map((region, id) => ({
            id,
            x: region.seedLocation?.x ?? 0,
            y: region.seedLocation?.y ?? 0,
        }));

        // Create RegionCells for the map grid
        // Note: For performance, we create a coarser Voronoi grid for plate assignment
        // This matches the base game's approach in ContinentGenerator.growPlates()
        const cellCount = Math.max(
            plateCount * 2, // keep cells per plate low to thicken interiors
            Math.floor(width * height * cellDensity),
            plateCount
        );
        const cellSites = VoronoiUtils.createRandomSites(cellCount, bbox.xr, bbox.yb);
        const cellDiagram = VoronoiUtils.computeVoronoi(cellSites, bbox, 2);

        const regionCells = cellDiagram.cells.map((cell, index) => {
            const area = VoronoiUtils.calculateCellArea(cell);
            return new RegionCell(cell, index, area);
        });

        // Build kdTree for fast spatial queries
        const cellKdTree = new kdTree(RegionCellPosGetter);
        cellKdTree.build(regionCells);

        // Assign each region cell to nearest plate
        for (const regionCell of regionCells) {
            const pos = { x: regionCell.cell.site.x, y: regionCell.cell.site.y };
            let bestDist = Infinity;
            let bestPlateId = -1;

            for (let i = 0; i < plateRegions.length; i++) {
                const dx = pos.x - plateRegions[i].seedLocation.x;
                const dy = pos.y - plateRegions[i].seedLocation.y;
                const dist = dx * dx + dy * dy;

                if (dist < bestDist) {
                    bestDist = dist;
                    bestPlateId = i;
                }
            }

            regionCell.plateId = bestPlateId;
        }
        const invalidCell = regionCells.find((c) => c.plateId < 0 || c.plateId >= plateRegions.length);
        if (invalidCell) {
            throw new Error(
                `[WorldModel] Plate assignment failed: invalid plateId ${invalidCell.plateId} for regionCell ${invalidCell.id} (plates=${plateRegions.length}, sites=${sites.length}).`
            );
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

        // Step 1: Assign each map tile to nearest Voronoi cell for plateId and movement
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const pos = { x, y };

                const nearestCellResult = cellKdTree.search(pos);
                const nearestCell = nearestCellResult?.data ?? nearestCellResult;
                if (!nearestCell) {
                    throw new Error(`[WorldModel] Nearest Voronoi cell not found at pos (${x},${y}).`);
                }
                const pId = nearestCell.plateId;
                plateId[i] = pId;

                const plate = plateRegions[pId];
                if (!plate || !plate.seedLocation) {
                    throw new Error(`[WorldModel] Missing plate data for plateId=${pId} at pos (${x},${y}).`);
                }
                const movement = calculatePlateMovement(plate, pos, plateRotationMultiple);
                plateMovementU[i] = clampInt8(Math.round(movement.x * 100));
                plateMovementV[i] = clampInt8(Math.round(movement.y * 100));
                plateRotation[i] = clampInt8(Math.round(plate.m_rotation * 100));
            }
        }

        // Step 2: Tile-precise boundary detection (replaces kdTree approach)
        // Detects boundaries by checking if any hex neighbor has a different plateId
        const { isBoundary, neighborPlates } = detectBoundaryTiles(plateId, width, height);

        // Step 3: Compute distance field from boundary tiles using BFS
        // This gives us precise tile distances instead of approximate kdTree distances
        const distanceField = computeDistanceField(
            isBoundary,
            width,
            height,
            boundaryInfluenceDistance + 1 // compute just past the influence band
        );

        // Step 4: Compute boundary physics (subduction/sliding) for boundary tiles
        const physics = computeBoundaryPhysicsForTiles(
            isBoundary, neighborPlates, plateId, plateRegions,
            width, height, plateRotationMultiple
        );

        // Step 5: Assign boundary types with inheritance for near-boundary tiles
        assignBoundaryTypesWithInheritance(
            distanceField, isBoundary, neighborPlates, physics,
            boundaryType, boundaryCloseness, upliftPotential, riftPotential,
            shieldStability, tectonicStress, width, height,
            boundaryInfluenceDistance, boundaryDecay
        );

        const boundaryStats = summarizeBoundaryCoverage(isBoundary, boundaryCloseness);
        meta.generationAttempts = meta.generationAttempts || [];
        meta.generationAttempts.push({
            params: { cellDensity, boundaryInfluenceDistance, boundaryDecay, cellCount },
            boundaryStats,
        });
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
            boundaryTree: null, // No longer using kdTree for boundaries
            plateRegions,
            meta,
        };
    };

    const attempts = [
        // Default: very coarse grid so plates span hundreds of tiles; fast decay keeps boundary belts thin.
        { cellDensity: 0.003, boundaryInfluenceDistance: 3, boundaryDecay: 0.8 },
        // Fallback: even coarser grid + shorter influence if boundaries still dominate.
        { cellDensity: 0.002, boundaryInfluenceDistance: 2, boundaryDecay: 0.9 },
        // Final fallback: reduce plate count modestly to grow interiors if saturation persists.
        { cellDensity: 0.002, boundaryInfluenceDistance: 2, boundaryDecay: 0.9, plateCountOverride: Math.max(6, Math.round(count * 0.6)) },
        // Extreme fallback: force low plate count and ultra-coarse cells to guarantee interiors.
        { cellDensity: 0.0015, boundaryInfluenceDistance: 2, boundaryDecay: 1.0, plateCountOverride: Math.max(4, Math.round(count * 0.4)) },
    ];
    const saturationLimit = 0.45; // if >45% of tiles are influenced by boundaries, reroll with coarser params
    const closenessLimit = 80;    // if average influenced closeness is too high, reroll

    let lastResult = null;
    for (const attempt of attempts) {
        const result = runGeneration(attempt);
        lastResult = result;
        const stats = result?.meta?.boundaryStats;
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

    return lastResult;
}

/**
 * Calculate plate movement at a specific position
 * Combines linear movement with rotational component
 * Based on ContinentGenerator.growPlates() lines 7908-7914
 *
 * @param {PlateRegion} plate - Plate region
 * @param {{x: number, y: number}} pos - Position to calculate movement at
 * @param {number} rotationMultiple - Rotation influence multiplier
 * @returns {{x: number, y: number}} Movement vector
 */
function calculatePlateMovement(plate, pos, rotationMultiple) {
    if (!plate || !plate.seedLocation) {
        return { x: 0, y: 0 };
    }
    // Relative position from plate center
    const relPos = {
        x: pos.x - plate.seedLocation.x,
        y: pos.y - plate.seedLocation.y,
    };

    // Rotation component: rotate relative position
    const angularMovement = plate.m_rotation * Math.PI / 180 * rotationMultiple;
    const rotatedPos = rotate2(relPos, angularMovement);

    // Rotation movement is difference between original and rotated position
    const rotationMovement = {
        x: relPos.x - rotatedPos.x,
        y: relPos.y - rotatedPos.y,
    };

    // Combine translation and rotation
    return {
        x: rotationMovement.x + plate.m_movement.x,
        y: rotationMovement.y + plate.m_movement.y,
    };
}

/**
 * Apply directionality bias to plate movement
 * Adjusts plate movement vectors to align with global directionality config
 *
 * @param {PlateRegion} plate - Plate region to modify
 * @param {Object} directionality - Directionality configuration
 */
function applyDirectionalityBias(plate, directionality) {
    const cohesion = Math.max(0, Math.min(1, directionality?.cohesion ?? 0));
    const plateAxisDeg = (directionality?.primaryAxes?.plateAxisDeg ?? 0) | 0;
    const angleJitterDeg = (directionality?.variability?.angleJitterDeg ?? 0) | 0;
    const magnitudeVariance = directionality?.variability?.magnitudeVariance ?? 0.35;

    // Current movement direction
    const currentAngle = Math.atan2(plate.m_movement.y, plate.m_movement.x) * 180 / Math.PI;
    const currentMag = Math.sqrt(plate.m_movement.x ** 2 + plate.m_movement.y ** 2);

    // Bias toward plate axis
    const jitter = (TerrainBuilder?.getRandomNumber?.(angleJitterDeg * 2 + 1, "PlateDirJit") ?? 0) - angleJitterDeg;
    const targetAngle = currentAngle * (1 - cohesion) + plateAxisDeg * cohesion + jitter * magnitudeVariance;

    // Apply biased angle
    const rad = targetAngle * Math.PI / 180;
    plate.m_movement.x = Math.cos(rad) * currentMag;
    plate.m_movement.y = Math.sin(rad) * currentMag;
}

// -------------------------------- Math Utilities --------------------------------

function toByte(f) {
    return Math.max(0, Math.min(255, Math.round(f * 255))) | 0;
}

function clampInt8(v) {
    return Math.max(-127, Math.min(127, v)) | 0;
}

function dot2(a, b) {
    return a.x * b.x + a.y * b.y;
}

function dot2_90(a, b) {
    // Dot product with 90-degree rotated vector: (x,y) → (-y,x)
    return -a.y * b.x + a.x * b.y;
}

function rotate2(v, angleRad) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
        x: v.x * cos - v.y * sin,
        y: v.x * sin + v.y * cos,
    };
}

function sub2(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

function add2(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

function summarizeBoundaryCoverage(isBoundary, boundaryCloseness) {
    const size = isBoundary?.length || 1;
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

// -------------------------------- Tile-Precise Boundary Detection --------------------------------

/**
 * Get hex neighbors for a tile (odd-q vertical layout as used by Civ7)
 * @param {number} x - Tile x coordinate
 * @param {number} y - Tile y coordinate
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @returns {Array<{x: number, y: number, i: number}>} Array of valid neighbor coordinates and indices
 */
function getHexNeighbors(x, y, width, height) {
    const neighbors = [];
    const isOddCol = (x & 1) === 1;

    // Hex offsets for odd-q vertical layout
    const offsets = isOddCol
        ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, 1]]   // Odd column
        : [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1]]; // Even column

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

/**
 * Detect boundary tiles by checking if any neighbor has a different plateId
 * @param {Int16Array} plateId - Plate assignment per tile
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @returns {{isBoundary: Uint8Array, neighborPlates: Int16Array}} Boundary detection results
 */
function detectBoundaryTiles(plateId, width, height) {
    const size = width * height;
    const isBoundary = new Uint8Array(size); // 1 if boundary, 0 otherwise
    const neighborPlates = new Int16Array(size); // Store the OTHER plate id for boundary tiles

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const myPlate = plateId[i];
            neighborPlates[i] = -1; // Default: no neighboring plate

            const neighbors = getHexNeighbors(x, y, width, height);
            for (const n of neighbors) {
                const otherPlate = plateId[n.i];
                if (otherPlate !== myPlate) {
                    isBoundary[i] = 1;
                    neighborPlates[i] = otherPlate; // Store first different neighbor plate
                    break;
                }
            }
        }
    }

    return { isBoundary, neighborPlates };
}

/**
 * Compute distance field from boundary tiles using BFS
 * @param {Uint8Array} isBoundary - Boundary mask
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {number} maxDistance - Maximum distance to compute (default 20)
 * @returns {Uint8Array} Distance to nearest boundary (0 for boundary tiles)
 */
function computeDistanceField(isBoundary, width, height, maxDistance = 20) {
    const size = width * height;
    const distance = new Uint8Array(size);
    distance.fill(255); // Initialize with max

    // BFS queue: start with all boundary tiles
    const queue = [];
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

/**
 * Compute boundary physics (subduction/sliding) for boundary tiles
 * @param {Uint8Array} isBoundary - Boundary mask
 * @param {Int16Array} neighborPlates - Neighboring plate IDs for boundary tiles
 * @param {Int16Array} plateId - Plate assignment per tile
 * @param {Array<PlateRegion>} plateRegions - Plate regions with movement data
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {number} plateRotationMultiple - Rotation influence multiplier
 * @returns {{subduction: Float32Array, sliding: Float32Array}} Physics values for each tile
 */
function computeBoundaryPhysicsForTiles(isBoundary, neighborPlates, plateId, plateRegions, width, height, plateRotationMultiple) {
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

            // Calculate movement vectors at this position
            const movement1 = calculatePlateMovement(plate1, pos, plateRotationMultiple);
            const movement2 = calculatePlateMovement(plate2, pos, plateRotationMultiple);

            // Normal: direction from plate1 toward plate2 center
            const normal = VoronoiUtils.normalize({
                x: plate2.seedLocation.x - plate1.seedLocation.x,
                y: plate2.seedLocation.y - plate1.seedLocation.y,
            });

            // Subduction: relative movement along normal (positive = converging)
            subduction[i] = dot2(normal, movement1) - dot2(normal, movement2);

            // Sliding: relative movement perpendicular to normal
            sliding[i] = Math.abs(dot2_90(normal, movement1) - dot2_90(normal, movement2));
        }
    }

    return { subduction, sliding };
}

/**
 * Assign boundary types based on physics, with inheritance for near-boundary tiles
 * @param {Uint8Array} distanceField - Distance to nearest boundary
 * @param {Uint8Array} isBoundary - Boundary mask
 * @param {Int16Array} neighborPlates - Neighboring plate IDs
 * @param {{subduction: Float32Array, sliding: Float32Array}} physics - Physics values
 * @param {Uint8Array} boundaryType - Output: boundary type per tile
 * @param {Uint8Array} boundaryCloseness - Output: closeness to boundary (255 at boundary)
 * @param {Uint8Array} upliftPotential - Output: uplift potential
 * @param {Uint8Array} riftPotential - Output: rift potential
 * @param {Uint8Array} shieldStability - Output: shield stability
 * @param {Uint8Array} tectonicStress - Output: tectonic stress
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {number} maxInfluenceDistance - Maximum distance for boundary influence (default 8)
 * @param {number} decay - Exponential decay applied to boundary influence
 */
function assignBoundaryTypesWithInheritance(
    distanceField, isBoundary, neighborPlates, physics,
    boundaryType, boundaryCloseness, upliftPotential, riftPotential, shieldStability, tectonicStress,
    width, height, maxInfluenceDistance = 5, decay = 0.55
) {
    const size = width * height;
    const convThreshold = 0.25;  // Slightly more permissive for convergent
    const divThreshold = -0.15;  // Slightly more permissive for divergent
    const transformThreshold = 0.4;

    // First pass: assign types to boundary tiles
    for (let i = 0; i < size; i++) {
        if (!isBoundary[i]) continue;

        const sub = physics.subduction[i];
        const slid = physics.sliding[i];

        if (sub > convThreshold) {
            boundaryType[i] = ENUM_BOUNDARY.convergent;
        } else if (sub < divThreshold) {
            boundaryType[i] = ENUM_BOUNDARY.divergent;
        } else if (slid > transformThreshold) {
            boundaryType[i] = ENUM_BOUNDARY.transform;
        } else {
            boundaryType[i] = ENUM_BOUNDARY.none;
        }
    }

    // Second pass: non-boundary tiles inherit from nearest boundary via BFS traversal
    // We need to track which boundary tile each interior tile inherits from
    const inheritedFrom = new Int32Array(size);
    inheritedFrom.fill(-1);

    // Mark boundary tiles as inheriting from themselves
    for (let i = 0; i < size; i++) {
        if (isBoundary[i]) {
            inheritedFrom[i] = i;
        }
    }

    // BFS to propagate boundary type inheritance
    const queue = [];
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

        // Compute closeness: 255 at boundary, falls off with distance
        // Use exponential falloff for sharp boundary influence
        if (dist >= maxInfluenceDistance) {
            boundaryCloseness[i] = 0;
            boundaryType[i] = ENUM_BOUNDARY.none;
            upliftPotential[i] = 0;
            riftPotential[i] = 0;
            shieldStability[i] = 255;
            tectonicStress[i] = 0;
            continue;
        }

        const closeness = Math.exp(-dist * decay);
        const closeness255 = toByte(closeness);
        boundaryCloseness[i] = closeness255;

        // Inherit boundary type from nearest boundary tile
        const sourceIdx = inheritedFrom[i];
        if (sourceIdx >= 0 && !isBoundary[i]) {
            boundaryType[i] = boundaryType[sourceIdx];
        }

        // Compute derived values
        const bType = boundaryType[i];
        tectonicStress[i] = closeness255;
        // Shield stability is a simple inverse of boundary closeness:
        // deep interiors → 255, boundary core → 0. Landmass selection then
        // treats shield as the primary interior signal, while boundary
        // closeness is a secondary bias; do NOT make these perfectly
        // complementary, or the combined score becomes constant.
        shieldStability[i] = 255 - closeness255;

        // Uplift/rift potential scaled by closeness and boundary type
        if (bType === ENUM_BOUNDARY.convergent) {
            upliftPotential[i] = closeness255;
            riftPotential[i] = closeness255 >> 2;
        } else if (bType === ENUM_BOUNDARY.divergent) {
            upliftPotential[i] = closeness255 >> 2;
            riftPotential[i] = closeness255;
        } else {
            upliftPotential[i] = closeness255 >> 2;
            riftPotential[i] = closeness255 >> 2;
        }
    }
}
