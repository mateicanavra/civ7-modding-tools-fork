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
  // Keep all major systems enabled by default
  toggles: Object.freeze({
    STORY_ENABLE_HOTSPOTS: true,
    STORY_ENABLE_RIFTS: true,
    STORY_ENABLE_OROGENY: true,
    STORY_ENABLE_SWATCHES: true,
    STORY_ENABLE_PALEO: true,
    STORY_ENABLE_CORRIDORS: true,
    STORY_ENABLE_WORLDMODEL: true,
  }),

  // Classic three-band layout; slightly less ocean widening than "temperate"
  landmass: Object.freeze({
    geometry: Object.freeze({
      preset: "classic",
      oceanColumnsScale: 1.0, // vanilla‑like base; variants may increase this (e.g., 1.1)
    }),
  }),

  // WorldModel is available but uses central defaults for detailed fields
  worldModel: Object.freeze({
    enabled: true,
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
