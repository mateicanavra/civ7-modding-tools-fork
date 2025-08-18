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
export const DEV = {
    ENABLED: false, // Master switch — must be true for any dev logging
    LOG_TIMING: false, // Log per-section timings (timeSection / timeStart/timeEnd)
    LOG_STORY_TAGS: false, // Log StoryTags summary counts
    RAINFALL_HISTOGRAM: false, // Log a coarse rainfall histogram (non-water tiles only)
    LAYER_COUNTS: false, // Reserved for layer-specific counters (if used by callers)
};

/**
 * Internal: guard that checks if a specific flag is enabled (and master is on).
 * @param {keyof typeof DEV} flag
 * @returns {boolean}
 */
function isOn(flag) {
    return !!(DEV && DEV.ENABLED && DEV[flag]);
}

/**
 * Safe console.log wrapper (no-op if disabled).
 * @param  {...any} args
 */
export function devLog(...args) {
    if (!DEV.ENABLED) return;
    try {
        console.log("[DEV]", ...args);
    } catch (_) {
        /* swallow */
    }
}

/**
 * Conditional console.log wrapper for a specific flag under the master switch.
 * @param {keyof typeof DEV} flag
 * @param  {...any} args
 */
export function devLogIf(flag, ...args) {
    if (!isOn(flag)) return;
    try {
        console.log(`[DEV][${String(flag)}]`, ...args);
    } catch (_) {
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
    if (!isOn("LOG_TIMING")) return fn();
    const t0 = nowMs();
    try {
        return fn();
    } finally {
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
    if (!isOn("LOG_TIMING")) return null;
    return { label, t0: nowMs() };
}

/**
 * End a timing span started by timeStart.
 * Safe to call with null (no-op).
 * @param {{label:string,t0:number}|null} token
 */
export function timeEnd(token) {
    if (!token) return;
    const dt = nowMs() - token.t0;
    safeLog(`[DEV][time] ${token.label}: ${fmtMs(dt)}`);
}

/**
 * Log a compact summary of StoryTags (sizes of known sets).
 * Safe if StoryTags is missing or partially defined.
 * No-op if LOG_STORY_TAGS disabled.
 * @param {{hotspot?:Set<string>,hotspotParadise?:Set<string>,hotspotVolcanic?:Set<string>,riftLine?:Set<string>,riftShoulder?:Set<string>,activeMargin?:Set<string>,passiveShelf?:Set<string>}} StoryTags
 */
export function logStoryTagsSummary(StoryTags) {
    if (!isOn("LOG_STORY_TAGS")) return;
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
    };
    safeLog("[DEV][story] tags:", counts);
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
    if (!isOn("RAINFALL_HISTOGRAM")) return;
    try {
        if (
            typeof GameplayMap?.getRainfall !== "function" ||
            typeof GameplayMap?.isWater !== "function"
        ) {
            safeLog(
                "[DEV][rain] GameplayMap API unavailable; skipping histogram.",
            );
            return;
        }

        const counts = new Array(Math.max(1, Math.min(100, bins))).fill(0);
        let samples = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (GameplayMap.isWater(x, y)) continue;
                const r = clampTo(GameplayMap.getRainfall(x, y), 0, 200);
                const idx = Math.min(
                    counts.length - 1,
                    Math.floor((r / 201) * counts.length),
                );
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
    } catch (err) {
        safeLog("[DEV][rain] histogram error:", err);
    }
}

/* ----------------------- internal helpers ----------------------- */

function safeLog(...args) {
    try {
        console.log(...args);
    } catch (_) {
        /* no-op */
    }
}
function nowMs() {
    try {
        // Prefer high-resolution timer when available
        // @ts-ignore
        if (
            typeof performance !== "undefined" &&
            typeof performance.now === "function"
        )
            return performance.now();
    } catch (_) {
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
    if (!setLike) return 0;
    if (typeof setLike.size === "number") return setLike.size;
    try {
        return Array.isArray(setLike) ? setLike.length : 0;
    } catch {
        return 0;
    }
}
function clampTo(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
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
};
