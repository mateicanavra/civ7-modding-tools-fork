// @ts-nocheck
/**
 * Temperate preset — gentle, trade‑wind world with classic three‑band layout.
 *
 * Purpose
 * - Provide a concise, conservative preset to compose with defaults and/or
 *   per-entry overrides. This is a partial config (no exhaustive fields).
 *
 * Usage (example)
 *   import { TEMPERATE_PRESET } from "./config/presets/temperate.js";
 *   setConfig({
 *     ...TEMPERATE_PRESET,
 *     // Optional overrides...
 *   });
 */

// @ts-check

export const TEMPERATE_PRESET = Object.freeze({
  // Keep all major systems enabled (gentle, cohesive world)
  toggles: Object.freeze({
    STORY_ENABLE_HOTSPOTS: true,
    STORY_ENABLE_RIFTS: true,
    STORY_ENABLE_OROGENY: true,
    STORY_ENABLE_SWATCHES: true,
    STORY_ENABLE_PALEO: true,
    STORY_ENABLE_CORRIDORS: true,
    STORY_ENABLE_WORLDMODEL: true,
  }),

  // Classic three-band layout with slightly wider true oceans (safe navigation)
  landmass: Object.freeze({
    geometry: Object.freeze({
      preset: "classic",
      oceanColumnsScale: 1.1,
    }),
  }),

  // Lightweight Earth Forces with moderated global cohesion
  worldModel: Object.freeze({
    enabled: true,
    directionality: Object.freeze({
      cohesion: 0.6,
      hemispheres: Object.freeze({
        // Slight seasonal/hemispheric asymmetry
        monsoonBias: 0.25,
      }),
    }),
  }),

  // Dev logger defaults (quiet; entries may override during debugging)
  dev: Object.freeze({
    enabled: false,
    logTiming: false,
    logStoryTags: false,
    rainfallHistogram: false,
  }),
});

export default TEMPERATE_PRESET;
