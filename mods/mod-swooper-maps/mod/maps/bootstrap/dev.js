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
import { DEV_LOG_CFG as __DEV_CFG__ } from "./resolved.js";
export const DEV = {
    ENABLED: true, // Master switch — must be true for any dev logging
    LOG_TIMING: true, // Log per-section timings (timeSection / timeStart/timeEnd)
    LOG_STORY_TAGS: true, // Log StoryTags summary counts
    RAINFALL_HISTOGRAM: true, // Log a coarse rainfall histogram (non-water tiles only)
    LOG_CORRIDOR_ASCII: true, // Print a coarse ASCII overlay of corridor tags (downsampled)
    LOG_WORLDMODEL_SUMMARY: false, // Print compact WorldModel summary when available
    LOG_WORLDMODEL_ASCII: true, // ASCII visualization of plate boundaries & terrain mix
    LOG_LANDMASS_ASCII: true, // ASCII snapshot of land vs. ocean bands/continents
    LOG_RELIEF_ASCII: true, // ASCII visualization of major relief (mountains/hills/volcanoes)
    LOG_RAINFALL_ASCII: true, // ASCII heatmap buckets for rainfall bands
    LOG_BIOME_ASCII: true, // ASCII biome classification overlay
    LOG_BOUNDARY_METRICS: false, // Quantitative summary of plate boundary coverage
    WORLDMODEL_HISTOGRAMS: false, // Print histograms for rift/uplift (optionally near tags)
    LAYER_COUNTS: false, // Reserved for layer-specific counters (if used by callers)
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
        if ("LOG_CORRIDOR_ASCII" in __cfg)
            DEV.LOG_CORRIDOR_ASCII = !!__cfg.LOG_CORRIDOR_ASCII;
        if ("LOG_WORLDMODEL_SUMMARY" in __cfg)
            DEV.LOG_WORLDMODEL_SUMMARY = !!__cfg.LOG_WORLDMODEL_SUMMARY;
        if ("LOG_WORLDMODEL_ASCII" in __cfg)
            DEV.LOG_WORLDMODEL_ASCII = !!__cfg.LOG_WORLDMODEL_ASCII;
        if ("LOG_LANDMASS_ASCII" in __cfg)
            DEV.LOG_LANDMASS_ASCII = !!__cfg.LOG_LANDMASS_ASCII;
        if ("LOG_RELIEF_ASCII" in __cfg)
            DEV.LOG_RELIEF_ASCII = !!__cfg.LOG_RELIEF_ASCII;
        if ("LOG_RAINFALL_ASCII" in __cfg)
            DEV.LOG_RAINFALL_ASCII = !!__cfg.LOG_RAINFALL_ASCII;
        if ("LOG_BIOME_ASCII" in __cfg)
            DEV.LOG_BIOME_ASCII = !!__cfg.LOG_BIOME_ASCII;
        if ("LOG_BOUNDARY_METRICS" in __cfg)
            DEV.LOG_BOUNDARY_METRICS = !!__cfg.LOG_BOUNDARY_METRICS;
        if ("WORLDMODEL_HISTOGRAMS" in __cfg)
            DEV.WORLDMODEL_HISTOGRAMS = !!__cfg.WORLDMODEL_HISTOGRAMS;
    }
}
catch (_) {
    /* no-op */
}
function isOn(flag) {
    return !!(DEV && DEV.ENABLED && DEV[flag]);
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
/**
 * WorldModel summary: plates and boundary type counts (compact).
 * Accepts a WorldModel-like object (so callers can pass the singleton).
 * No-op if LOG_WORLDMODEL_SUMMARY disabled.
 * @param {{isEnabled?:()=>boolean,plateId?:Int16Array,boundaryType?:Uint8Array,boundaryCloseness?:Uint8Array,upliftPotential?:Uint8Array, riftPotential?:Uint8Array}} WorldModel
 */
export function logWorldModelSummary(WorldModel) {
    if (!isOn("LOG_WORLDMODEL_SUMMARY"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][wm] WorldModel disabled or unavailable.");
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
            safeLog("[DEV][wm] Missing core fields; skipping summary.");
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
        safeLog("[DEV][wm] summary:", summary);
    }
    catch (err) {
        safeLog("[DEV][wm] summary error:", err);
    }
}
/**
 * WorldModel histograms for uplift/rift potentials. Optionally restrict samples
 * to tiles included in provided tag sets (Orogeny belts or Rift lines).
 * No-op if WORLDMODEL_HISTOGRAMS disabled.
 * @param {{isEnabled?:()=>boolean,upliftPotential?:Uint8Array, riftPotential?:Uint8Array}} WorldModel
 * @param {{riftSet?:Set<string>, beltSet?:Set<string>, bins?:number}} [opts]
 */
export function logWorldModelHistograms(WorldModel, opts = {}) {
    if (!isOn("WORLDMODEL_HISTOGRAMS"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][wm] hist: WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        const size = Math.max(0, width * height) | 0;
        const uplift = WorldModel.upliftPotential;
        const rift = WorldModel.riftPotential;
        if (!uplift || !rift) {
            safeLog("[DEV][wm] hist: Missing fields (uplift/rift).");
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
        safeLog("[DEV][wm] uplift (all) hist:", pct(aU.h, aU.samples));
        safeLog("[DEV][wm] rift   (all) hist:", pct(aR.h, aR.samples));
        // Optional masked histograms near tags
        const mUrift = histMasked(uplift, opts.riftSet);
        const mRrift = histMasked(rift, opts.riftSet);
        if (mUrift && mRrift) {
            safeLog("[DEV][wm] uplift (near riftLine) hist:", pct(mUrift.h, mUrift.samples));
            safeLog("[DEV][wm] rift   (near riftLine) hist:", pct(mRrift.h, mRrift.samples));
        }
        const mUbelts = histMasked(uplift, opts.beltSet);
        const mRbelts = histMasked(rift, opts.beltSet);
        if (mUbelts && mRbelts) {
            safeLog("[DEV][wm] uplift (near orogeny belts) hist:", pct(mUbelts.h, mUbelts.samples));
            safeLog("[DEV][wm] rift   (near orogeny belts) hist:", pct(mRbelts.h, mRbelts.samples));
        }
    }
    catch (err) {
        safeLog("[DEV][wm] hist error:", err);
    }
}
/**
 * ASCII snapshot of terrain with optional plate-boundary overlay.
 * Prints a base map (water/mountains/hills/volcanoes) and a second map where
 * boundary tiles are annotated with their type (C=convergent, R=rift/divergent,
 * T=transform, +=boundary/no type).
 * @param {{isEnabled?:()=>boolean,boundaryCloseness?:Uint8Array,boundaryType?:Uint8Array}} WorldModel
 * @param {{step?:number,boundaryThreshold?:number}} [opts]
 */
export function logWorldModelAscii(WorldModel, opts = {}) {
    if (!isOn("LOG_WORLDMODEL_ASCII"))
        return;
    try {
        const enabled = !!WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            !!WorldModel.isEnabled();
        if (!enabled) {
            safeLog("[DEV][wm] ascii: WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog("[DEV][wm] ascii: No map bounds; skipping overlay.");
            return;
        }
        const boundaryCloseness = WorldModel.boundaryCloseness;
        const boundaryType = WorldModel.boundaryType;
        if (!boundaryCloseness || !boundaryType) {
            safeLog("[DEV][wm] ascii: Missing boundary data.");
            return;
        }
        const size = width * height;
        const boundaryLen = Math.min(size, boundaryCloseness.length, boundaryType.length);
        if (!boundaryLen) {
            safeLog("[DEV][wm] ascii: Boundary arrays empty.");
            return;
        }
        const sampleStep = computeAsciiSampleStep(width, height, opts.step);
        const thresholdRatio = typeof opts.boundaryThreshold === "number"
            ? Math.max(0, Math.min(1, opts.boundaryThreshold))
            : 0.65;
        const closenessCutoff = Math.round(thresholdRatio * 255);
        const rows = renderAsciiGrid(width, height, sampleStep, (x, y) => {
            const idx = y * width + x;
            const close = idx < boundaryLen ? boundaryCloseness[idx] | 0 : 0;
            const isBoundary = close >= closenessCutoff;
            const base = GameplayMap?.isWater?.(x, y) ? "~" : ".";
            if (!isBoundary)
                return { base };
            const bType = boundaryType[idx] | 0;
            const overlay = bType === 1
                ? "^"
                : bType === 2
                    ? "~"
                    : bType === 3
                        ? "#"
                        : "@";
            return { base, overlay };
        });
        safeLog(`[DEV][wm] ascii plates (step=${sampleStep}): base ~~ ocean, .. land; overlays ^ convergent, ~ divergent, # transform, @ boundary/unknown`);
        rows.forEach((row) => safeLog(row));
    }
    catch (err) {
        safeLog("[DEV][wm] ascii error:", err);
    }
}

export function logLandmassAscii(label = "landmass", opts = {}) {
    if (!isOn("LOG_LANDMASS_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][landmass] ascii ${label}: No map bounds.`);
            return;
        }
        const landMask = ArrayBuffer.isView(opts.landMask) ? opts.landMask : null;
        const maskLen = landMask?.length ?? 0;
        const windows = Array.isArray(opts.windows) ? opts.windows : [];
        const windowInfo = windows.map((win, index) => ({
            data: win,
            symbol: ASCII_WINDOW_SERIES[index % ASCII_WINDOW_SERIES.length],
            continent: win?.continent ?? index,
        }));
        const symbolByContinent = new Map(windowInfo.map((w) => [w.continent, w.symbol]));
        const sampleStep = computeAsciiSampleStep(width, height, opts.step);
        const rows = renderAsciiGrid(width, height, sampleStep, (x, y) => {
            const idx = y * width + x;
            const base = (() => {
                if (landMask && idx < maskLen)
                    return landMask[idx] ? "." : "~";
                return GameplayMap?.isWater?.(x, y) ? "~" : ".";
            })();
            if (!windowInfo.length)
                return { base };
            for (let wi = 0; wi < windowInfo.length; wi++) {
                const win = windowInfo[wi].data;
                if (win &&
                    x >= (win.west ?? 0) &&
                    x <= (win.east ?? width - 1) &&
                    y >= (win.south ?? 0) &&
                    y <= (win.north ?? height - 1)) {
                    const overlay = symbolByContinent.get(windowInfo[wi].continent) ?? windowInfo[wi].symbol;
                    return { base, overlay };
                }
            }
            return { base };
        });
        const legend = windowInfo.length
            ? `; overlays ${windowInfo
                .map((win) => `${win.symbol}=continent${win.continent}`)
                .join(", ")}`
            : "";
        safeLog(`[DEV][landmass] ascii ${label} (step=${sampleStep}): base ~~ ocean, .. land${legend}`);
        rows.forEach((row) => safeLog(row));
    }
    catch (err) {
        safeLog(`[DEV][landmass] ascii ${label} error:`, err);
    }
}

export function logTerrainReliefAscii(label = "relief", opts = {}) {
    if (!isOn("LOG_RELIEF_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][relief] ascii ${label}: No map bounds.`);
            return;
        }
        const sampleStep = computeAsciiSampleStep(width, height, opts.step);
        const rows = renderAsciiGrid(width, height, sampleStep, (x, y) => {
            const base = GameplayMap?.isWater?.(x, y) ? "~" : ".";
            if (base === "~")
                return { base };
            const featureType = GameplayMap?.getFeatureType?.(x, y) ?? -1;
            if (featureType === globals.g_VolcanoFeature)
                return { base, overlay: "V" };
            if (GameplayMap?.isMountain?.(x, y))
                return { base, overlay: "M" };
            const terrainType = GameplayMap?.getTerrainType?.(x, y) ?? -1;
            if (terrainType === globals.g_HillTerrain)
                return { base, overlay: "h" };
            return { base };
        });
        safeLog(`[DEV][relief] ascii ${label} (step=${sampleStep}): base ~~ ocean, .. land; overlays M mountains, h hills, V volcanoes`);
        rows.forEach((row) => safeLog(row));
    }
    catch (err) {
        safeLog(`[DEV][relief] ascii ${label} error:`, err);
    }
}

export function logRainfallAscii(label = "rainfall", opts = {}) {
    if (!isOn("LOG_RAINFALL_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][rain] ascii ${label}: No map bounds.`);
            return;
        }
        const thresholds = Array.isArray(opts.thresholds) && opts.thresholds.length
            ? opts.thresholds
                .map((v) => Math.max(0, Number(v) || 0))
                .sort((a, b) => a - b)
            : [40, 80, 120, 160];
        const symbols = Array.isArray(opts.symbols) && opts.symbols.length
            ? opts.symbols
            : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
        const sampleStep = computeAsciiSampleStep(width, height, opts.step);
        const rows = renderAsciiGrid(width, height, sampleStep, (x, y) => {
            const base = GameplayMap?.isWater?.(x, y) ? "~" : ".";
            if (base === "~")
                return { base };
            const rainfall = GameplayMap?.getRainfall?.(x, y) ?? 0;
            let bucket = 0;
            while (bucket < thresholds.length && rainfall >= thresholds[bucket])
                bucket++;
            const overlay = symbols[Math.min(bucket, symbols.length - 1)] ?? `${bucket}`;
            return { base, overlay };
        });
        const legendSegments = thresholds.map((t, idx) => `${symbols[Math.min(idx, symbols.length - 1)]}<${t}`);
        if (thresholds.length) {
            legendSegments.push(`${symbols[Math.min(thresholds.length, symbols.length - 1)]}≥${thresholds[thresholds.length - 1] ?? 0}`);
        }
        safeLog(`[DEV][rain] ascii ${label} (step=${sampleStep}): base ~~ ocean, .. land; overlays buckets ${legendSegments.join(", ")}`);
        rows.forEach((row) => safeLog(row));
    }
    catch (err) {
        safeLog(`[DEV][rain] ascii ${label} error:`, err);
    }
}

export function logBiomeAscii(label = "biomes", opts = {}) {
    if (!isOn("LOG_BIOME_ASCII"))
        return;
    try {
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog(`[DEV][biome] ascii ${label}: No map bounds.`);
            return;
        }
        const sampleStep = computeAsciiSampleStep(width, height, opts.step);
        const rows = renderAsciiGrid(width, height, sampleStep, (x, y) => {
            const base = GameplayMap?.isWater?.(x, y) ? "~" : ".";
            if (base === "~")
                return { base };
            const biome = GameplayMap?.getBiomeType?.(x, y) ?? -1;
            const overlay = resolveBiomeSymbol(biome);
            return overlay ? { base, overlay } : { base };
        });
        safeLog(`[DEV][biome] ascii ${label} (step=${sampleStep}): base ~~ ocean, .. land; overlays ${BIOME_LEGEND}`);
        rows.forEach((row) => safeLog(row));
    }
    catch (err) {
        safeLog(`[DEV][biome] ascii ${label} error:`, err);
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
            safeLog("[DEV][wm] metrics: WorldModel disabled or unavailable.");
            return;
        }
        const width = GameplayMap?.getGridWidth?.() ?? 0;
        const height = GameplayMap?.getGridHeight?.() ?? 0;
        if (!width || !height) {
            safeLog("[DEV][wm] metrics: No map bounds.");
            return;
        }
        const boundaryType = WorldModel.boundaryType;
        const boundaryCloseness = WorldModel.boundaryCloseness;
        if (!boundaryType || !boundaryCloseness) {
            safeLog("[DEV][wm] metrics: Missing boundary arrays.");
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

        safeLog(`[DEV][wm] metrics${stage}: counts`, {
            totalTiles,
            none: counts[0],
            convergent: counts[1],
            divergent: counts[2],
            transform: counts[3],
        });
        safeLog("[DEV][wm] metrics: share", {
            convergent: pct(counts[1], totalTiles),
            divergent: pct(counts[2], totalTiles),
            transform: pct(counts[3], totalTiles),
        });
        safeLog("[DEV][wm] metrics: closeness histogram", hist.map((count, idx) => ({ bin: idx, count })));
        thresholds.forEach((t, idx) => {
            safeLog(`[DEV][wm] metrics: closeness >= ${t.toFixed(2)}`, {
                tiles: thresholdHits[idx],
                share: pct(thresholdHits[idx], totalTiles),
            });
        });
        safeLog("[DEV][wm] metrics: mountains", {
            total: mountains,
            none: mountainByType[0],
            convergent: mountainByType[1],
            divergent: mountainByType[2],
            transform: mountainByType[3],
        });
        safeLog("[DEV][wm] metrics: hills", {
            total: hills,
            none: hillByType[0],
            convergent: hillByType[1],
            divergent: hillByType[2],
            transform: hillByType[3],
        });
        safeLog("[DEV][wm] metrics: volcanoes", {
            total: volcanoes,
            none: volcanoByType[0],
            convergent: volcanoByType[1],
            divergent: volcanoByType[2],
            transform: volcanoByType[3],
        });
        thresholds.forEach((t, idx) => {
            safeLog(`[DEV][wm] metrics: >=${t.toFixed(2)} overlays`, {
                mountains: mountainByBand[idx],
                hills: hillByBand[idx],
                volcanoes: volcanoByBand[idx],
            });
        });
    }
    catch (err) {
        safeLog("[DEV][wm] metrics error:", err);
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
        safeLog(`[DEV][corridor] ASCII overlay (step=${s}): base ~~ ocean, .. land; overlays S sea-lane, I island-hop, L land-open, R river-chain`);
        const rows = renderAsciiGrid(width, height, s, (x, y) => {
            const base = GameplayMap?.isWater?.(x, y) ? "~" : ".";
            const key = `${x},${y}`;
            const overlays = [
                StoryTags?.corridorSeaLane?.has?.(key) ? "S" : null,
                StoryTags?.corridorIslandHop?.has?.(key) ? "I" : null,
                StoryTags?.corridorRiverChain?.has?.(key) ? "R" : null,
                StoryTags?.corridorLandOpen?.has?.(key) ? "L" : null,
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

const ASCII_WINDOW_SERIES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BIOME_SYMBOL_TABLE = [
    [globals.g_GrasslandBiome, "G", "grassland"],
    [globals.g_PlainsBiome, "P", "plains"],
    [globals.g_DesertBiome, "D", "desert"],
    [globals.g_TropicalBiome, "J", "tropical"],
    [globals.g_TundraBiome, "T", "tundra"],
];
const BIOME_SYMBOLS = new Map(BIOME_SYMBOL_TABLE.map(([id, symbol]) => [id, symbol]));
const BIOME_LEGEND = BIOME_SYMBOL_TABLE.map(([, symbol, label]) => `${symbol}=${label}`).join(", ");

function resolveBiomeSymbol(biomeId) {
    if (biomeId == null)
        return null;
    return BIOME_SYMBOLS.get(biomeId) ?? null;
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
    return `${baseChar}${center}${baseChar}`;
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
    logWorldModelSummary,
    logWorldModelHistograms,
    logWorldModelAscii,
    logBoundaryMetrics,
};
