// @ts-nocheck
/**
 * Climate Engine — centralizes rainfall staging passes so the orchestrator and
 * narrative overlays operate against a single shared module.
 */
import { buildRainfallMap } from "/base-standard/maps/elevation-terrain-generator.js";
import { clamp, inBounds } from "../core/utils.js";
import { CLIMATE_DRIVERS, MOISTURE_ADJUSTMENTS, STORY_TUNABLES, STORY_ENABLE_OROGENY, FOUNDATION_DIRECTIONALITY, } from "../bootstrap/tunables.js";
import { ctxRandom, writeClimateField, syncClimateField } from "../core/types.js";
import { WorldModel } from "../world/model.js";
import { StoryTags } from "../story/tags.js";

/**
 * Resolve an engine adapter for rainfall operations. Falls back to GameplayMap
 * when no MapContext adapter is available.
 * @param {import('../core/types.js').MapContext|null} ctx
 */
function resolveAdapter(ctx) {
    if (ctx && ctx.adapter) {
        return ctx.adapter;
    }
    return {
        isWater: (x, y) => GameplayMap.isWater(x, y),
        isMountain: (x, y) => (GameplayMap.isMountain ? GameplayMap.isMountain(x, y) : GameplayMap.getElevation(x, y) >= 500),
        isCoastalLand: (x, y) => (GameplayMap.isCoastalLand ? GameplayMap.isCoastalLand(x, y) : false),
        isAdjacentToShallowWater: (x, y) => (GameplayMap.isAdjacentToShallowWater ? GameplayMap.isAdjacentToShallowWater(x, y) : false),
        isAdjacentToRivers: (x, y, radius) => GameplayMap.isAdjacentToRivers(x, y, radius),
        getRainfall: (x, y) => GameplayMap.getRainfall(x, y),
        setRainfall: (x, y, rf) => TerrainBuilder.setRainfall(x, y, rf),
        getElevation: (x, y) => GameplayMap.getElevation(x, y),
        getLatitude: (x, y) => GameplayMap.getPlotLatitude(x, y),
        getRandomNumber: (max, label) => TerrainBuilder.getRandomNumber(max, label),
    };
}

/**
 * Create shared IO helpers for rainfall passes.
 * @param {number} width
 * @param {number} height
 * @param {import('../core/types.js').MapContext|null} ctx
 */
function createClimateRuntime(width, height, ctx) {
    const adapter = resolveAdapter(ctx);
    const rainfallBuf = ctx?.buffers?.climate?.rainfall || null;
    const idx = (x, y) => y * width + x;
    const readRainfall = (x, y) => {
        if (ctx && rainfallBuf) {
            return rainfallBuf[idx(x, y)] | 0;
        }
        return adapter.getRainfall(x, y);
    };
    const writeRainfall = (x, y, rainfall) => {
        const clamped = clamp(rainfall, 0, 200);
        if (ctx) {
            writeClimateField(ctx, x, y, { rainfall: clamped });
        }
        else {
            adapter.setRainfall(x, y, clamped);
        }
    };
    const rand = (max, label) => {
        if (ctx) {
            return ctxRandom(ctx, label || "ClimateRand", max);
        }
        return adapter.getRandomNumber(max, label || "ClimateRand");
    };
    return {
        adapter,
        readRainfall,
        writeRainfall,
        rand,
        idx,
    };
}

/**
 * Baseline rainfall generation (latitude bands + coastal/orographic modifiers).
 * @param {number} width
 * @param {number} height
 * @param {import('../core/types.js').MapContext|null} ctx
 */
