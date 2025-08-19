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
export const STORY_ENABLE_CORRIDORS = TOGGLES.STORY_ENABLE_CORRIDORS ?? true;
export const STORY_ENABLE_WORLDMODEL = TOGGLES.STORY_ENABLE_WORLDMODEL ?? true;

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

// Additional config groups (safe fallbacks)
export const LANDMASS_CFG = MAP_CONFIG?.landmass || {};
export const LANDMASS_GEOMETRY = MAP_CONFIG?.landmass?.geometry || {};
export const COASTLINES_CFG = MAP_CONFIG?.coastlines || {};
export const MARGINS_CFG = MAP_CONFIG?.margins || {};
export const ISLANDS_CFG = MAP_CONFIG?.islands || {};
export const CORRIDORS_CFG = MAP_CONFIG?.corridors || {};
export const CLIMATE_BASELINE_CFG = MAP_CONFIG?.climateBaseline || {};
export const CLIMATE_REFINE_CFG = MAP_CONFIG?.climateRefine || {};
export const BIOMES_CFG = MAP_CONFIG?.biomes || {};
export const FEATURES_DENSITY_CFG = MAP_CONFIG?.featuresDensity || {};
export const PLACEMENT_CFG = MAP_CONFIG?.placement || {};
export const DEV_LOG_CFG = MAP_CONFIG?.dev || {};
export const CORRIDOR_POLICY = MAP_CONFIG?.corridors?.policy || {};
export const CORRIDOR_KINDS = MAP_CONFIG?.corridors?.kinds || {};
export const WORLDMODEL_CFG = MAP_CONFIG?.worldModel || {};
export const WORLDMODEL_PLATES = MAP_CONFIG?.worldModel?.plates || {};
export const WORLDMODEL_WIND = MAP_CONFIG?.worldModel?.wind || {};
export const WORLDMODEL_CURRENTS = MAP_CONFIG?.worldModel?.currents || {};
export const WORLDMODEL_PRESSURE = MAP_CONFIG?.worldModel?.pressure || {};
export const WORLDMODEL_POLICY = MAP_CONFIG?.worldModel?.policy || {};
export const WORLDMODEL_DIRECTIONALITY =
    MAP_CONFIG?.worldModel?.directionality || {};
export const WORLDMODEL_OCEAN_SEPARATION =
    MAP_CONFIG?.worldModel?.policy?.oceanSeparation || {};
