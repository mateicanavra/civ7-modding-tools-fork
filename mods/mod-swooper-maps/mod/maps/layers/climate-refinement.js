/**
 * Climate Refinement Layer — refineRainfallEarthlike
 *
 * Purpose
 * - Apply earthlike refinements to the baseline rainfall after rivers exist.
 * - Keep adjustments small, localized, and clamped to preserve balance.
 *
 * Passes (A–E)
 * A) Coastal and lake humidity gradient (up to radius 4; stronger at low elevation)
 * B) Orographic rain shadows with latitude-dependent prevailing winds
 * C) River corridor greening and slight low-basin humidity
 * D) Rift humidity boost near StoryTags.riftLine (narrow radius; elevation-aware)
 * E) Hotspot island microclimates (paradise/volcanic centers) with small boosts
 *
 * Invariants
 * - Clamp all rainfall updates to [0, 200].
 * - Keep scans local (radius ≤ 4) and complexity O(width × height).
 * - Do not reorder the broader pipeline (this runs after rivers are modeled).
 *
 * Phase 1 Refactoring:
 * - Now accepts MapContext to access adapter and WorldModel
 * - Uses adapter for all terrain reads/writes
 * - Backward compatible: ctx parameter is optional
 */
import { clamp, inBounds } from "../core/utils.js";
import { StoryTags } from "../story/tags.js";
import { OrogenyCache } from "../story/tagging.js";
import { STORY_TUNABLES, STORY_ENABLE_OROGENY, MOISTURE_ADJUSTMENTS, WORLDMODEL_DIRECTIONALITY, } from "../bootstrap/tunables.js";
import { WorldModel } from "../world/model.js";
import { devLogIf } from "../bootstrap/dev.js";
import { writeClimateField } from "../core/types.js";
/**
 * Distance in tiles (Chebyshev radius) to nearest water within maxR; -1 if none.
 * @param {number} x
 * @param {number} y
 * @param {number} maxR
 * @param {import('../core/types.js').EngineAdapter} adapter
 * @param {number} width
 * @param {number} height
 */
function distanceToNearestWater(x, y, maxR, adapter, width, height) {
    for (let r = 1; r <= maxR; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx === 0 && dy === 0)
                    continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (adapter.isWater(nx, ny))
                        return r;
                }
            }
        }
    }
    return -1;
}
/**
 * Returns number of steps (1..steps) to the first upwind barrier or 0 if none.
 * A barrier is a mountain tile (if engine exposes isMountain)
 * or a tile with elevation >= 500.
 * @param {number} x
 * @param {number} y
 * @param {number} dx - upwind x-step
 * @param {number} dy - upwind y-step
 * @param {number} steps - how far to scan
 * @param {import('../core/types.js').EngineAdapter} adapter
 * @param {number} width
 * @param {number} height
 */
function hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height) {
    for (let s = 1; s <= steps; s++) {
        const nx = x + dx * s;
        const ny = y + dy * s;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height)
            break;
        if (!adapter.isWater(nx, ny)) {
            if (adapter.isMountain(nx, ny))
                return s;
            const elev = adapter.getElevation(nx, ny);
            if (elev >= 500)
                return s;
        }
    }
    return 0;
}
/**
 * Upwind barrier scan using WorldModel wind vectors.
 * Steps along the dominant component of (windU, windV) per tile, normalized to -1/0/1,
 * and returns the number of steps to first barrier (mountain/elev>=500) within 'steps', else 0.
 * @param {number} x
 * @param {number} y
 * @param {number} steps
 * @param {import('../core/types.js').EngineAdapter} adapter
 * @param {number} width
 * @param {number} height
 * @param {import('../world/model.js').WorldModel} worldModel
 */