export function applyClimateBaseline(width, height, ctx = null) {
    console.log("Building enhanced rainfall patterns...");
    buildRainfallMap(width, height);
    if (ctx) {
        syncClimateField(ctx);
    }
    const runtime = createClimateRuntime(width, height, ctx);
    const { adapter, readRainfall, writeRainfall, rand } = runtime;
    const BASE_AREA = 10000;
    const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(Math.max(1, width * height) / BASE_AREA)));
    const equatorPlus = Math.round(12 * (sqrt - 1));
    const drivers = CLIMATE_DRIVERS?.baseline || {};
    const adjustments = MOISTURE_ADJUSTMENTS?.baseline || {};
    const bands = drivers.bands || {};
    const blend = drivers.blend || {};
    const orographic = adjustments.orographic || {};
    const coastalCfg = adjustments.coastal || {};
    const noiseCfg = adjustments.noise || {};
    const noiseBase = Number.isFinite(noiseCfg?.baseSpanSmall) ? noiseCfg.baseSpanSmall : 3;
    const noiseSpan = sqrt > 1
        ? noiseBase + Math.round(Number.isFinite(noiseCfg?.spanLargeScaleFactor) ? noiseCfg.spanLargeScaleFactor : 1)
        : noiseBase;
    const isCoastalLand = (x, y) => {
        if (adapter.isCoastalLand)
            return adapter.isCoastalLand(x, y);
        if (typeof GameplayMap?.isCoastalLand === "function")
            return GameplayMap.isCoastalLand(x, y);
        if (adapter.isWater(x, y))
            return false;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0)
                    continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height)
                    continue;
                if (adapter.isWater(nx, ny))
                    return true;
            }
        }
        return false;
    };
    const isAdjacentToShallowWater = (x, y) => {
        if (adapter.isAdjacentToShallowWater)
            return adapter.isAdjacentToShallowWater(x, y);
        if (typeof GameplayMap?.isAdjacentToShallowWater === "function")
            return GameplayMap.isAdjacentToShallowWater(x, y);
        return false;
    };
    const rollNoise = () => rand(noiseSpan * 2 + 1, "RainNoise") - noiseSpan;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (adapter.isWater(x, y))
                continue;
            const base = readRainfall(x, y);
            const elevation = adapter.getElevation(x, y);
            const lat = Math.abs(adapter.getLatitude(x, y));
            const b0 = Number.isFinite(bands.deg0to10) ? bands.deg0to10 : 120;
            const b1 = Number.isFinite(bands.deg10to20) ? bands.deg10to20 : 104;
            const b2 = Number.isFinite(bands.deg20to35) ? bands.deg20to35 : 75;
            const b3 = Number.isFinite(bands.deg35to55) ? bands.deg35to55 : 70;
            const b4 = Number.isFinite(bands.deg55to70) ? bands.deg55to70 : 60;
            const b5 = Number.isFinite(bands.deg70plus) ? bands.deg70plus : 45;
            let bandRain = 0;
            if (lat < 10)
                bandRain = b0 + equatorPlus;
            else if (lat < 20)
                bandRain = b1 + Math.floor(equatorPlus * 0.6);
            else if (lat < 35)
                bandRain = b2;
            else if (lat < 55)
                bandRain = b3;
            else if (lat < 70)
                bandRain = b4;
            else
                bandRain = b5;
            const baseW = Number.isFinite(blend?.baseWeight) ? blend.baseWeight : 0.6;
            const bandW = Number.isFinite(blend?.bandWeight) ? blend.bandWeight : 0.4;
            let currentRainfall = Math.round(base * baseW + bandRain * bandW);
            const hi1T = Number.isFinite(orographic?.hi1Threshold) ? orographic.hi1Threshold : 350;
            const hi1B = Number.isFinite(orographic?.hi1Bonus) ? orographic.hi1Bonus : 8;
            const hi2T = Number.isFinite(orographic?.hi2Threshold) ? orographic.hi2Threshold : 600;
            const hi2B = Number.isFinite(orographic?.hi2Bonus) ? orographic.hi2Bonus : 7;
            if (elevation > hi1T)
                currentRainfall += hi1B;
            if (elevation > hi2T)
                currentRainfall += hi2B;
            const coastalBonus = Number.isFinite(coastalCfg.coastalLandBonus) ? coastalCfg.coastalLandBonus : 24;
            const shallowBonus = Number.isFinite(coastalCfg.shallowAdjBonus) ? coastalCfg.shallowAdjBonus : 16;
            if (isCoastalLand(x, y))
                currentRainfall += coastalBonus;
            if (isAdjacentToShallowWater(x, y))
                currentRainfall += shallowBonus;
            currentRainfall += rollNoise();
            writeRainfall(x, y, currentRainfall);
        }
    }
}

/**
 * Apply macro climate swatches to the rainfall field.
 * Returns a lightweight summary that callers can extend.
 * @param {number} width
 * @param {number} height
 * @param {import('../core/types.js').MapContext|null} ctx
 * @param {{ orogenyCache?: any }} [options]
 */
