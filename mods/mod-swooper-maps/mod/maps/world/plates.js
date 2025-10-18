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
 * - /base-standard/scripts/voronoi-utils.js - Voronoi diagram generation
 * - /base-standard/scripts/voronoi-region.js - PlateRegion with movement vectors
 * - /base-standard/scripts/kd-tree.js - Spatial queries for boundaries
 *
 * Architecture:
 * - Imports base game's proven plate generation algorithms
 * - Wraps them for WorldModel integration
 * - Returns typed arrays and boundary data structures
 */

import { VoronoiUtils, RegionCell, PlateBoundary, RegionCellPosGetter, PlateBoundaryPosGetter } from '/base-standard/scripts/voronoi-utils.js';
import { PlateRegion } from '/base-standard/scripts/voronoi-region.js';
import { kdTree } from '/base-standard/scripts/kd-tree.js';

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
 * @property {kdTree} boundaryTree - kdTree of PlateBoundary objects for fast queries
 * @property {Array<PlateRegion>} plateRegions - Array of PlateRegion instances
 */

/**
 * @typedef {Object} PlateConfig
 * @property {number} count - Number of plates to generate
 * @property {number} relaxationSteps - Lloyd relaxation iterations (default 5)
 * @property {number} convergenceMix - 0..1, ratio of convergent vs divergent boundaries
 * @property {number} plateRotationMultiple - Multiplier for plate rotation influence
 * @property {Object} directionality - Optional directionality config
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
    } = config;

    const size = width * height;

    // Create Voronoi diagram using base game utilities
    const bbox = { xl: 0, xr: width, yt: 0, yb: height };
    const sites = VoronoiUtils.createRandomSites(count, bbox.xr, bbox.yb);
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

    // Create RegionCells for the map grid
    // Note: For performance, we create a coarser Voronoi grid for plate assignment
    // This matches the base game's approach in ContinentGenerator.growPlates()
    const cellCount = Math.floor(width * height * 0.01); // 1% of tiles as Voronoi cells
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

    // Compute plate boundaries at Voronoi edges
    const plateBoundaries = computePlateBoundaries(
        regionCells,
        plateRegions,
        plateRotationMultiple
    );

    // Build kdTree for boundary queries
    const boundaryTree = new kdTree(PlateBoundaryPosGetter);
    boundaryTree.build(plateBoundaries);

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

    // Assign each map tile to nearest Voronoi cell, then inherit plate properties
    const convThreshold = 0.3; // Subduction threshold for convergent
    const divThreshold = -0.2; // Divergence threshold
    const transformThreshold = 0.5; // Sliding threshold for transform

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const pos = { x, y };

            // Find nearest Voronoi cell
            const nearestCell = cellKdTree.search(pos);
            const pId = nearestCell.plateId;
            plateId[i] = pId;

            // Get plate movement at this location
            const plate = plateRegions[pId];
            const movement = calculatePlateMovement(plate, pos, plateRotationMultiple);
            plateMovementU[i] = clampInt8(Math.round(movement.x * 100));
            plateMovementV[i] = clampInt8(Math.round(movement.y * 100));
            plateRotation[i] = clampInt8(Math.round(plate.m_rotation * 100));

            // Find nearest plate boundary
            const nearestBoundary = boundaryTree.search(pos);
            const distToBoundary = Math.sqrt(VoronoiUtils.sqDistance(pos, nearestBoundary.pos));

            // Boundary closeness: inverse distance normalized
            // Use similar falloff as base game: score = 1 - d/(d + scale)
            const scaleFactor = 4.0; // Similar to RuleNearPlateBoundary default
            const closeness = 1 - distToBoundary / (distToBoundary + scaleFactor);
            boundaryCloseness[i] = toByte(closeness);

            // Boundary type based on physics
            let bType = ENUM_BOUNDARY.none;

            if (closeness > 0.3) { // Only classify near boundaries
                const subduction = nearestBoundary.plateSubduction;
                const sliding = nearestBoundary.plateSliding;

                if (subduction > convThreshold) {
                    bType = ENUM_BOUNDARY.convergent;
                } else if (subduction < divThreshold) {
                    bType = ENUM_BOUNDARY.divergent;
                } else if (sliding > transformThreshold) {
                    bType = ENUM_BOUNDARY.transform;
                }
            }

            boundaryType[i] = bType;

            // Potentials derived from boundary type and closeness
            const stress255 = boundaryCloseness[i];
            tectonicStress[i] = stress255;

            // Uplift high at convergent boundaries
            upliftPotential[i] = bType === ENUM_BOUNDARY.convergent ? stress255 : stress255 >> 2;

            // Rift high at divergent boundaries
            riftPotential[i] = bType === ENUM_BOUNDARY.divergent ? stress255 : stress255 >> 2;

            // Shield stability is inverse of stress (plate interiors are stable)
            shieldStability[i] = 255 - stress255;
        }
    }

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
        boundaryTree,
        plateRegions,
    };
}

/**
 * Compute plate boundaries at Voronoi edges
 * Adapted from base game's ContinentGenerator.growPlates() (lines 7894-7931)
 *
 * @param {Array<RegionCell>} regionCells - Voronoi cells
 * @param {Array<PlateRegion>} plateRegions - Plate regions
 * @param {number} plateRotationMultiple - Rotation influence multiplier
 * @returns {Array<PlateBoundary>} Array of plate boundaries
 */
function computePlateBoundaries(regionCells, plateRegions, plateRotationMultiple) {
    const plateBoundaries = [];

    for (const plateCell of regionCells) {
        plateCell.ruleConsideration = true; // Mark as visited

        for (const neighborId of plateCell.cell.getNeighborIds()) {
            const neighbor = regionCells[neighborId];

            // Only create boundary once per edge (check if neighbor visited)
            if (neighbor.plateId !== plateCell.plateId && !neighbor.ruleConsideration) {
                // Boundary position: midpoint between cells
                const pos = {
                    x: (plateCell.cell.site.x + neighbor.cell.site.x) * 0.5,
                    y: (plateCell.cell.site.y + neighbor.cell.site.y) * 0.5,
                };

                // Boundary normal: direction from plateCell to neighbor
                const normal = VoronoiUtils.normalize({
                    x: neighbor.cell.site.x - plateCell.cell.site.x,
                    y: neighbor.cell.site.y - plateCell.cell.site.y,
                });

                // Calculate plate movements at boundary
                const plate1 = plateRegions[plateCell.plateId];
                const plate2 = plateRegions[neighbor.plateId];

                const plate1Movement = calculatePlateMovement(plate1, pos, plateRotationMultiple);
                const plate2Movement = calculatePlateMovement(plate2, pos, plateRotationMultiple);

                // Subduction: relative movement along normal
                // Positive = plates converging (collision)
                // Negative = plates diverging (rifting)
                const subduction = dot2(normal, plate1Movement) - dot2(normal, plate2Movement);

                // Sliding: relative movement perpendicular to normal (transform)
                const sliding = Math.abs(dot2_90(normal, plate1Movement) - dot2_90(normal, plate2Movement));

                plateBoundaries.push({
                    pos,
                    normal,
                    plateSubduction: subduction,
                    plateSliding: sliding,
                    id1: plateCell.plateId,
                    id2: neighbor.plateId,
                });
            }
        }
    }

    return plateBoundaries;
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
