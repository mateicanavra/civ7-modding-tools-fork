// @ts-nocheck
/**
 * Developer logging configuration and helpers (disabled by default).
 *
 * Purpose
 * - Centralize all dev-only flags and utilities so verbose logs can be enabled
 *   temporarily without touching generation logic.
 * - Keep all helpers no-op when disabled to avoid perf impact or noisy output.
 *
 * Usage (example)
 *   import { DEV, devLog, devLogIf, timeSection, logStoryTagsSummary, logRainfallHistogram } from "./config/dev.js";
 *
 *   // Enable locally for a debugging session:
 *   // DEV.ENABLED = true; DEV.LOG_TIMING = true; DEV.LOG_STORY_TAGS = true;
 *
 *   devLog("Hello from dev logs");
 *   devLogIf("LOG_STORY_TAGS", "Story tags will be summarized later");
 *
 *   timeSection("Layer: addIslandChains", () => {
 *     addIslandChains(width, height);
 *   });
 *
 *   logStoryTagsSummary(StoryTags);
 *   logRainfallHistogram(width, height, 12);
 */
/**
 * Master toggles (all false by default).
 * Flip selectively during development sessions; keep off for release builds.
 */
import * as globals from "/base-standard/maps/map-globals.js";
import { dumpTerrain, dumpRainfall, dumpBiomes, dumpContinents } from "/base-standard/maps/map-debug-helpers.js";
import { DEV_LOG_CFG as __DEV_CFG__, FOUNDATION_DIAGNOSTICS as __FOUNDATION_DIAGNOSTICS__ } from "./resolved.js";
export const DEV = {
    ENABLED: false, // Master switch — must be true for any dev logging
    LOG_TIMING: false, // Log per-section timings (timeSection / timeStart/timeEnd)
    LOG_STORY_TAGS: false, // Log StoryTags summary counts
    RAINFALL_HISTOGRAM: false, // Log a coarse rainfall histogram (non-water tiles only)
    LOG_RAINFALL_SUMMARY: false, // Log rainfall min/max/avg statistics
    LOG_CORRIDOR_ASCII: false, // Print a coarse ASCII overlay of corridor tags (downsampled)
    LOG_FOUNDATION_SUMMARY: false, // Print compact Foundation summary when available
    LOG_FOUNDATION_ASCII: false, // ASCII visualization of plate boundaries & terrain mix
    LOG_LANDMASS_ASCII: false, // ASCII snapshot of land vs. ocean bands/continents
    LOG_LANDMASS_WINDOWS: false, // Log landmass window bounding boxes/areas
    LOG_RELIEF_ASCII: false, // ASCII visualization of major relief (mountains/hills/volcanoes)
    LOG_RAINFALL_ASCII: false, // ASCII heatmap buckets for rainfall bands
    LOG_BIOME_ASCII: false, // ASCII biome classification overlay
    LOG_BIOME_SUMMARY: false, // Log biome tile counts
    LOG_SWATCHES: false, // Log climate swatch usage/results
    LOG_MOUNTAINS: false, // Detailed mountain placement summaries
    LOG_VOLCANOES: false, // Detailed volcano placement summaries
    LOG_BOUNDARY_METRICS: false, // Quantitative summary of plate boundary coverage
    FOUNDATION_HISTOGRAMS: false, // Print histograms for rift/uplift (optionally near tags)
    LAYER_COUNTS: false, // Reserved for layer-specific counters (if used by callers)
    LOG_FOUNDATION_SEED: false,
    LOG_FOUNDATION_PLATES: false,
    LOG_FOUNDATION_DYNAMICS: false,
    LOG_FOUNDATION_SURFACE: false,
};
/**
 * Internal: guard that checks if a specific flag is enabled (and master is on).
 * @param {keyof typeof DEV} flag
 * @returns {boolean}
 */
/**
 * Initialize DEV flags from resolved.DEV_LOG_CFG() at module import time.
 * Entries/presets can override dev logging per run.
 */
