// @ts-nocheck
/**
 * Mountains Layer — Physics-Based Mountain and Rift Placement (Phase 2)
 *
 * Purpose:
 * - Replace random fractal mountain placement with plate-boundary-driven orogenesis
 * - Place mountain chains along convergent boundaries (collision zones)
 * - Create rift valleys and lowlands along divergent boundaries (spreading zones)
 * - Use WorldModel.upliftPotential and boundaryTree for accurate placement
 *
 * Architecture:
 * - Reads WorldModel plate boundary data (Phase 1.5 output)
 * - Uses MapContext + Adapter pattern (Phase 1 foundation)
 * - Blends WorldModel-driven placement with optional fractal noise for variety
 * - Backward compatible: Falls back to base game fractals if WorldModel disabled
 *
 * Usage:
 *   import { layerAddMountainsPhysics } from "./layers/mountains.js";
 *   layerAddMountainsPhysics(ctx, {
 *     mountainPercent: 8,        // % of land to be mountainous
 *     upliftWeight: 0.75,        // 0..1, how much WorldModel drives placement
 *     fractalWeight: 0.25,       // 0..1, how much random fractal adds variety
 *     riftDepth: 0.5,            // 0..1, how much to lower divergent boundaries
 *   });
 */

import { WorldModel } from "../world/model.js";
import { ctxRandom, idx, inBounds } from "../core/types.js";
import { devLogIf } from "../bootstrap/dev.js";
import * as globals from "/base-standard/maps/map-globals.js";

const ENUM_BOUNDARY = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});

/**
 * Add mountains using WorldModel plate boundaries
 *
 * @param {import('../core/types.js').MapContext} ctx - Map context
 * @param {Object} options - Mountain generation options
 * @param {number} [options.mountainPercent=8] - Target % of land as mountains
 * @param {number} [options.hillPercent=18] - Target % of land as hills
 * @param {number} [options.upliftWeight=0.75] - Weight for WorldModel uplift (0..1)
 * @param {number} [options.fractalWeight=0.25] - Weight for fractal noise (0..1)
 * @param {number} [options.riftDepth=0.3] - Depression strength at rifts (0..1)
 * @param {number} [options.variance=2.0] - Random variance in percentages
 */
export function layerAddMountainsPhysics(ctx, options = {}) {
    const {
        mountainPercent = 8,
        hillPercent = 18,
        upliftWeight = 0.75,
        fractalWeight = 0.25,
        riftDepth = 0.3,
        variance = 2.0,
    } = options;

    const { width, height, adapter } = ctx;
    const worldModelEnabled = WorldModel.isEnabled();

    devLogIf &&
        devLogIf("LOG_MOUNTAINS", "[Mountains] Starting physics-based placement", {
            worldModelEnabled,
            upliftWeight,
            fractalWeight,
        });

    // Create fractals for base noise and variety
    const g_MountainFractal = 0;
    const g_HillFractal = 1;
    const grainAmount = 5;
    const iFlags = 0;

    FractalBuilder.create(g_MountainFractal, width, height, grainAmount, iFlags);
    FractalBuilder.create(g_HillFractal, width, height, grainAmount, iFlags);

    // Calculate target tile counts
    let landTiles = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!adapter.isWater(x, y)) {
                landTiles++;
            }
        }
    }

    // Apply variance
    const mountainVariance = (ctxRandom(ctx, "MtnVariance", 200) - 100) / 100 * variance;
    const hillVariance = (ctxRandom(ctx, "HillVariance", 200) - 100) / 100 * variance;

    const targetMountains = Math.max(
        1,
        Math.round(landTiles * (mountainPercent + mountainVariance) / 100)
    );
    const targetHills = Math.max(
        1,
        Math.round(landTiles * (hillPercent + hillVariance) / 100)
    );

    devLogIf &&
        devLogIf("LOG_MOUNTAINS", "[Mountains] Target counts", {
            landTiles,
            targetMountains,
            targetHills,
        });

    // Compute placement scores for each tile
    const scores = new Float32Array(width * height);
    const hillScores = new Float32Array(width * height);

    if (worldModelEnabled) {
        // Physics-based placement using WorldModel
        computePlateBasedScores(ctx, scores, hillScores, {
            upliftWeight,
            fractalWeight,
            g_MountainFractal,
            g_HillFractal,
        });
    } else {
        // Fallback: pure fractal (base game behavior)
        computeFractalOnlyScores(ctx, scores, hillScores, {
            g_MountainFractal,
            g_HillFractal,
        });
    }

    // Apply rift depressions (lower scores at divergent boundaries)
    if (worldModelEnabled && riftDepth > 0) {
        applyRiftDepressions(ctx, scores, hillScores, riftDepth);
    }

    // Select top-scoring tiles for mountains
    const mountainTiles = selectTopScoringTiles(scores, width, height, targetMountains, adapter);

    // Select top-scoring tiles for hills (excluding mountains)
    const hillTiles = selectTopScoringTiles(hillScores, width, height, targetHills, adapter, mountainTiles);

    // Place mountains
    for (const i of mountainTiles) {
        const x = i % width;
        const y = Math.floor(i / width);
        adapter.setTerrainType(x, y, globals.g_MountainTerrain);
    }

    // Place hills
    for (const i of hillTiles) {
        const x = i % width;
        const y = Math.floor(i / width);
        adapter.setTerrainType(x, y, globals.g_HillTerrain);
    }

    devLogIf &&
        devLogIf("LOG_MOUNTAINS", "[Mountains] Placement complete", {
            mountainsPlaced: mountainTiles.length,
            hillsPlaced: hillTiles.length,
        });
}