export function applyClimateSwatches(width, height, ctx = null, options = {}) {
    const storyMoisture = MOISTURE_ADJUSTMENTS?.story || {};
    const cfg = storyMoisture.swatches;
    if (!cfg)
        return { applied: false, kind: "missing-config" };
    const area = Math.max(1, width * height);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    if (ctx) {
        syncClimateField(ctx);
    }
    const runtime = createClimateRuntime(width, height, ctx);
    const { adapter, readRainfall, writeRainfall, rand, idx } = runtime;
    const orogenyCache = options?.orogenyCache || {};
    const clamp200 = (v) => clamp(v, 0, 200);
    const inLocalBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
    const isWater = (x, y) => adapter.isWater(x, y);
    const getElevation = (x, y) => adapter.getElevation(x, y);
    const signedLatitudeAt = (y) => adapter.getLatitude(0, y);
    const isCoastalLand = (x, y) => {
        if (adapter.isCoastalLand)
            return adapter.isCoastalLand(x, y);
        if (typeof GameplayMap?.isCoastalLand === "function")
            return GameplayMap.isCoastalLand(x, y);
        if (isWater(x, y))
            return false;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0)
                    continue;
                const nx = x + dx;
                const ny = y + dy;
                if (!inLocalBounds(nx, ny))
                    continue;
                if (isWater(nx, ny))
                    return true;
            }
        }
        return false;
    };
    const isAdjacentToShallowWater = (x, y) => {
        if (adapter.isAdjacentToShallowWater)
            return adapter.isAdjacentToShallowWater(x, y);
        if (typeof GameplayMap?.isAdjacentToShallowWater === "function")
            return GameplayMap.isAdjacentToShallowWater(x, y);
        return false;
    };
    const types = cfg.types || {};
    let entries = Object.keys(types).map((key) => ({
        key,
        w: Math.max(0, types[key].weight | 0),
    }));
    try {
        const DIR = FOUNDATION_DIRECTIONALITY || {};
        const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
        if (COH > 0) {
            const windDeg = (DIR?.primaryAxes?.windBiasDeg ?? 0) | 0;
            const plateDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
            const wRad = (windDeg * Math.PI) / 180;
            const pRad = (plateDeg * Math.PI) / 180;
            const alignZonal = Math.abs(Math.cos(wRad));
            const alignPlate = Math.abs(Math.cos(pRad));
            entries = entries.map((entry) => {
                let mul = 1;
                if (entry.key === "macroDesertBelt") {
                    mul *= 1 + 0.4 * COH * alignZonal;
                }
                else if (entry.key === "equatorialRainbelt") {
                    mul *= 1 + 0.25 * COH * alignZonal;
                }
                else if (entry.key === "mountainForests") {
                    mul *= 1 + 0.2 * COH * alignPlate;
                }
                else if (entry.key === "greatPlains") {
                    mul *= 1 + 0.2 * COH * alignZonal;
                }
                return { key: entry.key, w: Math.max(0, Math.round(entry.w * mul)) };
            });
        }
    }
    catch (_err) {
        /* keep default weights on any error */
    }
    const totalW = entries.reduce((sum, entry) => sum + entry.w, 0) || 1;
    let roll = rand(totalW, "SwatchType");
    let chosenKey = entries[0]?.key || "macroDesertBelt";
    for (const entry of entries) {
        if (roll < entry.w) {
            chosenKey = entry.key;
            break;
        }
        roll -= entry.w;
    }
    const kind = chosenKey;
    const t = types[kind] || {};
    const widthMul = 1 + (cfg.sizeScaling?.widthMulSqrt || 0) * (sqrtScale - 1);
    const latBandCenter = () => t.latitudeCenterDeg ?? 0;
    const halfWidthDeg = () => Math.max(4, Math.round((t.halfWidthDeg ?? 10) * widthMul));
    const falloff = (value, radius) => Math.max(0, 1 - value / Math.max(1, radius));
    let applied = 0;
    for (let y = 0; y < height; y++) {
        const latDegAbs = Math.abs(signedLatitudeAt(y));
        for (let x = 0; x < width; x++) {
            if (isWater(x, y))
                continue;
            let rf = readRainfall(x, y);
            const elev = getElevation(x, y);
            let tileAdjusted = false;
            if (kind === "macroDesertBelt") {
                const center = latBandCenter();
                const hw = halfWidthDeg();
                const f = falloff(Math.abs(latDegAbs - center), hw);
                if (f > 0) {
                    const base = t.drynessDelta ?? 28;
                    const lowlandBonus = elev < 250 ? 4 : 0;
                    const delta = Math.round((base + lowlandBonus) * f);
                    rf = clamp200(rf - delta);
                    applied++;
                    tileAdjusted = true;
                }
            }
            else if (kind === "equatorialRainbelt") {
                const center = latBandCenter();
                const hw = halfWidthDeg();
                const f = falloff(Math.abs(latDegAbs - center), hw);
                if (f > 0) {
                    const base = t.wetnessDelta ?? 24;
                    let coastBoost = 0;
                    if (isCoastalLand(x, y))
                        coastBoost += 6;
                    if (isAdjacentToShallowWater(x, y))
                        coastBoost += 4;
                    const delta = Math.round((base + coastBoost) * f);
                    rf = clamp200(rf + delta);
                    applied++;
                    tileAdjusted = true;
                }
            }
            else if (kind === "rainforestArchipelago") {
                const fTropics = latDegAbs < 23 ? 1 : latDegAbs < 30 ? 0.5 : 0;
                if (fTropics > 0) {
                    let islandy = 0;
                    if (isCoastalLand(x, y))
                        islandy += 1;
                    if (isAdjacentToShallowWater(x, y))
                        islandy += 0.5;
                    if (islandy > 0) {
                        const base = t.wetnessDelta ?? 18;
                        const delta = Math.round(base * fTropics * islandy);
                        rf = clamp200(rf + delta);
                        applied++;
                        tileAdjusted = true;
                    }
                }
            }
            else if (kind === "mountainForests") {
                const windward = !!orogenyCache?.windward?.has?.(`${x},${y}`);
                const lee = !!orogenyCache?.lee?.has?.(`${x},${y}`);
                if (windward) {
                    const base = t.windwardBonus ?? 6;
                    const delta = base + (elev < 300 ? 2 : 0);
                    rf = clamp200(rf + delta);
                    applied++;
                    tileAdjusted = true;
                }
                else if (lee) {
                    const base = t.leePenalty ?? 2;
                    rf = clamp200(rf - base);
                    applied++;
                    tileAdjusted = true;
                }
            }
            else if (kind === "greatPlains") {
                const center = t.latitudeCenterDeg ?? 45;
                const hw = Math.max(6, Math.round((t.halfWidthDeg ?? 8) * widthMul));
                const f = falloff(Math.abs(latDegAbs - center), hw);
                if (f > 0 && elev <= (t.lowlandMaxElevation ?? 300)) {
                    const dry = t.dryDelta ?? 12;
                    const delta = Math.round(dry * f);
                    rf = clamp200(rf - delta);
                    applied++;
                    tileAdjusted = true;
                }
            }
            if (tileAdjusted) {
                writeRainfall(x, y, rf);
            }
        }
    }
    try {
        const DIR = FOUNDATION_DIRECTIONALITY || {};
        const monsoonBias = Math.max(0, Math.min(1, DIR?.hemispheres?.monsoonBias ?? 0));
        const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
        const eqBand = Math.max(0, (DIR?.hemispheres?.equatorBandDeg ?? 12) | 0);
        if (monsoonBias > 0 && COH > 0 && WorldModel?.isEnabled?.() && WorldModel.windU && WorldModel.windV) {
            const baseDelta = Math.max(1, Math.round(3 * COH * monsoonBias));
            for (let y = 0; y < height; y++) {
                const latSigned = signedLatitudeAt(y);
                const absLat = Math.abs(latSigned);
                if (absLat > eqBand + 18)
                    continue;
                for (let x = 0; x < width; x++) {
                    if (isWater(x, y))
                        continue;
                    if (!isCoastalLand(x, y) && !isAdjacentToShallowWater(x, y))
                        continue;
                    const i = idx(x, y);
                    const u = WorldModel.windU[i] | 0;
                    const v = WorldModel.windV[i] | 0;
                    let ux = 0, vy = 0;
                    if (Math.abs(u) >= Math.abs(v)) {
                        ux = u === 0 ? 0 : u > 0 ? 1 : -1;
                        vy = 0;
                    }
                    else {
                        ux = 0;
                        vy = v === 0 ? 0 : v > 0 ? 1 : -1;
                    }
                    const dnX = x - ux;
                    const dnY = y - vy;
                    if (!inLocalBounds(dnX, dnY))
                        continue;
                    let rf = readRainfall(x, y);
                    let baseDeltaAdj = baseDelta;
                    if (absLat <= eqBand)
                        baseDeltaAdj += 2;
                    if (isWater(dnX, dnY))
                        baseDeltaAdj += 2;
                    rf = clamp(rf + baseDeltaAdj, 0, 200);
                    writeRainfall(x, y, rf);
                    const upX = x + ux;
                    const upY = y + vy;
                    if (inLocalBounds(upX, upY) && isWater(dnX, dnY)) {
                        const rf0 = readRainfall(x, y);
                        const rf1 = Math.max(0, Math.min(200, rf0 - 1));
                        writeRainfall(x, y, rf1);
                    }
                }
            }
        }
    }
    catch (_err) {
        /* keep resilient */
    }
    return { applied: applied > 0, kind, tiles: applied };
}