try {
    const __cfg = typeof __DEV_CFG__ === "function" ? __DEV_CFG__() : null;
    if (__cfg && typeof __cfg === "object") {
        if ("enabled" in __cfg)
            DEV.ENABLED = !!__cfg.enabled;
        if ("logTiming" in __cfg)
            DEV.LOG_TIMING = !!__cfg.logTiming;
        if ("logStoryTags" in __cfg)
            DEV.LOG_STORY_TAGS = !!__cfg.logStoryTags;
        if ("rainfallHistogram" in __cfg)
            DEV.RAINFALL_HISTOGRAM = !!__cfg.rainfallHistogram;
        if ("LOG_RAINFALL_SUMMARY" in __cfg)
            DEV.LOG_RAINFALL_SUMMARY = !!__cfg.LOG_RAINFALL_SUMMARY;
        if ("LOG_CORRIDOR_ASCII" in __cfg)
            DEV.LOG_CORRIDOR_ASCII = !!__cfg.LOG_CORRIDOR_ASCII;
        if ("LOG_FOUNDATION_SUMMARY" in __cfg)
            DEV.LOG_FOUNDATION_SUMMARY = !!__cfg.LOG_FOUNDATION_SUMMARY;
        else if ("LOG_WORLDMODEL_SUMMARY" in __cfg)
            DEV.LOG_FOUNDATION_SUMMARY = !!__cfg.LOG_WORLDMODEL_SUMMARY;
        if ("LOG_FOUNDATION_ASCII" in __cfg)
            DEV.LOG_FOUNDATION_ASCII = !!__cfg.LOG_FOUNDATION_ASCII;
        else if ("LOG_WORLDMODEL_ASCII" in __cfg)
            DEV.LOG_FOUNDATION_ASCII = !!__cfg.LOG_WORLDMODEL_ASCII;
        if ("LOG_LANDMASS_ASCII" in __cfg)
            DEV.LOG_LANDMASS_ASCII = !!__cfg.LOG_LANDMASS_ASCII;
        if ("LOG_LANDMASS_WINDOWS" in __cfg)
            DEV.LOG_LANDMASS_WINDOWS = !!__cfg.LOG_LANDMASS_WINDOWS;
        if ("LOG_RELIEF_ASCII" in __cfg)
            DEV.LOG_RELIEF_ASCII = !!__cfg.LOG_RELIEF_ASCII;
        if ("LOG_RAINFALL_ASCII" in __cfg)
            DEV.LOG_RAINFALL_ASCII = !!__cfg.LOG_RAINFALL_ASCII;
        if ("LOG_BIOME_ASCII" in __cfg)
            DEV.LOG_BIOME_ASCII = !!__cfg.LOG_BIOME_ASCII;
        if ("LOG_BIOME_SUMMARY" in __cfg)
            DEV.LOG_BIOME_SUMMARY = !!__cfg.LOG_BIOME_SUMMARY;
        if ("LOG_SWATCHES" in __cfg)
            DEV.LOG_SWATCHES = !!__cfg.LOG_SWATCHES;
        if ("LOG_BOUNDARY_METRICS" in __cfg)
            DEV.LOG_BOUNDARY_METRICS = !!__cfg.LOG_BOUNDARY_METRICS;
        if ("LOG_MOUNTAINS" in __cfg)
            DEV.LOG_MOUNTAINS = !!__cfg.LOG_MOUNTAINS;
        if ("LOG_VOLCANOES" in __cfg)
            DEV.LOG_VOLCANOES = !!__cfg.LOG_VOLCANOES;
        if ("FOUNDATION_HISTOGRAMS" in __cfg)
            DEV.FOUNDATION_HISTOGRAMS = !!__cfg.FOUNDATION_HISTOGRAMS;
        else if ("WORLDMODEL_HISTOGRAMS" in __cfg)
            DEV.FOUNDATION_HISTOGRAMS = !!__cfg.WORLDMODEL_HISTOGRAMS;
        if ("LOG_FOUNDATION_SEED" in __cfg)
            DEV.LOG_FOUNDATION_SEED = !!__cfg.LOG_FOUNDATION_SEED;
        if ("LOG_FOUNDATION_PLATES" in __cfg)
            DEV.LOG_FOUNDATION_PLATES = !!__cfg.LOG_FOUNDATION_PLATES;
        if ("LOG_FOUNDATION_DYNAMICS" in __cfg)
            DEV.LOG_FOUNDATION_DYNAMICS = !!__cfg.LOG_FOUNDATION_DYNAMICS;
        if ("LOG_FOUNDATION_SURFACE" in __cfg)
            DEV.LOG_FOUNDATION_SURFACE = !!__cfg.LOG_FOUNDATION_SURFACE;
    }
}
catch (_) {
    /* no-op */
}

applyFoundationDiagnostics();

function isOn(flag) {
    return !!(DEV && DEV.ENABLED && DEV[flag]);
}

function applyFoundationDiagnostics() {
    let diag = null;
    try {
        diag = typeof __FOUNDATION_DIAGNOSTICS__ === "function" ? __FOUNDATION_DIAGNOSTICS__() : null;
    }
    catch (_) {
        diag = null;
    }
    if (!diag || typeof diag !== "object")
        return;
    const { logSeed, logPlates, logDynamics, logSurface } = diag;
    if (logSeed || logPlates || logDynamics || logSurface)
        DEV.ENABLED = true;
    if (logSeed) {
        DEV.LOG_FOUNDATION_SEED = true;
    }
    if (logPlates) {
        DEV.LOG_FOUNDATION_PLATES = true;
        DEV.LOG_FOUNDATION_SUMMARY = true;
        DEV.LOG_FOUNDATION_ASCII = true;
        DEV.LOG_BOUNDARY_METRICS = true;
    }
    if (logDynamics) {
        DEV.LOG_FOUNDATION_DYNAMICS = true;
        DEV.FOUNDATION_HISTOGRAMS = true;
    }
    if (logSurface) {
        DEV.LOG_FOUNDATION_SURFACE = true;
        DEV.LOG_LANDMASS_ASCII = true;
        DEV.LOG_LANDMASS_WINDOWS = true;
    }
}
/**
 * Safe console.log wrapper (no-op if disabled).
 * @param  {...any} args
 */
export function devLog(...args) {
    if (!DEV.ENABLED)
        return;
    try {
        console.log("[DEV]", ...args);
    }
    catch (_) {
        /* swallow */
    }
}
/**
 * Conditional console.log wrapper for a specific flag under the master switch.
 * @param {keyof typeof DEV} flag
 * @param  {...any} args
 */
export function devLogIf(flag, ...args) {
    if (!isOn(flag))
        return;
    try {
        console.log(`[DEV][${String(flag)}]`, ...args);
    }
    catch (_) {
        /* swallow */
    }
}
/**
 * Time a synchronous section and log duration (no-op if LOG_TIMING disabled).
 * @template T
 * @param {string} label
 * @param {() => T} fn
 * @returns {T}
 */
export function timeSection(label, fn) {
    if (!isOn("LOG_TIMING"))
        return fn();
    const t0 = nowMs();
    try {
        return fn();
    }
    finally {
        const dt = nowMs() - t0;
        safeLog(`[DEV][time] ${label}: ${fmtMs(dt)}`);
    }
}
/**
 * Start a timing span; returns a token to pass to timeEnd.
 * No-op (returns null) if LOG_TIMING disabled.
 * @param {string} label
 * @returns {{label:string,t0:number}|null}
 */
export function timeStart(label) {
    if (!isOn("LOG_TIMING"))
        return null;
    return { label, t0: nowMs() };
}
/**
 * End a timing span started by timeStart.
 * Safe to call with null (no-op).
 * @param {{label:string,t0:number}|null} token
 */
export function timeEnd(token) {
    if (!token)
        return;
    const dt = nowMs() - token.t0;
    safeLog(`[DEV][time] ${token.label}: ${fmtMs(dt)}`);
}
/**
 * Log a compact summary of StoryTags (sizes of known sets).
 * Safe if StoryTags is missing or partially defined.
 * No-op if LOG_STORY_TAGS disabled.
 * @param {{hotspot?:Set<string>,hotspotParadise?:Set<string>,hotspotVolcanic?:Set<string>,riftLine?:Set<string>,riftShoulder?:Set<string>,activeMargin?:Set<string>,passiveShelf?:Set<string>}} StoryTags
 * @param {{belts?:Set<string>,windward?:Set<string>,lee?:Set<string>}} [OrogenyCache]
 */
