// @ts-nocheck
/**
 * Mountains Layer — Physics-Based Mountain and Rift Placement (Phase 2)
 *
 * Purpose:
 * - Replace random fractal mountain placement with plate-boundary-driven orogenesis
 * - Place mountain chains along convergent boundaries (collision zones)
 * - Create rift valleys and lowlands along divergent boundaries (spreading zones)
 * - Use WorldModel.upliftPotential and tile-precise boundary data for accurate placement
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
 *     tectonicIntensity: 1.2,    // Higher = stronger tectonic effects = more mountains
 *     mountainThreshold: 0.45,   // Score threshold for mountains (lower = more permissive)
 *     hillThreshold: 0.25,       // Score threshold for hills
 *     upliftWeight: 0.75,        // 0..1, how much WorldModel drives placement
 *     fractalWeight: 0.25,       // 0..1, how much random fractal adds variety
 *   });
 */

import { WorldModel } from "../world/model.js";
import { ctxRandom, idx, writeHeightfield } from "../core/types.js";
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
 * ARCHITECTURE: Physics-threshold based (not quota based)
 * - Mountains appear where physics score > mountainThreshold
 * - No forced quota - if tectonics don't create mountains, there are fewer mountains
 * - tectonicIntensity scales the physics parameters to control mountain prevalence
 * - This ensures mountains ONLY appear where plate tectonics justify them
 *
 * @param {import('../core/types.js').MapContext} ctx - Map context
 * @param {Object} options - Mountain generation options
 * @param {number} [options.tectonicIntensity=1.0] - Scales all tectonic effects (higher = more mountains)
 * @param {number} [options.mountainThreshold=0.45] - Score threshold for mountain placement (0..1)
 * @param {number} [options.hillThreshold=0.25] - Score threshold for hill placement (0..1)
 * @param {number} [options.upliftWeight=0.75] - Weight for WorldModel uplift (0..1)
 * @param {number} [options.fractalWeight=0.25] - Weight for fractal noise (0..1)
 * @param {number} [options.riftDepth=0.3] - Depression strength at rifts (0..1)
 * @param {number} [options.boundaryWeight=0.6] - Additional mountain weight contributed by boundary closeness
 * @param {number} [options.boundaryExponent=1.4] - Exponent applied to boundary closeness shaping belt width
 * @param {number} [options.interiorPenaltyWeight=0.2] - Penalty applied to interior tiles (push mountains toward margins)
 * @param {number} [options.convergenceBonus=0.9] - Added weight for convergent tiles (mountain belts)
 * @param {number} [options.transformPenalty=0.3] - Reduction applied to transform boundaries (flatter ridges)
 * @param {number} [options.riftPenalty=0.75] - Reduction applied to divergent tiles (discourage mountains in rifts)
 * @param {number} [options.hillBoundaryWeight=0.45] - Hill weight contributed by boundary closeness (foothills)
 * @param {number} [options.hillRiftBonus=0.5] - Hill bonus for divergent tiles (rift shoulders)
 * @param {number} [options.hillConvergentFoothill=0.25] - Hill bonus adjacent to convergent belts
 * @param {number} [options.hillInteriorFalloff=0.2] - Penalty for deep-interior tiles (keeps hills near action)
 * @param {number} [options.hillUpliftWeight=0.25] - Residual uplift contribution to hills
 */
