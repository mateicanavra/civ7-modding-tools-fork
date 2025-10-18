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
import { DEV_LOG_CFG as __DEV_CFG__ } from "./resolved.js";
export const DEV = {
    ENABLED: true, // Master switch — must be true for any dev logging
    LOG_TIMING: true, // Log per-section timings (timeSection / timeStart/timeEnd)
    LOG_STORY_TAGS: true, // Log StoryTags summary counts
    RAINFALL_HISTOGRAM: true, // Log a coarse rainfall histogram (non-water tiles only)
    LOG_CORRIDOR_ASCII: true, // Print a coarse ASCII overlay of corridor tags (downsampled)
    LOG_WORLDMODEL_SUMMARY: false, // Print compact WorldModel summary when available
    LOG_WORLDMODEL_ASCII: true, // ASCII visualization of plate boundaries & terrain mix
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
        const sampleStep = (() => {
            if (Number.isFinite(opts.step))
                return Math.max(1, Math.trunc(opts.step));
            return 1; // match base ASCII dumps (full resolution)
        })();
        const thresholdRatio = typeof opts.boundaryThreshold === "number"
            ? Math.max(0, Math.min(1, opts.boundaryThreshold))
            : 0.65;
        const closenessCutoff = Math.round(thresholdRatio * 255);
        const isWater = typeof GameplayMap?.isWater === "function"
            ? (x, y) => GameplayMap.isWater(x, y)
            : () => false;
        const rows = [];
        for (let y = 0; y < height; y += sampleStep) {
            let combinedRow = "";
            for (let x = 0; x < width; x += sampleStep) {
                const i = y * width + x;
                const close = i < boundaryLen ? boundaryCloseness[i] | 0 : 0;
                const isBoundary = close >= closenessCutoff;
                const background = (() => {
                    // if (isWater(x, y))
                    //     return [" ", "~", " "];
                    return [" ", "~"];
                })();
                if (isBoundary) {
                    const bType = boundaryType[i] | 0;
                    let symbol = bType === 1
                        ? "^"
                        : bType === 2
                            ? "~"
                            : bType === 3
                                ? "#"
                                : "@";
                    background[1] = symbol;
                }
                combinedRow += background.join("");
            }
            rows.push(combinedRow);
        }
        safeLog(`[DEV][wm] ascii plates (step=${sampleStep}): background ~ water, . land, spaces = boundary; overlay + convergent, - rift, # transform, @ boundary/unknown`);
        for (const row of rows)
            safeLog(row);
    }
    catch (err) {
        safeLog("[DEV][wm] ascii error:", err);
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
        const s = Math.max(1, step | 0);
        safeLog("[DEV][corridor] ASCII overlay (step=", s, "): S=SeaLane, I=IslandHop, L=LandOpen, R=RiverChain, ~=water, .=land");
        for (let y = 0; y < height; y += s) {
            let row = "";
            for (let x = 0; x < width; x += s) {
                const k = `${x},${y}`;
                const isWater = !!GameplayMap.isWater?.(x, y);
                const cS = !!StoryTags?.corridorSeaLane &&
                    !!StoryTags.corridorSeaLane.has?.(k);
                const cI = !!StoryTags?.corridorIslandHop &&
                    !!StoryTags.corridorIslandHop.has?.(k);
                const cL = !!StoryTags?.corridorLandOpen &&
                    !!StoryTags.corridorLandOpen.has?.(k);
                const cR = !!StoryTags?.corridorRiverChain &&
                    !!StoryTags.corridorRiverChain.has?.(k);
                let ch = isWater ? "~" : ".";
                if (isWater && cS)
                    ch = "S";
                else if (isWater && cI)
                    ch = "I";
                else if (!isWater && cR)
                    ch = "R";
                else if (!isWater && cL)
                    ch = "L";
                row += ch;
            }
            safeLog(row);
        }
    }
    catch (err) {
        safeLog("[DEV][corridor] ASCII overlay error:", err);
    }
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
};