export function logStoryTagsSummary(StoryTags, OrogenyCache) {
    if (!isOn("LOG_STORY_TAGS"))
        return;
    if (!StoryTags || typeof StoryTags !== "object") {
        safeLog("[DEV][story] StoryTags not available");
        return;
    }
    const counts = {
        hotspot: sizeOf(StoryTags.hotspot),
        hotspotParadise: sizeOf(StoryTags.hotspotParadise),
        hotspotVolcanic: sizeOf(StoryTags.hotspotVolcanic),
        riftLine: sizeOf(StoryTags.riftLine),
        riftShoulder: sizeOf(StoryTags.riftShoulder),
        activeMargin: sizeOf(StoryTags.activeMargin),
        passiveShelf: sizeOf(StoryTags.passiveShelf),
        corridorSeaLane: sizeOf(StoryTags.corridorSeaLane),
        corridorIslandHop: sizeOf(StoryTags.corridorIslandHop),
        corridorLandOpen: sizeOf(StoryTags.corridorLandOpen),
        corridorRiverChain: sizeOf(StoryTags.corridorRiverChain),
    };
    safeLog("[DEV][story] tags:", counts);
    if (OrogenyCache && typeof OrogenyCache === "object") {
        const oroCounts = {
            belts: sizeOf(OrogenyCache.belts),
            windward: sizeOf(OrogenyCache.windward),
            lee: sizeOf(OrogenyCache.lee),
        };
        if (oroCounts.belts > 0) {
            safeLog("[DEV][story] orogeny:", oroCounts);
        }
    }
    // Optional ASCII corridor overlay (downsampled)
    if (isOn("LOG_CORRIDOR_ASCII")) {
        logCorridorAsciiOverlay();
    }
}
/**
 * Build and log a rainfall histogram over non-water tiles (coarse bins).
 * Depends on GameplayMap (provided by the game engine at runtime).
 * No-op if RAINFALL_HISTOGRAM disabled or GameplayMap is unavailable.
 * @param {number} width
 * @param {number} height
 * @param {number} [bins=10]
 */
export function logRainfallHistogram(width, height, bins = 10) {
    if (!isOn("RAINFALL_HISTOGRAM"))
        return;
    try {
        if (typeof GameplayMap?.getRainfall !== "function" ||
            typeof GameplayMap?.isWater !== "function") {
            safeLog("[DEV][rain] GameplayMap API unavailable; skipping histogram.");
            return;
        }
        const counts = new Array(Math.max(1, Math.min(100, bins))).fill(0);
        let samples = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (GameplayMap.isWater(x, y))
                    continue;
                const r = clampTo(GameplayMap.getRainfall(x, y), 0, 200);
                const idx = Math.min(counts.length - 1, Math.floor((r / 201) * counts.length));
                counts[idx]++;
                samples++;
            }
        }
        if (samples === 0) {
            safeLog("[DEV][rain] No land samples for histogram.");
            return;
        }
        const pct = counts.map((c) => ((c / samples) * 100).toFixed(1) + "%");
        safeLog("[DEV][rain] histogram (bins=", counts.length, "):", pct);
    }
    catch (err) {
        safeLog("[DEV][rain] histogram error:", err);
    }
}

export function logRainfallStats(label = "rainfall", width, height) {
    if (!isOn("LOG_RAINFALL_SUMMARY"))
        return;
    try {
        const w = Number.isFinite(width) ? width : GameplayMap?.getGridWidth?.();
        const h = Number.isFinite(height) ? height : GameplayMap?.getGridHeight?.();
        if (!w || !h) {
            safeLog(`[DEV][rain] stats ${label}: No map bounds.`);
            return;
        }
        if (typeof GameplayMap?.getRainfall !== "function" || typeof GameplayMap?.isWater !== "function") {
            safeLog(`[DEV][rain] stats ${label}: GameplayMap API unavailable.`);
            return;
        }
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let landTiles = 0;
        const buckets = { arid: 0, semiArid: 0, temperate: 0, wet: 0, lush: 0 };
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (GameplayMap.isWater(x, y))
                    continue;
                const value = GameplayMap.getRainfall(x, y) ?? 0;
                landTiles++;
                if (value < min)
                    min = value;
                if (value > max)
                    max = value;
                sum += value;
                if (value < 25)
                    buckets.arid++;
                else if (value < 60)
                    buckets.semiArid++;
                else if (value < 95)
                    buckets.temperate++;
                else if (value < 130)
                    buckets.wet++;
                else
                    buckets.lush++;
            }
        }
        if (landTiles === 0) {
            safeLog(`[DEV][rain] stats ${label}: No land tiles.`);
            return;
        }
        const avg = sum / landTiles;
        safeLog(`[DEV][rain] stats ${label}:`, {
            landTiles,
            min,
            max,
            avg: Number(avg.toFixed(2)),
            buckets,
        });
    }
    catch (err) {
        safeLog(`[DEV][rain] stats ${label} error:`, err);
    }
}

export function logBiomeSummary(label = "biomes", width, height) {
    if (!isOn("LOG_BIOME_SUMMARY"))
        return;
    try {
        const w = Number.isFinite(width) ? width : GameplayMap?.getGridWidth?.();
        const h = Number.isFinite(height) ? height : GameplayMap?.getGridHeight?.();
        if (!w || !h) {
            safeLog(`[DEV][biome] summary ${label}: No map bounds.`);
            return;
        }
        if (typeof GameplayMap?.getBiomeType !== "function") {
            safeLog(`[DEV][biome] summary ${label}: GameplayMap.getBiomeType unavailable.`);
            return;
        }
        const counts = new Map();
        let landTiles = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (GameplayMap.isWater?.(x, y))
                    continue;
                landTiles++;
                const id = GameplayMap.getBiomeType(x, y) ?? -1;
                counts.set(id, (counts.get(id) ?? 0) + 1);
            }
        }
        const summary = Array.from(counts.entries())
            .map(([id, count]) => ({
            id,
            name: resolveBiomeName(id),
            count,
            share: landTiles > 0 ? Number(((count / landTiles) * 100).toFixed(2)) : 0,
        }))
            .sort((a, b) => b.count - a.count);
        safeLog(`[DEV][biome] summary ${label}:`, {
            landTiles,
            summary,
        });
    }
    catch (err) {
        safeLog(`[DEV][biome] summary ${label} error:`, err);
    }
}