function hasUpwindBarrierWM(x, y, steps, adapter, width, height, worldModel) {
    const U = worldModel.windU;
    const V = worldModel.windV;
    if (!U || !V)
        return 0;
    let cx = x;
    let cy = y;
    for (let s = 1; s <= steps; s++) {
        const i = cy * width + cx;
        let ux = 0, vy = 0;
        if (i >= 0 && i < U.length) {
            const u = U[i] | 0;
            const v = V[i] | 0;
            // Choose dominant component; prefer |u| vs |v|, break ties toward u (zonal)
            if (Math.abs(u) >= Math.abs(v)) {
                ux = u === 0 ? 0 : u > 0 ? 1 : -1;
                vy = 0;
            }
            else {
                ux = 0;
                vy = v === 0 ? 0 : v > 0 ? 1 : -1;
            }
            // If both zero, fallback to latitude zonal step
            if (ux === 0 && vy === 0) {
                const lat = Math.abs(adapter.getLatitude(cx, cy));
                ux = lat < 30 || lat >= 60 ? -1 : 1;
                vy = 0;
            }
        }
        else {
            // Out of range safety
            const lat = Math.abs(adapter.getLatitude(cx, cy));
            ux = lat < 30 || lat >= 60 ? -1 : 1;
            vy = 0;
        }
        const nx = cx + ux;
        const ny = cy + vy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height)
            break;
        if (!adapter.isWater(nx, ny)) {
            if (adapter.isMountain(nx, ny))
                return s;
            const elev = adapter.getElevation(nx, ny);
            if (elev >= 500)
                return s;
        }
        cx = nx;
        cy = ny;
    }
    return 0;
}
/**
 * Apply earthlike rainfall refinements in multiple small, clamped passes.
 * Call this after rivers are modeled and named.
 * @param {number} iWidth
 * @param {number} iHeight
 * @param {import('../core/types.js').MapContext} [ctx] - Optional MapContext (Phase 1 refactoring)
 */