/**
 * Earthlike rainfall refinements (post-rivers).
 * @param {number} width
 * @param {number} height
 * @param {import('../core/types.js').MapContext|null} ctx
 * @param {{ orogenyCache?: any }} [options]
 */
export function refineClimateEarthlike(width, height, ctx = null, options = {}) {
    const runtime = createClimateRuntime(width, height, ctx);
    const { adapter, readRainfall, writeRainfall } = runtime;
    const worldModel = ctx && ctx.worldModel ? ctx.worldModel : WorldModel;
    const refineAdjust = MOISTURE_ADJUSTMENTS?.refine || {};
    const storyMoisture = MOISTURE_ADJUSTMENTS?.story || {};
    const storyRain = storyMoisture.rainfall || {};
    const orogenyCache = options?.orogenyCache || null;
    console.log(`[Climate Refinement] Using ${ctx ? "MapContext adapter" : "direct engine calls"}`);
    // Pass A: coastal and lake humidity gradient
    {
        const waterGradient = refineAdjust.waterGradient || {};
        const maxR = (waterGradient?.radius ?? 5) | 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (adapter.isWater(x, y))
                    continue;
                let rf = readRainfall(x, y);
                const dist = distanceToNearestWater(x, y, maxR, adapter, width, height);
                if (dist >= 0) {
                    const elev = adapter.getElevation(x, y);
                    let bonus = Math.max(0, maxR - dist) * (waterGradient?.perRingBonus ?? 5);
                    if (elev < 150)
                        bonus += waterGradient?.lowlandBonus ?? 3;
                    rf += bonus;
                    writeRainfall(x, y, rf);
                }
            }
        }
    }
    // Pass B: orographic rain shadows with wind model
    {
        const orographic = refineAdjust.orographic || {};
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (adapter.isWater(x, y))
                    continue;
                const baseSteps = (orographic?.steps ?? 4) | 0;
                let steps = baseSteps;
                try {
                    const DIR = FOUNDATION_DIRECTIONALITY || {};
                    const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                    const windC = Math.max(0, Math.min(1, DIR?.interplay?.windsFollowPlates ?? 0));
                    const extra = Math.round(coh * windC);
                    steps = Math.max(1, baseSteps + extra);
                }
                catch (_) {
                    steps = baseSteps;
                }
                let barrier = 0;
                if (worldModel?.isEnabled?.() && worldModel.windU && worldModel.windV) {
                    barrier = hasUpwindBarrierWM(x, y, steps, adapter, width, height, worldModel);
                }
                else {
                    const lat = Math.abs(adapter.getLatitude(x, y));
                    const dx = lat < 30 || lat >= 60 ? -1 : 1;
                    const dy = 0;
                    barrier = hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height);
                }
                if (barrier) {
                    const rf = readRainfall(x, y);
                    const reduction = (orographic?.reductionBase ?? 8) + barrier * (orographic?.reductionPerStep ?? 6);
                    writeRainfall(x, y, rf - reduction);
                }
            }
        }
    }
    // Pass C: river corridor greening and basin humidity
    {
        const riverCorridor = refineAdjust.riverCorridor || {};
        const lowBasinCfg = refineAdjust.lowBasin || {};
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (adapter.isWater(x, y))
                    continue;
                let rf = readRainfall(x, y);
                const elev = adapter.getElevation(x, y);
                if (adapter.isAdjacentToRivers(x, y, 1)) {
                    rf += elev < 250
                        ? (riverCorridor?.lowlandAdjacencyBonus ?? 14)
                        : (riverCorridor?.highlandAdjacencyBonus ?? 10);
                }
                let lowBasinClosed = true;
                const basinRadius = lowBasinCfg?.radius ?? 2;
                for (let dy = -basinRadius; dy <= basinRadius && lowBasinClosed; dy++) {
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
    // Pass D: Rift humidity boost
    {
        const riftR = storyRain?.riftRadius ?? 2;
        const riftBoost = storyRain?.riftBoost ?? 8;
        if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (adapter.isWater(x, y))
                        continue;
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
                        const penalty = Math.max(0, Math.floor((elev - 200) / 150));
                        const delta = Math.max(0, riftBoost - penalty);
                        writeRainfall(x, y, rf + delta);
                    }
                }
            }
        }
    }
    // Pass E: Orogeny belts (windward/lee)
    {
        if (STORY_ENABLE_OROGENY && typeof orogenyCache === "object") {
            const hasWindward = orogenyCache?.windward?.size > 0;
            const hasLee = orogenyCache?.lee?.size > 0;
            if (hasWindward || hasLee) {
                const windwardBoost = STORY_TUNABLES?.orogeny?.windwardBoost ?? 5;
                const leeAmp = STORY_TUNABLES?.orogeny?.leeDrynessAmplifier ?? 1.2;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (adapter.isWater(x, y))
                            continue;
                        let rf = readRainfall(x, y);
                        const key = `${x},${y}`;
                        if (hasWindward && orogenyCache.windward.has(key)) {
                            rf = clamp(rf + windwardBoost, 0, 200);
                        }
                        if (hasLee && orogenyCache.lee.has(key)) {
                            const baseSubtract = 8;
                            const extra = Math.max(0, Math.round(baseSubtract * (leeAmp - 1)));
                            rf = clamp(rf - (baseSubtract + extra), 0, 200);
                        }
                        writeRainfall(x, y, rf);
                    }
                }
            }
        }
    }
    // Pass F: Hotspot island microclimates
    {
        const paradiseDelta = storyRain?.paradiseDelta ?? 6;
        const volcanicDelta = storyRain?.volcanicDelta ?? 8;
        const radius = 2;
        const hasParadise = StoryTags.hotspotParadise.size > 0;
        const hasVolcanic = StoryTags.hotspotVolcanic.size > 0;
        if (hasParadise || hasVolcanic) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
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
                            if (!nearParadise && hasParadise && StoryTags.hotspotParadise.has(key))
                                nearParadise = true;
                            if (!nearVolcanic && hasVolcanic && StoryTags.hotspotVolcanic.has(key))
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
}