export function layerAddMountainsPhysics(ctx, options = {}) {
    const {
        // Global relief scalar – higher values increase both tectonic forcing
        // and the fraction of land promoted to mountains/hills.
        tectonicIntensity = 1.0,
        mountainThreshold = 0.45,
        hillThreshold = 0.25,
        // Physics weights (scaled by tectonicIntensity)
        upliftWeight = 0.75,
        fractalWeight = 0.25,
        riftDepth = 0.3,
        boundaryWeight = 0.6,
        boundaryExponent = 1.4,
        interiorPenaltyWeight = 0.2,
        convergenceBonus = 0.9,
        transformPenalty = 0.3,
        riftPenalty = 0.75,
        hillBoundaryWeight = 0.45,
        hillRiftBonus = 0.5,
        hillConvergentFoothill = 0.25,
        hillInteriorFalloff = 0.2,
        hillUpliftWeight = 0.25,
    } = options;

    // Scale physics parameters by tectonic intensity
    // Higher intensity = stronger boundary effects = more tiles exceed threshold
    const scaledConvergenceBonus = convergenceBonus * tectonicIntensity;
    const scaledBoundaryWeight = boundaryWeight * tectonicIntensity;
    const scaledUpliftWeight = upliftWeight * tectonicIntensity;
    const scaledHillBoundaryWeight = hillBoundaryWeight * tectonicIntensity;
    const scaledHillConvergentFoothill = hillConvergentFoothill * tectonicIntensity;

    const dimensions = ctx?.dimensions || {};
    const width = Number.isFinite(dimensions.width)
        ? dimensions.width
        : GameplayMap?.getGridWidth?.() ?? 0;
    const height = Number.isFinite(dimensions.height)
        ? dimensions.height
        : GameplayMap?.getGridHeight?.() ?? 0;
    const adapter = ctx?.adapter;

    if (!width || !height || !adapter) {
        devLogIf &&
            devLogIf("LOG_MOUNTAINS", "[Mountains] Missing dimensions/adapter; skipping placement", {
                width,
                height,
                hasAdapter: !!adapter,
            });
        return;
    }
    const isWater = createIsWaterTile(ctx, adapter, width, height);
    const terrainWriter = (x, y, terrain) => {
        const isLand = terrain !== globals.g_CoastTerrain && terrain !== globals.g_OceanTerrain;
        if (ctx) {
            writeHeightfield(ctx, x, y, { terrain, isLand });
        }
        else {
            adapter.setTerrainType(x, y, terrain);
        }
    };
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
            if (!isWater(x, y)) {
                landTiles++;
            }
        }
    }

    devLogIf &&
        devLogIf("LOG_MOUNTAINS", "[Mountains] Physics-threshold mode", {
            landTiles,
            tectonicIntensity,
            mountainThreshold,
            hillThreshold,
        });

    // Compute placement scores for each tile
    const scores = new Float32Array(width * height);
    const hillScores = new Float32Array(width * height);

    if (worldModelEnabled) {
        // Physics-based placement using WorldModel
        // Pass SCALED parameters - tectonicIntensity affects mountain prevalence
        computePlateBasedScores(ctx, scores, hillScores, {
            upliftWeight: scaledUpliftWeight,
            fractalWeight,
            g_MountainFractal,
            g_HillFractal,
            boundaryWeight: scaledBoundaryWeight,
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
        }, isWater);
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

    const selectionAdapter = {
        isWater,
    };

    const mountainTiles = selectTilesAboveThreshold(
        scores,
        width,
        height,
        mountainThreshold,
        selectionAdapter
    );
    const hillTiles = selectTilesAboveThreshold(
        hillScores,
        width,
        height,
        hillThreshold,
        selectionAdapter,
        mountainTiles
    );

    const mountainsPlaced = mountainTiles.size;
    const hillsPlaced = hillTiles.size;
    // Place mountains
    for (const i of mountainTiles) {
        const x = i % width;
        const y = Math.floor(i / width);
        terrainWriter(x, y, globals.g_MountainTerrain);
    }

    // Place hills
    for (const i of hillTiles) {
        const x = i % width;
        const y = Math.floor(i / width);
        terrainWriter(x, y, globals.g_HillTerrain);
    }

    const summary = {
        mode: "physics-threshold",
        tectonicIntensity,
        mountainsPlaced,
        hillsPlaced,
        mountainPercent: landTiles > 0 ? ((mountainsPlaced / landTiles) * 100).toFixed(1) + "%" : "0%",
        hillPercent: landTiles > 0 ? ((hillsPlaced / landTiles) * 100).toFixed(1) + "%" : "0%",
        landTiles,
        worldModelEnabled,
    };
    devLogIf && devLogIf("LOG_MOUNTAINS", "[Mountains] placement", JSON.stringify(summary));
}

/**
 * Compute plate-based mountain scores using WorldModel boundaries
 */