function resolveBiomeName(id) {
    try {
        if (id == null || id < 0)
            return null;
        const entry = GameInfo?.Biomes?.[id];
        if (entry?.Name)
            return entry.Name;
    }
    catch {
        /* ignore */
    }
    return null;
}

/**
 * Log foundation seed configuration and (optional) captured plate seed snapshot.
 * @param {any} seedConfig
 * @param {any} plateSeed
 * @param {{skipConfig?:boolean}} [options]
 */
export function logFoundationSeed(seedConfig, plateSeed, options = {}) {
    if (!isOn("LOG_FOUNDATION_SEED"))
        return;
    const { skipConfig = false } = options || {};
    try {
        if (!skipConfig) {
            safeLog("[Foundation] seed config:", summarizeFoundationSeedConfig(seedConfig));
        }
        if (plateSeed && typeof plateSeed === "object") {
            safeLog("[Foundation] plate seed snapshot:", summarizePlateSeed(plateSeed));
        }
    }
    catch (err) {
        safeLog("[Foundation] seed log error:", err);
    }
}

/**
 * Log configured plate generation parameters.
 * @param {any} platesConfig
 */
export function logFoundationPlates(platesConfig) {
    if (!isOn("LOG_FOUNDATION_PLATES"))
        return;
    try {
        safeLog("[Foundation] plates config:", summarizeFoundationPlates(platesConfig));
    }
    catch (err) {
        safeLog("[Foundation] plates log error:", err);
    }
}

/**
 * Log wind/currents/mantle/directionality drivers.
 * @param {any} dynamicsConfig
 */
export function logFoundationDynamics(dynamicsConfig) {
    if (!isOn("LOG_FOUNDATION_DYNAMICS"))
        return;
    try {
        safeLog("[Foundation] dynamics config:", summarizeFoundationDynamics(dynamicsConfig));
    }
    catch (err) {
        safeLog("[Foundation] dynamics log error:", err);
    }
}

/**
 * Log surface targets (landmass + ocean separation).
 * @param {any} surfaceConfig
 */
export function logFoundationSurface(surfaceConfig) {
    if (!isOn("LOG_FOUNDATION_SURFACE"))
        return;
    try {
        safeLog("[Foundation] surface config:", summarizeFoundationSurface(surfaceConfig));
    }
    catch (err) {
        safeLog("[Foundation] surface log error:", err);
    }
}
/**
 * Foundation summary: plates and boundary type counts (compact).
 * Accepts a WorldModel-like object (so callers can pass the singleton).
 * No-op if LOG_FOUNDATION_SUMMARY disabled.
 * @param {{isEnabled?:()=>boolean,plateId?:Int16Array,boundaryType?:Uint8Array,boundaryCloseness?:Uint8Array,upliftPotential?:Uint8Array, riftPotential?:Uint8Array}} WorldModel
 */
export function logFoundationSummary(WorldModel) {
    if (!isOn("LOG_FOUNDATION_SUMMARY"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][foundation] WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        const size = Math.max(0, width * height) | 0;
        const plateId = WorldModel.plateId;
        const bType = WorldModel.boundaryType;
        const bClose = WorldModel.boundaryCloseness;
        const uplift = WorldModel.upliftPotential;
        const rift = WorldModel.riftPotential;
        if (!plateId || !bType || !bClose) {
            safeLog("[DEV][foundation] Missing core fields; skipping summary.");
            return;
        }
        const plates = new Set();
        const btCounts = [0, 0, 0, 0]; // none, convergent, divergent, transform
        let boundaryTiles = 0;
        const n = Math.min(size, plateId.length, bType.length, bClose.length);
        for (let i = 0; i < n; i++) {
            plates.add(plateId[i]);
            const bt = bType[i] | 0;
            if (bt >= 0 && bt < btCounts.length)
                btCounts[bt]++;
            if ((bClose[i] | 0) > 32)
                boundaryTiles++;
        }
        function avgByte(arr) {
            if (!arr || !arr.length)
                return 0;
            const m = Math.min(arr.length, size || arr.length);
            let s = 0;
            for (let i = 0; i < m; i++)
                s += arr[i] | 0;
            return Math.round(s / Math.max(1, m));
        }
        const summary = {
            width,
            height,
            plates: plates.size,
            boundaryTiles,
            boundaryTypes: {
                none: btCounts[0] | 0,
                convergent: btCounts[1] | 0,
                divergent: btCounts[2] | 0,
                transform: btCounts[3] | 0,
            },
            upliftAvg: uplift ? avgByte(uplift) : null,
            riftAvg: rift ? avgByte(rift) : null,
        };
        safeLog("[DEV][foundation] summary:", summary);
    }
    catch (err) {
        safeLog("[DEV][foundation] summary error:", err);
    }
}
/**
 * Foundation histograms for uplift/rift potentials. Optionally restrict samples
 * to tiles included in provided tag sets (Orogeny belts or Rift lines).
 * No-op if FOUNDATION_HISTOGRAMS disabled.
 * @param {{isEnabled?:()=>boolean,upliftPotential?:Uint8Array, riftPotential?:Uint8Array}} WorldModel
 * @param {{riftSet?:Set<string>, beltSet?:Set<string>, bins?:number}} [opts]
 */
