// @ts-nocheck
/**
 * Volcano Placement — Plate-Aware Wrapper
 *
 * Purpose
 * - Replace the base game's continent-edge heuristic with a WorldModel-driven
 *   placement strategy that favors convergent arcs while still allowing inland
 *   hotspot-style volcanoes when configured.
 * - Exposes tunables through the `volcanoes` config block so presets can adjust
 *   density, spacing, and boundary weighting without touching this layer.
 *
 * Fallback
 * - If the WorldModel is disabled or required fields are unavailable, defer to
 *   the base game's `addVolcanoes()` implementation to preserve vanilla behavior.
 */

import { WorldModel } from "../world/model.js";
import { idx } from "../core/types.js";
import { devLogIf } from "../bootstrap/dev.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { addVolcanoes as baseAddVolcanoes, isTooCloseToExistingVolcanoes } from "/base-standard/maps/volcano-generator.js";

const ENUM_BOUNDARY = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});

/**
 * @typedef {import("../core/types.js").MapContext} MapContext
 * @typedef {import("../core/types.js").MapMetrics} MapMetrics
 */

/**
 * Plate-aware volcano placement. Falls back to base game implementation when
 * WorldModel data is unavailable.
 *
 * @param {MapContext} ctx
 * @param {Object} [options]
 */
export function layerAddVolcanoesPlateAware(ctx, options = {}) {
    const {
        enabled = true,
        baseDensity = 1 / 170, // ~1 volcano per 170 land tiles (close to vanilla)
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

    const { width, height, adapter } = ctx;

    if (!enabled) {
        devLogIf && devLogIf("LOG_VOLCANOES", "[Volcanoes] Disabled via config; skipping placement.");
        return;
    }

    const worldEnabled = WorldModel.isEnabled();
    const boundaryCloseness = WorldModel.boundaryCloseness;
    const boundaryType = WorldModel.boundaryType;
    const shieldStability = WorldModel.shieldStability;

    if (!worldEnabled || !boundaryCloseness || !boundaryType) {
        devLogIf &&
            devLogIf("LOG_VOLCANOES", "[Volcanoes] WorldModel unavailable; falling back to base generator.");
        baseAddVolcanoes(width, height, minSpacing);
        return;
    }

    // Count land tiles for density target
    let landTiles = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!GameplayMap.isWater(x, y)) landTiles++;
        }
    }

    const rawDesired = Math.round(landTiles * Math.max(0, baseDensity));
    const targetVolcanoes = clamp(Math.max(minVolcanoes | 0, rawDesired), minVolcanoes | 0, maxVolcanoes > 0 ? maxVolcanoes | 0 : rawDesired);

    if (targetVolcanoes <= 0) {
        devLogIf && devLogIf("LOG_STORY_TAGS", "[Volcanoes] Target count <= 0; skipping placement.");
        return;
    }

    const candidates = [];
    const hotspotBase = Math.max(0, hotspotWeight);
    const threshold = Math.max(0, Math.min(1, boundaryThreshold));
    const shieldWeight = Math.max(0, Math.min(1, shieldPenalty));
    const jitter = Math.max(0, randomJitter);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (GameplayMap.isWater(x, y)) continue;
            if (GameplayMap.getFeatureType(x, y) === globals.g_VolcanoFeature) continue;

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
                if (bType === ENUM_BOUNDARY.convergent) multiplier = Math.max(0, convergentMultiplier);
                else if (bType === ENUM_BOUNDARY.transform) multiplier = Math.max(0, transformMultiplier);
                else if (bType === ENUM_BOUNDARY.divergent) multiplier = Math.max(0, divergentMultiplier);
                weight += base * multiplier;
            } else {
                // Interior hotspot chance scales with how far we are from boundaries
                const interiorBand = 1 - closeness;
                weight += hotspotBase * interiorBand;
            }

            if (weight <= 0) continue;

            if (shieldWeight > 0) {
                const penalty = shield * shieldWeight;
                weight *= Math.max(0, 1 - penalty);
            }

            if (jitter > 0) {
                const randomScale = (TerrainBuilder.getRandomNumber(1000, "VolcanoJitter") || 0) / 1000;
                weight += randomScale * jitter;
            }

            if (weight > 0) {
                candidates.push({ x, y, weight, closeness, boundaryType: bType });
            }
        }
    }

    if (candidates.length === 0) {
        devLogIf &&
            devLogIf("LOG_VOLCANOES", "[Volcanoes] No candidates with positive weight; falling back to base generator.");
        baseAddVolcanoes(width, height, minSpacing);
        return;
    }

    candidates.sort((a, b) => b.weight - a.weight);

    const placed = [];
    const minSpacingClamped = Math.max(1, minSpacing | 0);
    for (const candidate of candidates) {
        if (placed.length >= targetVolcanoes) break;
        if (GameplayMap.getFeatureType(candidate.x, candidate.y) === globals.g_VolcanoFeature) continue;
        if (isTooCloseToExistingVolcanoes(candidate.x, candidate.y, placed, minSpacingClamped)) continue;

        adapter.setTerrainType(candidate.x, candidate.y, globals.g_MountainTerrain);
        adapter.setFeatureType(candidate.x, candidate.y, {
            Feature: globals.g_VolcanoFeature,
            Direction: -1,
            Elevation: 0,
        });
        placed.push({ x: candidate.x, y: candidate.y });
    }

    devLogIf &&
        devLogIf("LOG_VOLCANOES", "[Volcanoes] placement", {
            candidates: candidates.length,
            placed: placed.length,
            targetVolcanoes,
            minSpacing: minSpacingClamped,
        });
}

function clamp(value, min, max) {
    if (typeof max === "number" && max >= min) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
    return Math.max(value, min);
}

export default layerAddVolcanoesPlateAware;