function computePlateBasedScores(ctx, scores, hillScores, options, isWaterCheck) {
    // Get dimensions properly from ctx.dimensions (not ctx.width/height which don't exist!)
    const dims = ctx?.dimensions || {};
    const width = Number.isFinite(dims.width) ? dims.width : (GameplayMap?.getGridWidth?.() ?? 0);
    const height = Number.isFinite(dims.height) ? dims.height : (GameplayMap?.getGridHeight?.() ?? 0);
    const {
        upliftWeight,
        fractalWeight,
        g_MountainFractal,
        g_HillFractal,
        boundaryWeight,
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
    } = options;

    const upliftPotential = WorldModel.upliftPotential;
    const boundaryType = WorldModel.boundaryType;
    const boundaryCloseness = WorldModel.boundaryCloseness;
    const riftPotential = WorldModel.riftPotential;

    if (!upliftPotential || !boundaryType) {
        // Fallback if WorldModel data missing
        devLogIf &&
            devLogIf("LOG_MOUNTAINS", "[Mountains] Falling back to fractal-only scores (missing WorldModel arrays)");
        computeFractalOnlyScores(ctx, scores, hillScores, options);
        return;
    }

    // ========== DEBUG #1: Diagnose Land/Uplift Disconnect ==========
    // (Reuses width/height declared at function start)
    const isWater = typeof isWaterCheck === "function" ? isWaterCheck : (x, y) => GameplayMap?.isWater?.(x, y) ?? false;

    // Collect diagnostic data
    let totalLandTiles = 0;
    let landUpliftSum = 0;
    let landClosenessSum = 0;
    const landByBoundaryType = [0, 0, 0, 0]; // none, convergent, divergent, transform
    const landUpliftBuckets = { under25: 0, under50: 0, under100: 0, over100: 0 };
    const landClosenessBuckets = { under64: 0, under128: 0, under192: 0, over192: 0 };

    // Row-by-row analysis for south bias detection
    const rowStats = [];
    const rowStep = Math.max(1, Math.floor(height / 10));

    for (let y = 0; y < height; y++) {
        let rowLandCount = 0;
        let rowLandUpliftSum = 0;
        let rowLandClosenessSum = 0;

        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const isLand = !isWater(x, y);

            if (isLand) {
                totalLandTiles++;
                const upliftVal = upliftPotential[i] | 0;
                const closenessVal = boundaryCloseness[i] | 0;
                const bType = boundaryType[i] | 0;

                landUpliftSum += upliftVal;
                landClosenessSum += closenessVal;

                if (bType >= 0 && bType < 4) landByBoundaryType[bType]++;

                if (upliftVal < 25) landUpliftBuckets.under25++;
                else if (upliftVal < 50) landUpliftBuckets.under50++;
                else if (upliftVal < 100) landUpliftBuckets.under100++;
                else landUpliftBuckets.over100++;

                if (closenessVal < 64) landClosenessBuckets.under64++;
                else if (closenessVal < 128) landClosenessBuckets.under128++;
                else if (closenessVal < 192) landClosenessBuckets.under192++;
                else landClosenessBuckets.over192++;

                rowLandCount++;
                rowLandUpliftSum += upliftVal;
                rowLandClosenessSum += closenessVal;
            }
        }

        if (y % rowStep === 0 || y === height - 1) {
            rowStats.push({
                row: y,
                landCount: rowLandCount,
                avgUplift: rowLandCount > 0 ? Math.round(rowLandUpliftSum / rowLandCount) : 0,
                avgCloseness: rowLandCount > 0 ? Math.round(rowLandClosenessSum / rowLandCount) : 0,
            });
        }
    }

    devLogIf && devLogIf("LOG_MOUNTAINS", "[DEBUG #1] ========== LAND/UPLIFT DIAGNOSTIC ==========");
    devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1] Total land tiles: ${totalLandTiles}`);
    devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1] Avg uplift on land: ${totalLandTiles > 0 ? (landUpliftSum / totalLandTiles).toFixed(1) : 0} / 255`);
    devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1] Avg closeness on land: ${totalLandTiles > 0 ? (landClosenessSum / totalLandTiles).toFixed(1) : 0} / 255`);
    devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1] Land by boundary type: none=${landByBoundaryType[0]}, convergent=${landByBoundaryType[1]}, divergent=${landByBoundaryType[2]}, transform=${landByBoundaryType[3]}`);
    devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1] Land uplift buckets: <25=${landUpliftBuckets.under25}, 25-50=${landUpliftBuckets.under50}, 50-100=${landUpliftBuckets.under100}, >100=${landUpliftBuckets.over100}`);
    devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1] Land closeness buckets: <64=${landClosenessBuckets.under64}, 64-128=${landClosenessBuckets.under128}, 128-192=${landClosenessBuckets.under192}, >192=${landClosenessBuckets.over192}`);
    devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1] Row-by-row (south=0, north=${height-1}):`);
    rowStats.forEach(rs => {
        devLogIf && devLogIf("LOG_MOUNTAINS", `[DEBUG #1]   row ${rs.row}: land=${rs.landCount}, avgUplift=${rs.avgUplift}, avgCloseness=${rs.avgCloseness}`);
    });
    devLogIf && devLogIf("LOG_MOUNTAINS", "[DEBUG #1] ================================================");
    // ========== END DEBUG #1 ==========

    const boundaryGate = 0.20;  // Minimum closeness (0-1) to consider boundary effects
    const falloffExponent = boundaryExponent || 2.5;  // Exponential falloff for concentrated mountain belts

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);

            const uplift = upliftPotential ? upliftPotential[i] / 255 : 0;
            const bType = boundaryType[i];
            const closenessRaw = boundaryCloseness ? boundaryCloseness[i] / 255 : 0;
            const rift = riftPotential ? riftPotential[i] / 255 : 0;

            const fractalMtn = FractalBuilder.getHeight(g_MountainFractal, x, y) / 65535;
            const fractalHill = FractalBuilder.getHeight(g_HillFractal, x, y) / 65535;

            // Base score: uplift potential + fractal variety
            let mountainScore = uplift * upliftWeight + fractalMtn * fractalWeight;

            // Physics-based boundary effects with exponential falloff
            // Mountain building is most intense RIGHT AT the collision zone
            // BUT we modulate by fractal noise to create natural variation:
            // - Peaks where fractal is high
            // - Saddles/valleys where fractal is low
            // - Interruptions in the mountain chain
            if (closenessRaw > boundaryGate) {
                // Normalize to 0-1 above threshold, then apply exponential falloff
                const normalized = (closenessRaw - boundaryGate) / (1 - boundaryGate);
                const intensity = Math.pow(normalized, falloffExponent);

                // General boundary weight (foothills near any boundary)
                // Modulated by fractal to create variable foothill bands
                if (boundaryWeight > 0) {
                    const foothillNoise = 0.5 + fractalMtn * 0.5; // 0.5-1.0 range
                    mountainScore += intensity * boundaryWeight * foothillNoise;
                }

                // Boundary-type-specific modifiers
                if (bType === ENUM_BOUNDARY.convergent) {
                    // CONVERGENT: Strong mountain bonus concentrated at collision zone
                    // Modulated by fractal: creates peaks where noise is high, saddles where low
                    // fractalMtn ranges 0-1, so bonus ranges from 0.3x to 1.0x of full bonus
                    const peakNoise = 0.3 + fractalMtn * 0.7; // Minimum 30% ensures some mountains
                    mountainScore += intensity * convergenceBonus * peakNoise;
                }
                else if (bType === ENUM_BOUNDARY.divergent) {
                    // DIVERGENT: Suppress mountains (rift valleys, not peaks)
                    mountainScore *= Math.max(0, 1 - intensity * riftPenalty);
                }
                else if (bType === ENUM_BOUNDARY.transform) {
                    // TRANSFORM: Moderate suppression (strike-slip faults, linear valleys)
                    mountainScore *= Math.max(0, 1 - intensity * transformPenalty);
                }
            }

            // Interior penalty - push mountains toward plate margins
            if (interiorPenaltyWeight > 0) {
                const interiorPenalty = (1 - closenessRaw) * interiorPenaltyWeight;
                mountainScore = Math.max(0, mountainScore - interiorPenalty);
            }

            scores[i] = Math.max(0, mountainScore);

            // Hill scoring - foothills form around mountain belts with softer falloff
            // Hills use fractalHill for natural variation in foothill extent
            let hillScore = fractalHill * fractalWeight + uplift * hillUpliftWeight;

            if (closenessRaw > boundaryGate) {
                // Normalize and apply softer falloff for hills (sqrt instead of pow 2.5)
                // Hills spread wider than peaks, forming foothill bands
                const normalized = (closenessRaw - boundaryGate) / (1 - boundaryGate);
                const hillIntensity = Math.sqrt(normalized);  // Softer falloff for wider foothill bands

                // Variable foothill width based on fractal noise
                // Some areas have extensive foothills, others transition sharply
                const foothillExtent = 0.4 + fractalHill * 0.6; // 0.4-1.0 range

                if (hillBoundaryWeight > 0) {
                    hillScore += hillIntensity * hillBoundaryWeight * foothillExtent;
                }

                if (bType === ENUM_BOUNDARY.divergent) {
                    // Rift shoulders - hills along divergent boundaries (like East African Rift)
                    // Modulated by fractal for irregular rift shoulder terrain
                    hillScore += hillIntensity * rift * hillRiftBonus * foothillExtent;
                }
                else if (bType === ENUM_BOUNDARY.convergent) {
                    // Foothill bands adjacent to mountain belts
                    // Variable extent creates natural-looking piedmont zones
                    hillScore += hillIntensity * hillConvergentFoothill * foothillExtent;
                }
            }

            // Interior falloff - fewer hills deep in plate interiors
            if (hillInteriorFalloff > 0) {
                hillScore -= (1 - closenessRaw) * hillInteriorFalloff;
            }

            hillScores[i] = Math.max(0, hillScore);
        }
    }
}