export function logFoundationHistograms(WorldModel, opts = {}) {
    if (!isOn("FOUNDATION_HISTOGRAMS"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][foundation] hist: WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        const size = Math.max(0, width * height) | 0;
        const uplift = WorldModel.upliftPotential;
        const rift = WorldModel.riftPotential;
        if (!uplift || !rift) {
            safeLog("[DEV][foundation] hist: Missing fields (uplift/rift).");
            return;
        }
        const bins = Math.max(5, Math.min(50, opts.bins | 0 || 10));
        const histAll = (arr) => {
            const h = new Array(bins).fill(0);
            const n = Math.min(arr.length, size || arr.length);
            let samples = 0;
            for (let i = 0; i < n; i++) {
                const v = arr[i] | 0; // 0..255
                const bi = Math.min(bins - 1, Math.floor((v / 256) * bins));
                h[bi]++;
                samples++;
            }
            return { h, samples };
        };
        const histMasked = (arr, maskSet) => {
            if (!maskSet || !(maskSet instanceof Set) || maskSet.size === 0)
                return null;
            const h = new Array(bins).fill(0);
            let samples = 0;
            // Scan grid once; test membership by tile key
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const key = `${x},${y}`;
                    if (!maskSet.has(key))
                        continue;
                    const i = y * width + x;
                    const v = arr[i] | 0;
                    const bi = Math.min(bins - 1, Math.floor((v / 256) * bins));
                    h[bi]++;
                    samples++;
                }
            }
            return { h, samples };
        };
        const pct = (h, total) => h.map((c) => ((c / Math.max(1, total)) * 100).toFixed(1) + "%");
        const aU = histAll(uplift);
        const aR = histAll(rift);
        safeLog("[DEV][foundation] uplift (all) hist:", pct(aU.h, aU.samples));
        safeLog("[DEV][foundation] rift   (all) hist:", pct(aR.h, aR.samples));
        // Optional masked histograms near tags
        const mUrift = histMasked(uplift, opts.riftSet);
        const mRrift = histMasked(rift, opts.riftSet);
        if (mUrift && mRrift) {
            safeLog("[DEV][foundation] uplift (near riftLine) hist:", pct(mUrift.h, mUrift.samples));
            safeLog("[DEV][foundation] rift   (near riftLine) hist:", pct(mRrift.h, mRrift.samples));
        }
        const mUbelts = histMasked(uplift, opts.beltSet);
        const mRbelts = histMasked(rift, opts.beltSet);
        if (mUbelts && mRbelts) {
            safeLog("[DEV][foundation] uplift (near orogeny belts) hist:", pct(mUbelts.h, mUbelts.samples));
            safeLog("[DEV][foundation] rift   (near orogeny belts) hist:", pct(mRbelts.h, mRbelts.samples));
        }
    }
    catch (err) {
        safeLog("[DEV][foundation] hist error:", err);
    }
}
const ASCII_GRID_LAYOUT = {
    basePadding: {
        left: " ",
        right: " ",
    },
    overlayPadding: {
        left: " ",
        right: " ",
    },
};
const ASCII_FOUNDATION_CHARS = {
    base: {
        water: "~",
        land: ".",
    },
    overlay: {
        convergent: "^",
        divergent: "_",
        transform: "#",
        boundary: " ",
    },
};
const ASCII_CORRIDOR_CHARS = {
    base: {
        water: "~",
        land: ".",
    },
    overlays: {
        seaLane: "S",
        islandHop: "I",
        riverChain: "R",
        landOpen: "L",
    },
};
export const ASCII_DISPLAY = {
    grid: ASCII_GRID_LAYOUT,
    foundation: ASCII_FOUNDATION_CHARS,
    corridor: ASCII_CORRIDOR_CHARS,
};
/**
 * ASCII snapshot of terrain with optional plate-boundary overlay.
 * Prints a base map (water/mountains/hills/volcanoes) and a second map where
 * boundary tiles are annotated with their type (C=convergent, R=rift/divergent,
 * T=transform, +=boundary/no type).
 * @param {{isEnabled?:()=>boolean,boundaryCloseness?:Uint8Array,boundaryType?:Uint8Array}} WorldModel
 * @param {{step?:number,boundaryThreshold?:number}} [opts]
 */
export function logFoundationAscii(WorldModel, opts = {}) {
    if (!isOn("LOG_FOUNDATION_ASCII"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][foundation] ascii: WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog("[DEV][foundation] ascii: No map bounds; skipping overlay.");
            return;
        }
        const boundaryCloseness = WorldModel.boundaryCloseness;
        const boundaryType = WorldModel.boundaryType;
        if (!boundaryCloseness || !boundaryType) {
            safeLog("[DEV][foundation] ascii: Missing boundary data.");
            return;
        }
        const size = width * height;
        const boundaryLen = Math.min(size, boundaryCloseness.length, boundaryType.length);
        if (!boundaryLen) {
            safeLog("[DEV][foundation] ascii: Boundary arrays empty.");
            return;
        }
        const sampleStep = computeAsciiSampleStep(width, height, opts.step);
        const thresholdRatio = typeof opts.boundaryThreshold === "number"
            ? Math.max(0, Math.min(1, opts.boundaryThreshold))
            : 0.65;
        const closenessCutoff = Math.round(thresholdRatio * 255);
        const asciiChars = ASCII_DISPLAY.foundation;
        const baseWater = asciiChars.base.water;
        const baseLand = asciiChars.base.land;
        const overlays = asciiChars.overlay;
        const rows = renderAsciiGrid(width, height, sampleStep, (x, y) => {
            const idx = y * width + x;
            const close = idx < boundaryLen ? boundaryCloseness[idx] | 0 : 0;
            const isBoundary = close >= closenessCutoff;
            const base = GameplayMap?.isWater?.(x, y) ? baseWater : baseLand;
            if (!isBoundary)
                return { base };
            const bType = boundaryType[idx] | 0;
            const overlay = bType === 1
                ? overlays.convergent
                : bType === 2
                    ? overlays.divergent
                    : bType === 3
                        ? overlays.transform
                        : overlays.boundary;
            return { base, overlay };
        });
        safeLog(`[DEV][foundation] ascii plates (step=${sampleStep}): base ${legendBasePair(baseWater)} ocean, ${legendBasePair(baseLand)} land; overlays ${overlays.convergent} convergent, ${overlays.divergent} divergent, ${overlays.transform} transform, ${overlays.boundary} boundary/unknown`);
        rows.forEach((row) => safeLog(row));
    }
    catch (err) {
        safeLog("[DEV][foundation] ascii error:", err);
    }
}

export function logLandmassAscii(label = "landmass", opts = {}) {
    if (!isOn("LOG_LANDMASS_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][landmass] dump ${label}: No map bounds.`);
            return;
        }
        safeLog(`[DEV][landmass] dump ${label}: delegating to base-standard dumpContinents()`);
        dumpContinents(width, height);
    }
    catch (err) {
        safeLog(`[DEV][landmass] dump ${label} error:`, err);
    }
}

export function logTerrainReliefAscii(label = "relief") {
    if (!isOn("LOG_RELIEF_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][relief] dump ${label}: No map bounds.`);
            return;
        }
        safeLog(`[DEV][relief] dump ${label}: delegating to base-standard dumpTerrain()`);
        dumpTerrain(width, height);
    }
    catch (err) {
        safeLog(`[DEV][relief] dump ${label} error:`, err);
    }
}

