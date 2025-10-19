// @ts-nocheck
/**
 * Coastlines Layer — addRuggedCoasts
 *
 * Light-touch coastal reshaping that carves occasional bays and creates sparse
 * fjord-like peninsulas while preserving open sea lanes. Uses a low-frequency
 * fractal mask and conservative randomness to avoid chokepoint proliferation.
 *
 * Dependencies: engine-provided GameplayMap, TerrainBuilder, FractalBuilder, and globals.
 */
import * as globals from "/base-standard/maps/map-globals.js";
import { isAdjacentToLand } from "../core/utils.js";
import { StoryTags } from "../story/tags.js";
import { COASTLINES_CFG, CORRIDOR_POLICY, } from "../bootstrap/tunables.js";
import { ctxRandom } from "../core/types.js";
import { WorldModel } from "../world/model.js";

const ENUM_BOUNDARY = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});

function clamp(v, lo, hi) {
    if (v < lo)
        return lo;
    if (v > hi)
        return hi;
    return v;
}

function computePlateBias(closenessNorm, boundaryType, cfg) {
    if (closenessNorm == null || Number.isNaN(closenessNorm))
        closenessNorm = 0;
    const threshold = cfg.threshold;
    const power = cfg.power;
    let weight = 0;
    if (closenessNorm >= threshold) {
        const span = Math.max(1e-3, 1 - threshold);
        const normalized = clamp((closenessNorm - threshold) / span, 0, 1);
        const ramp = Math.pow(normalized, power);
        let typeMul = 0;
        if (boundaryType === ENUM_BOUNDARY.convergent)
            typeMul = cfg.convergent;
        else if (boundaryType === ENUM_BOUNDARY.transform)
            typeMul = cfg.transform;
        else if (boundaryType === ENUM_BOUNDARY.divergent)
            typeMul = cfg.divergent;
        weight = ramp * typeMul;
    }
    else if (cfg.interior !== 0 && threshold > 0) {
        const normalized = clamp(1 - closenessNorm / threshold, 0, 1);
        weight = Math.pow(normalized, power) * cfg.interior;
    }
    return weight;
}
/**
 * Ruggedize coasts in a sparse, performance-friendly pass.
 * - Occasionally converts coastal land to shallow water (bays).
 * - Occasionally converts adjacent ocean to coast (peninsulas/fjords).
 * - Only operates near current coastlines; does not perform heavy flood fills.
 *
 * Invariants:
 * - Keeps oceans truly open; very low probabilities to avoid chokepoints.
 * - O(width × height) with constant-time local checks.
 *
 * @param {number} iWidth
 * @param {number} iHeight
 * @param {import('../core/types.js').MapContext} [ctx] - Optional MapContext for adapter-based operations
 */