/**
 * Fallback: pure fractal-based scores (base game approach)
 */
function computeFractalOnlyScores(ctx, scores, hillScores, options) {
    // Get dimensions properly from ctx.dimensions
    const dims = ctx?.dimensions || {};
    const width = Number.isFinite(dims.width) ? dims.width : (GameplayMap?.getGridWidth?.() ?? 0);
    const height = Number.isFinite(dims.height) ? dims.height : (GameplayMap?.getGridHeight?.() ?? 0);
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
    // Get dimensions properly from ctx.dimensions
    const dims = ctx?.dimensions || {};
    const width = Number.isFinite(dims.width) ? dims.width : (GameplayMap?.getGridWidth?.() ?? 0);
    const height = Number.isFinite(dims.height) ? dims.height : (GameplayMap?.getGridHeight?.() ?? 0);
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
 * Build a water check that prefers the landMask buffer written by landmass generation.
 */
function createIsWaterTile(ctx, adapter, width, height) {
    const landMask = ctx?.buffers?.heightfield?.landMask || null;
    return (x, y) => {
        if (landMask) {
            const idx = y * width + x;
            if (idx >= 0 && idx < landMask.length) {
                return landMask[idx] === 0;
            }
        }
        if (adapter?.isWater) {
            return adapter.isWater(x, y);
        }
        return GameplayMap?.isWater?.(x, y) ?? false;
    };
}

/**
 * Select tiles where score exceeds threshold (physics-driven, no quota)
 *
 * This is the core of the physics-threshold architecture:
 * - Only tiles that genuinely qualify based on tectonic physics get selected
 * - No forcing tiles to meet a quota
 * - Mountain count is determined by geology, not arbitrary percentage
 *
 * @param {Float32Array} scores - Score array for all tiles
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {number} threshold - Minimum score for selection (0..1)
 * @param {Object} adapter - Adapter with isWater(x,y) method
 * @param {Set} [excludeSet] - Optional set of tile indices to exclude
 * @returns {Set} Set of selected tile indices
 */
function selectTilesAboveThreshold(scores, width, height, threshold, adapter, excludeSet = null) {
    const selected = new Set();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;

            // Skip water
            if (adapter.isWater(x, y)) continue;

            // Skip excluded tiles
            if (excludeSet && excludeSet.has(i)) continue;

            // Only select if score exceeds threshold
            if (scores[i] > threshold) {
                selected.add(i);
            }
        }
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
        dimensions: { width, height },
        adapter,
        rng: {
            calls: 0,
            sequence: [],
        },
    };

    layerAddMountainsPhysics(ctx, {
        tectonicIntensity: 1.0,  // Standard intensity
        mountainThreshold: 0.45,
        hillThreshold: 0.25,
        upliftWeight: WorldModel.isEnabled() ? 0.75 : 0,
        fractalWeight: WorldModel.isEnabled() ? 0.25 : 1.0,
    });
}

export default layerAddMountainsPhysics;