/**
 * Distance helper for the refinement pass.
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
 * Upwind barrier utility (legacy helper copied from refinement layer).
 */
function hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height) {
    for (let s = 1; s <= steps; s++) {
        const nx = x + dx * s;
        const ny = y + dy * s;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height)
            break;
        if (!adapter.isWater(nx, ny)) {
            if (adapter.isMountain && adapter.isMountain(nx, ny))
                return s;
            const elev = adapter.getElevation(nx, ny);
            if (elev >= 500)
                return s;
        }
    }
    return 0;
}

/**
 * Upwind barrier using world model wind vectors.
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
            if (Math.abs(u) >= Math.abs(v)) {
                ux = u === 0 ? 0 : u > 0 ? 1 : -1;
                vy = 0;
            }
            else {
                ux = 0;
                vy = v === 0 ? 0 : v > 0 ? 1 : -1;
            }
            if (ux === 0 && vy === 0) {
                const lat = Math.abs(adapter.getLatitude(cx, cy));
                ux = lat < 30 || lat >= 60 ? -1 : 1;
                vy = 0;
            }
        }
        else {
            const lat = Math.abs(adapter.getLatitude(cx, cy));
            ux = lat < 30 || lat >= 60 ? -1 : 1;
            vy = 0;
        }
        const nx = cx + ux;
        const ny = cy + vy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height)
            break;
        if (!adapter.isWater(nx, ny)) {
            if (adapter.isMountain && adapter.isMountain(nx, ny))
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

export default {
    applyClimateBaseline,
    applyClimateSwatches,
    refineClimateEarthlike,
};