export function refineRainfallEarthlike(iWidth, iHeight, ctx = null) {
    // Phase 1: Use adapter if context provided, fallback to direct engine calls for backward compat
    const adapter = ctx ? ctx.adapter : {
        isWater: (x, y) => GameplayMap.isWater(x, y),
        getElevation: (x, y) => GameplayMap.getElevation(x, y),
        getRainfall: (x, y) => GameplayMap.getRainfall(x, y),
        setRainfall: (x, y, rf) => TerrainBuilder.setRainfall(x, y, rf),
        getLatitude: (x, y) => GameplayMap.getPlotLatitude(x, y),
        isMountain: (x, y) => GameplayMap.isMountain ? GameplayMap.isMountain(x, y) : GameplayMap.getElevation(x, y) >= 500,
        isAdjacentToRivers: (x, y, rad) => GameplayMap.isAdjacentToRivers(x, y, rad),
    };
    const rainfallBuf = ctx?.buffers?.climate?.rainfall || null;
    const idx = (x, y) => y * iWidth + x;
    const readRainfall = (x, y) => {
        if (ctx && rainfallBuf) {
            return rainfallBuf[idx(x, y)] | 0;
        }
        return adapter.getRainfall(x, y);
    };
    const writeRainfall = (x, y, rf) => {
        const clamped = clamp(rf, 0, 200);
        if (ctx) {
            writeClimateField(ctx, x, y, { rainfall: clamped });
        }
        else {
            adapter.setRainfall(x, y, clamped);
        }
    };
    const worldModel = ctx && ctx.worldModel ? ctx.worldModel : WorldModel;
    const refineAdjust = MOISTURE_ADJUSTMENTS?.refine || {};
    const storyMoisture = MOISTURE_ADJUSTMENTS?.story || {};
    const storyRain = storyMoisture.rainfall || {};

    console.log(`[Climate Refinement] Using ${ctx ? 'MapContext adapter' : 'direct engine calls'}`);

    // Pass A: coastal and lake humidity gradient (decays with distance; configurable)
    {
        const waterGradient = refineAdjust.waterGradient || {};
        const maxR = (waterGradient?.radius ?? 5) | 0;
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (adapter.isWater(x, y))
                    continue;
                const dist = distanceToNearestWater(x, y, maxR, adapter, iWidth, iHeight);
                if (dist >= 0) {
                    // Closer to water -> more humidity; stronger if also low elevation
                    const elev = adapter.getElevation(x, y);
                    let bonus = Math.max(0, maxR - dist) *
                        (waterGradient?.perRingBonus ?? 5);
                    if (elev < 150)
                        bonus += waterGradient?.lowlandBonus ?? 3;
                    const rf = readRainfall(x, y);
                    writeRainfall(x, y, rf + bonus);
                }
            }
        }
    }
    // Pass B: orographic rain shadows with latitude-dependent prevailing winds (configurable)
    {
        const orographic = refineAdjust.orographic || {};
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (adapter.isWater(x, y))
                    continue;
                const baseSteps = (orographic?.steps ?? 4) | 0;
                let steps = baseSteps;
                try {
                    const DIR = WORLDMODEL_DIRECTIONALITY || {};
                    const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                    const windC = Math.max(0, Math.min(1, DIR?.interplay?.windsFollowPlates ?? 0));
                    // Slight bias: +1 step at high cohesion and wind-plate interplay
                    const extra = Math.round(coh * windC);
                    steps = Math.max(1, baseSteps + extra);
                }
                catch (_) {
                    steps = baseSteps;
                }
                let barrier = 0;
                // Phase 1: Use worldModel from context if available
                if (worldModel?.isEnabled?.() &&
                    worldModel.windU &&
                    worldModel.windV) {
                    barrier = hasUpwindBarrierWM(x, y, steps, adapter, iWidth, iHeight, worldModel);
                }
                else {
                    const lat = Math.abs(adapter.getLatitude(x, y));
                    const dx = lat < 30 || lat >= 60 ? -1 : 1;
                    const dy = 0;
                    barrier = hasUpwindBarrier(x, y, dx, dy, steps, adapter, iWidth, iHeight);
                }
                if (barrier) {
                    const rf = readRainfall(x, y);
                    const reduction = (orographic?.reductionBase ?? 8) +
                        barrier * (orographic?.reductionPerStep ?? 6);
                    writeRainfall(x, y, rf - reduction);
                }
            }
        }
    }
    // Pass C: river corridor greening and basin humidity (configurable)
    {
        const riverCorridor = refineAdjust.riverCorridor || {};
        const lowBasinCfg = refineAdjust.lowBasin || {};
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (adapter.isWater(x, y))
                    continue;
                let rf = readRainfall(x, y);
                const elev = adapter.getElevation(x, y);
                // River adjacency boost (stronger at low elevation)
                if (adapter.isAdjacentToRivers(x, y, 1)) {
                    rf += elev < 250
                        ? (riverCorridor?.lowlandAdjacencyBonus ?? 14)
                        : (riverCorridor?.highlandAdjacencyBonus ?? 10);
                }
                // Slight wetness in enclosed low basins (surrounded by higher elevation; configurable radius)
                let lowBasinClosed = true;
                const basinRadius = lowBasinCfg?.radius ?? 2;
                for (let dy = -basinRadius; dy <= basinRadius &&
                    lowBasinClosed; dy++) {
                    for (let dx = -basinRadius; dx <= basinRadius; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (inBounds(nx, ny)) {
                            if (adapter.getElevation(nx, ny) < elev + 20) {
                                lowBasinClosed = false;
                                break;
                            }
                        }
                    }
                }
                if (lowBasinClosed && elev < 200)
                    rf += lowBasinCfg?.delta ?? 6;
                writeRainfall(x, y, rf);
            }
        }
    }
    // Pass D: Rift humidity boost (narrow radius, elevation-aware)
    {
        const riftR = storyRain?.riftRadius ?? 2;
        const riftBoost = storyRain?.riftBoost ?? 8;
        if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
            for (let y = 0; y < iHeight; y++) {
                for (let x = 0; x < iWidth; x++) {
                    if (adapter.isWater(x, y))
                        continue;
                    // Quick proximity check: any rift line tile within radius riftR
                    let nearRift = false;
                    for (let dy = -riftR; dy <= riftR && !nearRift; dy++) {
                        for (let dx = -riftR; dx <= riftR; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (!inBounds(nx, ny))
                                continue;
                            if (StoryTags.riftLine.has(`${nx},${ny}`)) {
                                nearRift = true;
                                break;
                            }
                        }
                    }
                    if (nearRift) {
                        const rf = readRainfall(x, y);
                        const elev = adapter.getElevation(x, y);
                        // Slightly reduce boost at higher elevation
                        const penalty = Math.max(0, Math.floor((elev - 200) / 150));
                        const delta = Math.max(0, riftBoost - penalty);
                        writeRainfall(x, y, rf + delta);
                    }
                }
            }
        }
    }
    // Pass E: Orogeny belts (windward/lee amplification — size-aware, clamped)
    {
        if (STORY_ENABLE_OROGENY && typeof OrogenyCache === "object") {
            const hasWindward = OrogenyCache.windward && OrogenyCache.windward.size > 0;
            const hasLee = OrogenyCache.lee && OrogenyCache.lee.size > 0;
            if (hasWindward || hasLee) {
                const windwardBoost = STORY_TUNABLES?.orogeny?.windwardBoost ?? 5;
                const leeAmp = STORY_TUNABLES?.orogeny?.leeDrynessAmplifier ?? 1.2;
                for (let y = 0; y < iHeight; y++) {
                    for (let x = 0; x < iWidth; x++) {
                        if (adapter.isWater(x, y))
                            continue;
                        let rf = readRainfall(x, y);
                        const key = `${x},${y}`;
                        // Apply windward boost (small, positive)
                        if (hasWindward && OrogenyCache.windward.has(key)) {
                            rf = clamp(rf + windwardBoost, 0, 200);
                        }
                        // Apply lee dryness by amplifying a small baseline subtraction
                        if (hasLee && OrogenyCache.lee.has(key)) {
                            const baseSubtract = 8; // slightly stronger lee-side dryness to accentuate relief
                            const extra = Math.max(0, Math.round(baseSubtract * (leeAmp - 1)));
                            rf = clamp(rf - (baseSubtract + extra), 0, 200);
                        }
                        writeRainfall(x, y, rf);
                    }
                }
            }
        }
    }
    // Pass F: Hotspot island microclimates (paradise/volcanic centers)
    {
        const paradiseDelta = storyRain?.paradiseDelta ?? 6;
        const volcanicDelta = storyRain?.volcanicDelta ?? 8;
        const radius = 2;
        const hasParadise = StoryTags.hotspotParadise.size > 0;
        const hasVolcanic = StoryTags.hotspotVolcanic.size > 0;
        if (hasParadise || hasVolcanic) {
            for (let y = 0; y < iHeight; y++) {
                for (let x = 0; x < iWidth; x++) {
                    if (adapter.isWater(x, y))
                        continue;
                    let nearParadise = false;
                    let nearVolcanic = false;
                    for (let dy = -radius; dy <= radius && (!nearParadise || !nearVolcanic); dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (!inBounds(nx, ny))
                                continue;
                            const key = `${nx},${ny}`;
                            if (!nearParadise &&
                                hasParadise &&
                                StoryTags.hotspotParadise.has(key))
                                nearParadise = true;
                            if (!nearVolcanic &&
                                hasVolcanic &&
                                StoryTags.hotspotVolcanic.has(key))
                                nearVolcanic = true;
                            if (nearParadise && nearVolcanic)
                                break;
                        }
                    }
                    if (nearParadise || nearVolcanic) {
                        const rf = readRainfall(x, y);
                        let delta = 0;
                        if (nearParadise)
                            delta += paradiseDelta;
                        if (nearVolcanic)
                            delta += volcanicDelta;
                        writeRainfall(x, y, rf + delta);
                    }
                }
            }
        }
    }
    // Pass G: Atmospheric Pressure Bias (Phase 2 - WorldModel integration)
    // High pressure zones (descending air) are dry; low pressure zones (rising air) are wet
    {
        if (worldModel?.isEnabled?.() && worldModel.pressure) {
            const pressure = worldModel.pressure;
            const pressureCfg = refineAdjust.pressure || {};
            const pressureStrength = pressureCfg?.strength ?? 0.15; // 0..1, how much pressure affects rainfall

            for (let y = 0; y < iHeight; y++) {
                for (let x = 0; x < iWidth; x++) {
                    if (adapter.isWater(x, y)) continue;

                    const i = y * iWidth + x;
                    const p = pressure[i] / 255; // 0..1, normalized pressure
                    let rf = readRainfall(x, y);

                    // High pressure (p > 0.5) reduces rainfall (descending air, stable conditions)
                    // Low pressure (p < 0.5) increases rainfall (rising air, convection)
                    const pressureBias = (p - 0.5) * 2; // -1..1, negative = low pressure
                    const delta = -pressureBias * 15 * pressureStrength; // Inverted: low pressure (+), high pressure (-)

                    rf = clamp(rf + delta, 0, 200);
                    writeRainfall(x, y, rf);
                }
            }

            devLogIf && devLogIf("LOG_CLIMATE", "[Climate] Atmospheric pressure bias applied", {
                strength: pressureStrength,
            });
        }
    }
}
export default refineRainfallEarthlike;
