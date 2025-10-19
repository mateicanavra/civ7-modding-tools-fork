// @ts-nocheck
/**
 * Classic preset — baseline three‑band layout with vanilla‑like oceans.
 *
 * Purpose
 * - Provide a named, conservative baseline preset suitable as a starting point
 *   for variants. This preset is intentionally minimal and close to defaults.
 *
 * Usage (example)
 *   import { CLASSIC_PRESET } from "./config/presets/classic.js";
 *   setConfig({
 *     ...CLASSIC_PRESET,
 *     // Optional overrides...
 *   });
 */
// @ts-check
export const CLASSIC_PRESET = Object.freeze({
    stageConfig: Object.freeze({
        foundation: true,
        landmassPlates: true,
    }),
    // Keep all major systems enabled by default
    toggles: Object.freeze({
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
    }),
    // Dev logger defaults (quiet; entries/presets may override for debugging)
    dev: Object.freeze({
        enabled: false,
        logTiming: false,
        logStoryTags: false,
        rainfallHistogram: false,
    }),
});
export default CLASSIC_PRESET;