export function logRainfallAscii(label = "rainfall") {
    if (!isOn("LOG_RAINFALL_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][rain] dump ${label}: No map bounds.`);
            return;
        }
        safeLog(`[DEV][rain] dump ${label}: delegating to base-standard dumpRainfall()`);
        dumpRainfall(width, height);
    }
    catch (err) {
        safeLog(`[DEV][rain] dump ${label} error:`, err);
    }
}

export function logBiomeAscii(label = "biomes") {
    if (!isOn("LOG_BIOME_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][biome] dump ${label}: No map bounds.`);
            return;
        }
        safeLog(`[DEV][biome] dump ${label}: delegating to base-standard dumpBiomes()`);
        dumpBiomes(width, height);
    }
    catch (err) {
        safeLog(`[DEV][biome] dump ${label} error:`, err);
    }
}
/**
 * Quantitative boundary diagnostics (coverage, closeness bands, terrain overlays).
 * @param {{isEnabled?:()=>boolean,boundaryType?:Uint8Array,boundaryCloseness?:Uint8Array}} WorldModel
 * @param {{bins?:number,thresholds?:number[],stage?:string}} [opts]
 */
export function logBoundaryMetrics(WorldModel, opts = {}) {
    if (!isOn("LOG_BOUNDARY_METRICS"))
        return;
    try {
        const enabled = !!WorldModel && typeof WorldModel.isEnabled === "function" && !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][foundation] metrics: WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog("[DEV][foundation] metrics: No map bounds.");
            return;
        }
        const boundaryType = WorldModel.boundaryType;
        const boundaryCloseness = WorldModel.boundaryCloseness;
        if (!boundaryType || !boundaryCloseness) {
            safeLog("[DEV][foundation] metrics: Missing boundary arrays.");
            return;
        }
        const bins = Math.max(3, Math.min(40, Number.isFinite(opts.bins) ? Math.trunc(opts.bins) : 10));
        const thresholds = Array.isArray(opts.thresholds) && opts.thresholds.length
            ? opts.thresholds.map((t) => Math.max(0, Math.min(1, Number(t)))).sort((a, b) => a - b)
            : [0.35, 0.6];
        const stage = opts.stage ? ` (${String(opts.stage)})` : "";

        const hist = new Array(bins).fill(0);
        const counts = [0, 0, 0, 0];
        const thresholdHits = thresholds.map(() => 0);
        const mountainByType = [0, 0, 0, 0];
        const hillByType = [0, 0, 0, 0];
        const volcanoByType = [0, 0, 0, 0];
        const mountainByBand = thresholds.map(() => 0);
        const hillByBand = thresholds.map(() => 0);
        const volcanoByBand = thresholds.map(() => 0);

        let mountains = 0;
        let hills = 0;
        let volcanoes = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const closeness = (boundaryCloseness[i] | 0) / 255;
                const bType = boundaryType[i] | 0;
                if (bType >= 0 && bType < counts.length)
                    counts[bType]++;
                const bin = Math.min(bins - 1, Math.floor(closeness * bins));
                hist[bin]++;
                thresholds.forEach((t, idx) => {
                    if (closeness >= t)
                        thresholdHits[idx]++;
                });

                const isMountain = !!GameplayMap.isMountain?.(x, y);
                const terrainType = GameplayMap.getTerrainType?.(x, y) ?? -1;
                const featureType = GameplayMap.getFeatureType?.(x, y) ?? -1;

                if (isMountain) {
                    mountains++;
                    if (bType >= 0 && bType < mountainByType.length)
                        mountainByType[bType]++;
                    thresholds.forEach((t, idx) => {
                        if (closeness >= t)
                            mountainByBand[idx]++;
                    });
                } else if (terrainType === globals.g_HillTerrain) {
                    hills++;
                    if (bType >= 0 && bType < hillByType.length)
                        hillByType[bType]++;
                    thresholds.forEach((t, idx) => {
                        if (closeness >= t)
                            hillByBand[idx]++;
                    });
                }
                if (featureType === globals.g_VolcanoFeature) {
                    volcanoes++;
                    if (bType >= 0 && bType < volcanoByType.length)
                        volcanoByType[bType]++;
                    thresholds.forEach((t, idx) => {
                        if (closeness >= t)
                            volcanoByBand[idx]++;
                    });
                }
            }
        }

        const totalTiles = Math.min(boundaryType.length, boundaryCloseness.length, width * height);
        const pct = (value, total) => total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";

        safeLog(`[DEV][foundation] metrics${stage}: counts`, {
            totalTiles,
            none: counts[0],
            convergent: counts[1],
            divergent: counts[2],
            transform: counts[3],
        });
        safeLog("[DEV][foundation] metrics: share", {
            convergent: pct(counts[1], totalTiles),
            divergent: pct(counts[2], totalTiles),
            transform: pct(counts[3], totalTiles),
        });
        safeLog("[DEV][foundation] metrics: closeness histogram", hist.map((count, idx) => ({ bin: idx, count })));
        thresholds.forEach((t, idx) => {
            safeLog(`[DEV][foundation] metrics: closeness >= ${t.toFixed(2)}`, {
                tiles: thresholdHits[idx],
                share: pct(thresholdHits[idx], totalTiles),
            });
        });
        safeLog("[DEV][foundation] metrics: mountains", {
            total: mountains,
            none: mountainByType[0],
            convergent: mountainByType[1],
            divergent: mountainByType[2],
            transform: mountainByType[3],
        });
        safeLog("[DEV][foundation] metrics: hills", {
            total: hills,
            none: hillByType[0],
            convergent: hillByType[1],
            divergent: hillByType[2],
            transform: hillByType[3],
        });
        safeLog("[DEV][foundation] metrics: volcanoes", {
            total: volcanoes,
            none: volcanoByType[0],
            convergent: volcanoByType[1],
            divergent: volcanoByType[2],
            transform: volcanoByType[3],
        });
        thresholds.forEach((t, idx) => {
            safeLog(`[DEV][foundation] metrics: >=${t.toFixed(2)} overlays`, {
                mountains: mountainByBand[idx],
                hills: hillByBand[idx],
                volcanoes: volcanoByBand[idx],
            });
        });
    }
    catch (err) {
        safeLog("[DEV][foundation] metrics error:", err);
    }
}
/**
 * Log a coarse ASCII overlay of corridor tags (downsampled).
 * Legend:
 * Legend:
 *  - S: corridorSeaLane (protected open water)
 *  - I: corridorIslandHop (hotspot arcs over water)
 *  - R: corridorRiverChain (river-adjacent land)
 *  - L: corridorLandOpen (open land lanes)
 *  - ~: water (no corridor)
 *  - .: land (no corridor)
 * The overlay samples every `step` tiles to keep output compact on Huge maps.
 * @param {number} [step=8] sampling stride in tiles
 */