/**
 * Compute plate-based mountain scores using WorldModel boundaries
 */
function computePlateBasedScores(ctx, scores, hillScores, options) {
    const { width, height } = ctx;
    const { upliftWeight, fractalWeight, g_MountainFractal, g_HillFractal } = options;

    const upliftPotential = WorldModel.upliftPotential;
    const boundaryType = WorldModel.boundaryType;

    if (!upliftPotential || !boundaryType) {
        // Fallback if WorldModel data missing
        computeFractalOnlyScores(ctx, scores, hillScores, options);
        return;
    }

    // Normalize uplift potential to 0..1 and combine with fractal
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);

            // Get WorldModel data
            const uplift = upliftPotential[i] / 255; // 0..1
            const bType = boundaryType[i];

            // Get fractal noise (0..1)
            const fractalMtn = FractalBuilder.getHeight(g_MountainFractal, x, y) / 65535;
            const fractalHill = FractalBuilder.getHeight(g_HillFractal, x, y) / 65535;

            // Mountain score: weighted blend of uplift and fractal
            let mountainScore = uplift * upliftWeight + fractalMtn * fractalWeight;

            // Boost convergent boundaries (mountain belts)
            if (bType === ENUM_BOUNDARY.convergent) {
                mountainScore *= 1.5; // 50% boost for collision zones
            }

            scores[i] = mountainScore;

            // Hill score: similar but with broader distribution
            let hillScore = (uplift * 0.5 + 0.5) * upliftWeight + fractalHill * fractalWeight;

            // Hills favor areas near but not at boundaries
            if (bType === ENUM_BOUNDARY.convergent) {
                hillScore *= 1.2; // Modest boost for foothills
            }

            hillScores[i] = hillScore;
        }
    }
}

/**
 * Fallback: pure fractal-based scores (base game approach)
 */
function computeFractalOnlyScores(ctx, scores, hillScores, options) {
    const { width, height } = ctx;
    const { g_MountainFractal, g_HillFractal } = options;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);

            scores[i] = FractalBuilder.getHeight(g_MountainFractal, x, y) / 65535;
            hillScores[i] = FractalBuilder.getHeight(g_HillFractal, x, y) / 65535;
        }
    }
}

/**
 * Apply rift depressions (lower mountains/hills at divergent boundaries)
 */
function applyRiftDepressions(ctx, scores, hillScores, riftDepth) {
    const { width, height } = ctx;
    const riftPotential = WorldModel.riftPotential;
    const boundaryType = WorldModel.boundaryType;

    if (!riftPotential || !boundaryType) return;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);
            const rift = riftPotential[i] / 255; // 0..1
            const bType = boundaryType[i];

            // Depress scores at divergent boundaries (rift valleys)
            if (bType === ENUM_BOUNDARY.divergent) {
                const depression = rift * riftDepth;
                scores[i] = Math.max(0, scores[i] - depression);
                hillScores[i] = Math.max(0, hillScores[i] - depression * 0.5);
            }
        }
    }
}

/**
 * Select top N scoring tiles, excluding water and optionally excluding a set
 */
function selectTopScoringTiles(scores, width, height, targetCount, adapter, excludeSet = null) {
    const candidates = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;

            // Skip water
            if (adapter.isWater(x, y)) continue;

            // Skip excluded tiles
            if (excludeSet && excludeSet.has(i)) continue;

            candidates.push({ index: i, score: scores[i] });
        }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Take top N
    const selected = new Set();
    for (let k = 0; k < Math.min(targetCount, candidates.length); k++) {
        selected.add(candidates[k].index);
    }

    return selected;
}

/**
 * Backward-compatible wrapper that can be called without ctx
 * Falls back to base game fractal approach
 */
export function addMountainsCompat(width, height) {
    // Create minimal adapter if ctx not available
    const adapter = {
        isWater: (x, y) => GameplayMap.isWater(x, y),
        setTerrainType: (x, y, type) => TerrainBuilder.setTerrainType(x, y, type),
    };

    const ctx = {
        width,
        height,
        adapter,
        rng: {
            calls: 0,
            sequence: [],
        },
    };

    layerAddMountainsPhysics(ctx, {
        mountainPercent: 8,
        hillPercent: 18,
        upliftWeight: WorldModel.isEnabled() ? 0.75 : 0,
        fractalWeight: WorldModel.isEnabled() ? 0.25 : 1.0,
    });
}

export default layerAddMountainsPhysics;
