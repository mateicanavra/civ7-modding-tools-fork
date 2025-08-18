/**
 * @file epic-diverse-huge-map/maps/config/tunables.js
 * @description
 * This module re-exports tunables from the central map_config.js file.
 * It provides a stable, safe interface for the rest of the map script,
 * with fallbacks in case the config file is missing or malformed.
 */

import { MAP_CONFIG } from "./map_config.js";

// --- Master Toggles ---
// Safely extract from config with fallbacks.
const TOGGLES = MAP_CONFIG?.toggles || {};
export const STORY_ENABLE_HOTSPOTS = TOGGLES.STORY_ENABLE_HOTSPOTS ?? true;
export const STORY_ENABLE_RIFTS = TOGGLES.STORY_ENABLE_RIFTS ?? true;
export const STORY_ENABLE_OROGENY = TOGGLES.STORY_ENABLE_OROGENY ?? true;
export const STORY_ENABLE_SWATCHES = TOGGLES.STORY_ENABLE_SWATCHES ?? true;
export const STORY_ENABLE_PALEO = TOGGLES.STORY_ENABLE_PALEO ?? true;

// --- Tunable Groups ---
// Merge story tunables and microclimate tunables into a single export for simplicity.
// Consumers can access e.g., STORY_TUNABLES.hotspot or STORY_TUNABLES.rainfall.
const STORY = MAP_CONFIG?.story || {};
const MICRO = MAP_CONFIG?.microclimate || {};

export const STORY_TUNABLES = Object.freeze({
    hotspot: STORY.hotspot || {},
    rift: STORY.rift || {},
    orogeny: STORY.orogeny || {},
    swatches: STORY.swatches || {},
    paleo: STORY.paleo || {},
    rainfall: MICRO.rainfall || {},
    features: MICRO.features || {},
});