export function addRuggedCoasts(iWidth, iHeight, ctx) {
    // Size-aware modifiers (gentle; keep lanes open)
    const area = Math.max(1, iWidth * iHeight);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    // Use hill fractal as a sparse noise mask to drive rare edits
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 4, 0);

    // Phase 2: WorldModel plate boundary integration
    const worldModelEnabled = WorldModel.isEnabled();
    const boundaryCloseness = worldModelEnabled ? WorldModel.boundaryCloseness : null;
    const boundaryType = worldModelEnabled ? WorldModel.boundaryType : null;
    // Probability tuning: on larger maps, allow a touch more edits
    const cfg = COASTLINES_CFG || {};
    const cfgBay = (cfg && cfg.bay) || {};
    const cfgFjord = (cfg && cfg.fjord) || {};
    const bayNoiseExtra = (sqrtScale > 1 ? 1 : 0) +
        (Number.isFinite(cfgBay.noiseGateAdd) ? cfgBay.noiseGateAdd : 0);
    const fjordBaseDenom = Math.max(6, (Number.isFinite(cfgFjord.baseDenom) ? cfgFjord.baseDenom : 12) -
        (sqrtScale > 1.3 ? 1 : 0));
    const fjordActiveBonus = Number.isFinite(cfgFjord.activeBonus)
        ? cfgFjord.activeBonus
        : 1;
    const fjordPassiveBonus = Number.isFinite(cfgFjord.passiveBonus)
        ? cfgFjord.passiveBonus
        : 2;
    const bayRollDenActive = Number.isFinite(cfgBay.rollDenActive)
        ? cfgBay.rollDenActive
        : 4;
    const bayRollDenDefault = Number.isFinite(cfgBay.rollDenDefault)
        ? cfgBay.rollDenDefault
        : 5;
    const minSeaLaneWidth = Number.isFinite(cfg.minSeaLaneWidth)
        ? cfg.minSeaLaneWidth
        : 4; // reserved for future shelf/trench guards
    const plateBiasRaw = (cfg && cfg.plateBias) || {};
    const plateBiasCfg = {
        threshold: clamp(Number.isFinite(plateBiasRaw.threshold) ? plateBiasRaw.threshold : 0.45, 0, 1),
        power: Math.max(0.1, Number.isFinite(plateBiasRaw.power) ? plateBiasRaw.power : 1.25),
        convergent: Number.isFinite(plateBiasRaw.convergent) ? plateBiasRaw.convergent : 1.0,
        transform: Number.isFinite(plateBiasRaw.transform) ? plateBiasRaw.transform : 0.4,
        divergent: Number.isFinite(plateBiasRaw.divergent) ? plateBiasRaw.divergent : -0.6,
        interior: Number.isFinite(plateBiasRaw.interior) ? plateBiasRaw.interior : 0,
        bayWeight: Math.max(0, Number.isFinite(plateBiasRaw.bayWeight) ? plateBiasRaw.bayWeight : 0.35),
        bayNoiseBonus: Math.max(0, Number.isFinite(plateBiasRaw.bayNoiseBonus) ? plateBiasRaw.bayNoiseBonus : 1.0),
        fjordWeight: Math.max(0, Number.isFinite(plateBiasRaw.fjordWeight) ? plateBiasRaw.fjordWeight : 0.8),
    };
    // Sea-lane policy (hard skip vs. soft probability reduction)
    const seaPolicy = (CORRIDOR_POLICY && CORRIDOR_POLICY.sea) || {};
    const SEA_PROTECTION = seaPolicy.protection || "hard";
    const SOFT_MULT = Math.max(0, Math.min(1, seaPolicy.softChanceMultiplier ?? 0.5));
    for (let y = 1; y < iHeight - 1; y++) {
        for (let x = 1; x < iWidth - 1; x++) {
            // Sea-lane policy: hard skip or soft probability reduction
            const _k = `${x},${y}`;
            const _onSeaLane = StoryTags.corridorSeaLane && StoryTags.corridorSeaLane.has(_k);
            const _softMult = _onSeaLane && SEA_PROTECTION === "soft" ? SOFT_MULT : 1;
            if (_onSeaLane && SEA_PROTECTION === "hard") {
                continue;
            }
            // Carve bays: coastal land -> coast water (very sparse)
            if (GameplayMap.isCoastalLand(x, y)) {
                const h = FractalBuilder.getHeight(globals.g_HillFractal, x, y);

                // Phase 2: Check boundary closeness for enhanced ruggedness
                const i = y * iWidth + x;
                const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
                const closenessNorm = closenessByte / 255;
                const bType = boundaryType ? boundaryType[i] | 0 : ENUM_BOUNDARY.none;
                const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
                const plateBiasValue = boundaryCloseness
                    ? computePlateBias(closenessNorm, bType, plateBiasCfg)
                    : 0;

                // Margin-aware: slightly stronger bay carving on ACTIVE_MARGIN or near plate boundaries
                const isActive = StoryTags.activeMargin.has(`${x},${y}`) || nearBoundary;
                const noiseGateBonus = plateBiasValue > 0
                    ? Math.round(plateBiasValue * plateBiasCfg.bayNoiseBonus)
                    : 0;
                const noiseGate = 2 + bayNoiseExtra + (isActive ? 1 : 0) + noiseGateBonus;
                const bayRollDen = isActive
                    ? bayRollDenActive
                    : bayRollDenDefault;
                let bayRollDenUsed = _softMult !== 1
                    ? Math.max(1, Math.round(bayRollDen / _softMult))
                    : bayRollDen;
                if (plateBiasCfg.bayWeight > 0 && plateBiasValue !== 0) {
                    const scale = clamp(1 + plateBiasValue * plateBiasCfg.bayWeight, 0.25, 4);
                    bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / scale));
                }
                // Corridor edge effect: if near a sea-lane, apply style-based bay carve bias
                const laneAttr = (function () {
                    for (let ddy = -1; ddy <= 1; ddy++) {
                        for (let ddx = -1; ddx <= 1; ddx++) {
                            if (ddx === 0 && ddy === 0)
                                continue;
                            const k = `${x + ddx},${y + ddy}`;
                            if (StoryTags.corridorSeaLane &&
                                StoryTags.corridorSeaLane.has(k)) {
                                return StoryTags.corridorAttributes?.get?.(k) || null;
                            }
                        }
                    }
                    return null;
                })();
                if (laneAttr && laneAttr.edge) {
                    const edgeCfg = laneAttr.edge;
                    const bayMult = Number.isFinite(edgeCfg.bayCarveMultiplier)
                        ? edgeCfg.bayCarveMultiplier
                        : 1;
                    if (bayMult && bayMult !== 1) {
                        bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / bayMult));
                    }
                }
                if (h % 97 < noiseGate &&
                    (ctx ? ctxRandom(ctx, "Carve Bay", bayRollDenUsed) : TerrainBuilder.getRandomNumber(bayRollDenUsed, "Carve Bay")) === 0) {
                    if (ctx && ctx.adapter) {
                        ctx.adapter.setTerrainType(x, y, globals.g_CoastTerrain);
                    } else {
                        TerrainBuilder.setTerrainType(x, y, globals.g_CoastTerrain);
                    }
                    continue; // Avoid double-touching same tile in this pass
                }
            }
            // Fjord-like peninsulas: turn some adjacent ocean into coast (very sparse)
            if (GameplayMap.isWater(x, y)) {
                // Keep to near-land ocean only; deep ocean remains untouched
                if (isAdjacentToLand(x, y, 1)) {
                    {
                        // Phase 2: Check boundary closeness for enhanced ruggedness
                        const i = y * iWidth + x;
                        const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
                        const closenessNorm = closenessByte / 255;
                        const bType = boundaryType ? boundaryType[i] | 0 : ENUM_BOUNDARY.none;
                        const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
                        const plateBiasValue = boundaryCloseness
                            ? computePlateBias(closenessNorm, bType, plateBiasCfg)
                            : 0;

                        // Margin-aware: widen shelf near PASSIVE_SHELF, deepen cuts near ACTIVE_MARGIN or plate boundaries
                        let nearActive = nearBoundary, nearPassive = false;
                        for (let ddy = -1; ddy <= 1 && (!nearActive || !nearPassive); ddy++) {
                            for (let ddx = -1; ddx <= 1; ddx++) {
                                if (ddx === 0 && ddy === 0)
                                    continue;
                                const nx = x + ddx, ny = y + ddy;
                                if (nx <= 0 ||
                                    nx >= iWidth - 1 ||
                                    ny <= 0 ||
                                    ny >= iHeight - 1)
                                    continue;
                                const k = `${nx},${ny}`;
                                if (!nearActive &&
                                    StoryTags.activeMargin.has(k))
                                    nearActive = true;
                                if (!nearPassive &&
                                    StoryTags.passiveShelf.has(k))
                                    nearPassive = true;
                            }
                        }
                        const denom = Math.max(4, fjordBaseDenom -
                            (nearPassive ? fjordPassiveBonus : 0) -
                            (nearActive ? fjordActiveBonus : 0));
                        let denomUsed = _softMult !== 1
                            ? Math.max(1, Math.round(denom / _softMult))
                            : denom;
                        if (plateBiasCfg.fjordWeight > 0 && plateBiasValue !== 0) {
                            const fjScale = clamp(1 + plateBiasValue * plateBiasCfg.fjordWeight, 0.2, 5);
                            denomUsed = Math.max(1, Math.round(denomUsed / fjScale));
                        }
                        // Corridor edge effect: if adjacent to a sea-lane tile, increase fjord/coast conversion chance
                        {
                            let edgeCfg = null;
                            for (let my = -1; my <= 1 && !edgeCfg; my++) {
                                for (let mx = -1; mx <= 1; mx++) {
                                    if (mx === 0 && my === 0)
                                        continue;
                                    const kk = `${x + mx},${y + my}`;
                                    if (StoryTags.corridorSeaLane &&
                                        StoryTags.corridorSeaLane.has(kk)) {
                                        const attr = StoryTags.corridorAttributes?.get?.(kk);
                                        edgeCfg = attr && attr.edge ? attr.edge : null;
                                        if (edgeCfg)
                                            break;
                                    }
                                }
                            }
                            if (edgeCfg) {
                                const fj = Number.isFinite(edgeCfg.fjordChance)
                                    ? edgeCfg.fjordChance
                                    : 0;
                                const cliffs = Number.isFinite(edgeCfg.cliffsChance)
                                    ? edgeCfg.cliffsChance
                                    : 0;
                                // Convert combined edge effect into a denom multiplier (cap to avoid aggression)
                                const effect = Math.max(0, Math.min(0.5, fj + cliffs * 0.5));
                                if (effect > 0) {
                                    denomUsed = Math.max(1, Math.round(denomUsed * (1 - effect)));
                                }
                            }
                        }
                        if ((ctx ? ctxRandom(ctx, "Fjord Coast", denomUsed) : TerrainBuilder.getRandomNumber(denomUsed, "Fjord Coast")) === 0) {
                            if (ctx && ctx.adapter) {
                                ctx.adapter.setTerrainType(x, y, globals.g_CoastTerrain);
                            } else {
                                TerrainBuilder.setTerrainType(x, y, globals.g_CoastTerrain);
                            }
                        }
                    }
                }
            }
        }
    }
}
export default addRuggedCoasts;