export function logCorridorAsciiOverlay(step = 8) {
    if (!isOn("LOG_CORRIDOR_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog("[DEV][corridor] No map bounds; skipping ASCII overlay.");
            return;
        }
        const s = computeAsciiSampleStep(width, height, step);
        const asciiChars = ASCII_DISPLAY.corridor;
        const baseWater = asciiChars.base.water;
        const baseLand = asciiChars.base.land;
        const overlayChars = asciiChars.overlays;
        safeLog(`[DEV][corridor] ASCII overlay (step=${s}): base ${legendBasePair(baseWater)} ocean, ${legendBasePair(baseLand)} land; overlays ${overlayChars.seaLane} sea-lane, ${overlayChars.islandHop} island-hop, ${overlayChars.landOpen} land-open, ${overlayChars.riverChain} river-chain`);
        const rows = renderAsciiGrid(width, height, s, (x, y) => {
            const base = GameplayMap?.isWater?.(x, y) ? baseWater : baseLand;
            const key = `${x},${y}`;
            const overlays = [
                StoryTags?.corridorSeaLane?.has?.(key) ? overlayChars.seaLane : null,
                StoryTags?.corridorIslandHop?.has?.(key) ? overlayChars.islandHop : null,
                StoryTags?.corridorRiverChain?.has?.(key) ? overlayChars.riverChain : null,
                StoryTags?.corridorLandOpen?.has?.(key) ? overlayChars.landOpen : null,
            ].filter(Boolean);
            const overlay = overlays.length ? overlays[0] : null;
            return overlay ? { base, overlay } : { base };
        });
        rows.forEach((row) => safeLog(row));
    }
    catch (err) {
        safeLog("[DEV][corridor] ASCII overlay error:", err);
    }
}

function computeAsciiSampleStep(width, height, requested) {
    if (Number.isFinite(requested))
        return Math.max(1, Math.trunc(requested));
    const targetCols = 72;
    const targetRows = 48;
    const stepX = width > targetCols ? Math.floor(width / targetCols) : 1;
    const stepY = height > targetRows ? Math.floor(height / targetRows) : 1;
    const step = Math.max(1, Math.min(stepX || 1, stepY || 1));
    return step;
}

function renderAsciiGrid(width, height, sampleStep, cellFn) {
    const step = Math.max(1, sampleStep | 0);
    const rows = [];
    for (let y = 0; y < height; y += step) {
        let row = "";
        for (let x = 0; x < width; x += step) {
            const cell = cellFn(x, y) || {};
            row += asciiCell(cell.base, cell.overlay);
        }
        rows.push(row);
    }
    return rows;
}

function asciiCell(base, overlay) {
    const baseChar = typeof base === "string" && base.length ? base[0] : ".";
    const center = typeof overlay === "string" && overlay.length ? overlay[0] : baseChar;
    const grid = ASCII_DISPLAY.grid ?? {};
    const padding = (overlay ? grid.overlayPadding : grid.basePadding) || grid.basePadding || { left: "", right: "" };
    const left = padding.left ?? "";
    const right = padding.right ?? left;
    return `${left}${center}${right}`;
}

function legendBasePair(baseChar) {
    const c = typeof baseChar === "string" && baseChar.length ? baseChar[0] : ".";
    const grid = ASCII_DISPLAY.grid ?? {};
    const padding = grid.basePadding || { left: "", right: "" };
    const left = padding.left ?? "";
    const right = padding.right ?? left;
    return `${left}${c}${right}`;
}

function summarizeFoundationSeedConfig(cfg) {
    const seedCfg = typeof cfg === "object" && cfg ? cfg : {};
    const summary = {
        mode: seedCfg.mode ?? "engine",
        fixed: seedCfg.fixed ?? null,
        offset: seedCfg.offset ?? 0,
        manifestHash: seedCfg.manifestHash ?? null,
    };
    if (seedCfg.offsets && typeof seedCfg.offsets === "object") {
        const offsets = {};
        for (const key of Object.keys(seedCfg.offsets)) {
            const value = seedCfg.offsets[key];
            if (value != null)
                offsets[key] = value;
        }
        if (Object.keys(offsets).length > 0)
            summary.offsets = offsets;
    }
    return summary;
}

function summarizePlateSeed(plateSeed) {
    if (!plateSeed || typeof plateSeed !== "object")
        return { available: false };
    const summary = { available: true };
    const width = plateSeed.width ?? plateSeed.mapWidth;
    const height = plateSeed.height ?? plateSeed.mapHeight;
    if (width != null)
        summary.width = width;
    if (height != null)
        summary.height = height;
    const sites = Array.isArray(plateSeed.sites)
        ? plateSeed.sites
        : Array.isArray(plateSeed.siteCoords)
            ? plateSeed.siteCoords
            : null;
    if (sites)
        summary.siteCount = sites.length;
    if (plateSeed.seed != null)
        summary.seed = plateSeed.seed;
    if (plateSeed.seedOffset != null)
        summary.seedOffset = plateSeed.seedOffset;
    if (plateSeed.timestamp != null)
        summary.timestamp = plateSeed.timestamp;
    const rngState = plateSeed.rngState ?? plateSeed.randomState ?? null;
    if (rngState)
        summary.rngState = summarizeRngState(rngState);
    return summary;
}

function summarizeFoundationPlates(cfg) {
    if (!cfg || typeof cfg !== "object")
        return {};
    const summary = pickFields(cfg, [
        "seedMode",
        "count",
        "convergenceMix",
        "relaxationSteps",
        "seedJitter",
        "interiorSmooth",
        "plateRotationMultiple",
        "seedOffset",
    ]) || {};
    if (Array.isArray(cfg.axisAngles) && cfg.axisAngles.length)
        summary.axisAngles = cfg.axisAngles.slice(0, 3);
    return summary;
}

function summarizeFoundationDynamics(cfg) {
    if (!cfg || typeof cfg !== "object")
        return {};
    const wind = pickFields(cfg.wind, ["jetStreaks", "jetStrength", "variance", "coriolisZonalScale"]);
    const currents = pickFields(cfg.currents, ["basinGyreCountMax", "westernBoundaryBias", "currentStrength"]);
    const mantle = pickFields(cfg.mantle, ["bumps", "amplitude", "scale"]);
    const directionality = summarizeDirectionality(cfg.directionality);
    const out = {};
    if (wind)
        out.wind = wind;
    if (currents)
        out.currents = currents;
    if (mantle)
        out.mantle = mantle;
    if (directionality)
        out.directionality = directionality;
    return out;
}

function summarizeDirectionality(cfg) {
    if (!cfg || typeof cfg !== "object")
        return null;
    const out = {};
    if (cfg.cohesion != null)
        out.cohesion = cfg.cohesion;
    const primaryAxes = pickFields(cfg.primaryAxes, ["plateAxisDeg", "windBiasDeg", "currentBiasDeg"]);
    if (primaryAxes)
        out.primaryAxes = primaryAxes;
    const interplay = pickFields(cfg.interplay, [
        "windsFollowPlates",
        "currentsFollowWinds",
        "riftsFollowPlates",
        "orogenyOpposesRifts",
    ]);
    if (interplay)
        out.interplay = interplay;
    const hemispheres = pickFields(cfg.hemispheres, ["southernFlip", "equatorBandDeg", "monsoonBias"]);
    if (hemispheres)
        out.hemispheres = hemispheres;
    const variability = pickFields(cfg.variability, ["angleJitterDeg", "magnitudeVariance", "seedOffset"]);
    if (variability)
        out.variability = variability;
    return Object.keys(out).length ? out : null;
}

function summarizeFoundationSurface(cfg) {
    if (!cfg || typeof cfg !== "object")
        return {};
    const out = {};
    const landmass = pickFields(cfg.landmass, [
        "baseWaterPercent",
        "waterThumbOnScale",
        "jitterAmpFracBase",
        "jitterAmpFracScale",
        "curveAmpFrac",
    ]);
    if (landmass) {
        const post = pickFields(cfg.landmass?.geometry?.post, [
            "expandTiles",
            "expandWestTiles",
            "expandEastTiles",
            "clampWestMin",
            "clampEastMax",
            "minWidthTiles",
            "overrideSouth",
            "overrideNorth",
        ]);
        if (post)
            landmass.geometryPost = post;
        out.landmass = landmass;
    }
    const oceanSeparation = summarizeOceanSeparation(cfg.oceanSeparation);
    if (oceanSeparation)
        out.oceanSeparation = oceanSeparation;
    if (cfg.overrides && typeof cfg.overrides === "object") {
        const overrideKeys = Object.keys(cfg.overrides);
        if (overrideKeys.length)
            out.overrides = { count: overrideKeys.length };
    }
    return out;
}

function summarizeOceanSeparation(cfg) {
    if (!cfg || typeof cfg !== "object")
        return null;
    const out = pickFields(cfg, [
        "enabled",
        "baseSeparationTiles",
        "boundaryClosenessMultiplier",
        "maxPerRowDelta",
        "respectSeaLanes",
        "minChannelWidth",
    ]) || {};
    if (Array.isArray(cfg.bandPairs))
        out.bandPairs = cfg.bandPairs.length;
    if (cfg.edgeWest && cfg.edgeWest.enabled)
        out.edgeWest = pickFields(cfg.edgeWest, ["baseTiles", "boundaryClosenessMultiplier", "maxPerRowDelta"]);
    if (cfg.edgeEast && cfg.edgeEast.enabled)
        out.edgeEast = pickFields(cfg.edgeEast, ["baseTiles", "boundaryClosenessMultiplier", "maxPerRowDelta"]);
    return Object.keys(out).length ? out : null;
}

function summarizeRngState(state) {
    if (!state || typeof state !== "object")
        return state ?? null;
    const keys = Object.keys(state);
    if (!keys.length)
        return {};
    const summary = {};
    const limit = 4;
    for (let i = 0; i < Math.min(limit, keys.length); i++) {
        const key = keys[i];
        summary[key] = state[key];
    }
    if (keys.length > limit)
        summary.truncatedKeys = keys.length - limit;
    return summary;
}

function pickFields(src, fields) {
    if (!src || typeof src !== "object")
        return null;
    const out = {};
    for (const key of fields) {
        if (Object.prototype.hasOwnProperty.call(src, key) && src[key] != null) {
            out[key] = src[key];
        }
    }
    return Object.keys(out).length ? out : null;
}

/* ----------------------- internal helpers ----------------------- */
function safeLog(...args) {
    try {
        console.log(...args);
    }
    catch (_) {
        /* no-op */
    }
}
function nowMs() {
    try {
        // Prefer high-resolution timer when available
        // @ts-ignore
        if (typeof performance !== "undefined" &&
            typeof performance.now === "function")
            return performance.now();
    }
    catch (_) {
        /* ignore */
    }
    return Date.now();
}
function fmtMs(ms) {
    // Format as e.g. "12.34 ms"
    const n = typeof ms === "number" ? ms : Number(ms) || 0;
    return `${n.toFixed(2)} ms`;
}
function sizeOf(setLike) {
    if (!setLike)
        return 0;
    if (typeof setLike.size === "number")
        return setLike.size;
    try {
        return Array.isArray(setLike) ? setLike.length : 0;
    }
    catch {
        return 0;
    }
}
function clampTo(v, lo, hi) {
    if (v < lo)
        return lo;
    if (v > hi)
        return hi;
    return v;
}
export default {
    DEV,
    devLog,
    devLogIf,
    timeSection,
    timeStart,
    timeEnd,
    logStoryTagsSummary,
    logRainfallHistogram,
    logRainfallStats,
    logFoundationSummary,
    logFoundationHistograms,
    logFoundationAscii,
    logBoundaryMetrics,
    logBiomeSummary,
    ASCII_DISPLAY,
};
