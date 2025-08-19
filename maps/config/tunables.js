/**
 * @file epic-diverse-huge-map/maps/config/tunables.js
 * @description
 * Unified config access for all consumers.
 *
 * This module resolves configuration once (at module load) using:
 *   1) Explicit defaults (BASE_CONFIG)
 *   2) Named presets declared by the entry (rc.presets array)
 *   3) Per-entry overrides (rc)
 *
 * Rationale
 * - Entry files call setConfig() before importing the orchestrator.
 * - The orchestrator and all layers import from this module.
 * - We call resolved.refresh() here so exported constants reflect the entry’s config.
 *
 * Notes
 * - Arrays replace; objects deep-merge.
 * - The resolved snapshot is frozen and read-only hereafter for this run.
 */

// @ts-check

import {
    refresh,
    // Group getters
    TOGGLES,
    STORY as STORY_GROUP,
    MICROCLIMATE as MICROCLIMATE_GROUP,
    LANDMASS_CFG as LANDMASS_GROUP,
    COASTLINES_CFG as COASTLINES_GROUP,
    MARGINS_CFG as MARGINS_GROUP,
    ISLANDS_CFG as ISLANDS_GROUP,
    CLIMATE_BASELINE_CFG as CLIMATE_BASELINE_GROUP,
    CLIMATE_REFINE_CFG as CLIMATE_REFINE_GROUP,
    BIOMES_CFG as BIOMES_GROUP,
    FEATURES_DENSITY_CFG as FEATURES_DENSITY_GROUP,
    CORRIDORS_CFG as CORRIDORS_GROUP,
    PLACEMENT_CFG as PLACEMENT_GROUP,
    DEV_LOG_CFG as DEV_LOG_GROUP,
    WORLDMODEL_CFG as WORLDMODEL_GROUP,
    // WorldModel nested helpers
    WORLDMODEL_PLATES as WM_PLATES,
    WORLDMODEL_WIND as WM_WIND,
    WORLDMODEL_CURRENTS as WM_CURRENTS,
    WORLDMODEL_PRESSURE as WM_PRESSURE,
    WORLDMODEL_POLICY as WM_POLICY,
    WORLDMODEL_DIRECTIONALITY as WM_DIRECTIONALITY,
    WORLDMODEL_OCEAN_SEPARATION as WM_OCEAN_SEP,
} from "./resolved.js";

/* -----------------------------------------------------------------------------
 * Build resolved snapshot now (entry setConfig() has already run)
 * -------------------------------------------------------------------------- */
refresh();

/* -----------------------------------------------------------------------------
 * Master toggles (booleans)
 * -------------------------------------------------------------------------- */
const _T = TOGGLES() || {};
export const STORY_ENABLE_HOTSPOTS = _T.STORY_ENABLE_HOTSPOTS ?? true;
export const STORY_ENABLE_RIFTS = _T.STORY_ENABLE_RIFTS ?? true;
export const STORY_ENABLE_OROGENY = _T.STORY_ENABLE_OROGENY ?? true;
export const STORY_ENABLE_SWATCHES = _T.STORY_ENABLE_SWATCHES ?? true;
export const STORY_ENABLE_PALEO = _T.STORY_ENABLE_PALEO ?? true;
export const STORY_ENABLE_CORRIDORS = _T.STORY_ENABLE_CORRIDORS ?? true;
export const STORY_ENABLE_WORLDMODEL = _T.STORY_ENABLE_WORLDMODEL ?? true;

/* -----------------------------------------------------------------------------
 * Story and microclimate tunables (merged convenience export)
 * -------------------------------------------------------------------------- */
const _STORY = STORY_GROUP() || {};
const _MICRO = MICROCLIMATE_GROUP() || {};

export const STORY_TUNABLES = Object.freeze({
    hotspot: _STORY.hotspot || {},
    rift: _STORY.rift || {},
    orogeny: _STORY.orogeny || {},
    swatches: _STORY.swatches || {},
    paleo: _STORY.paleo || {},
    rainfall: _MICRO.rainfall || {},
    features: _MICRO.features || {},
});

/* -----------------------------------------------------------------------------
 * Config groups (objects)
 * -------------------------------------------------------------------------- */
export const LANDMASS_CFG = LANDMASS_GROUP() || {};
export const LANDMASS_GEOMETRY = (LANDMASS_CFG && LANDMASS_CFG.geometry) || {};

export const COASTLINES_CFG = COASTLINES_GROUP() || {};
export const MARGINS_CFG = MARGINS_GROUP() || {};
export const ISLANDS_CFG = ISLANDS_GROUP() || {};
export const CLIMATE_BASELINE_CFG = CLIMATE_BASELINE_GROUP() || {};
export const CLIMATE_REFINE_CFG = CLIMATE_REFINE_GROUP() || {};
export const BIOMES_CFG = BIOMES_GROUP() || {};
export const FEATURES_DENSITY_CFG = FEATURES_DENSITY_GROUP() || {};
export const CORRIDORS_CFG = CORRIDORS_GROUP() || {};
export const PLACEMENT_CFG = PLACEMENT_GROUP() || {};
export const DEV_LOG_CFG = DEV_LOG_GROUP() || {};
export const WORLDMODEL_CFG = WORLDMODEL_GROUP() || {};

/* Corridor sub-groups (convenience) */
export const CORRIDOR_POLICY = (CORRIDORS_CFG && CORRIDORS_CFG.policy) || {};
export const CORRIDOR_KINDS = (CORRIDORS_CFG && CORRIDORS_CFG.kinds) || {};

/* -----------------------------------------------------------------------------
 * WorldModel subsets (objects)
 * -------------------------------------------------------------------------- */
export const WORLDMODEL_PLATES = WM_PLATES() || {};
export const WORLDMODEL_WIND = WM_WIND() || {};
export const WORLDMODEL_CURRENTS = WM_CURRENTS() || {};
export const WORLDMODEL_PRESSURE = WM_PRESSURE() || {};
export const WORLDMODEL_POLICY = WM_POLICY() || {};
export const WORLDMODEL_DIRECTIONALITY = WM_DIRECTIONALITY() || {};
export const WORLDMODEL_OCEAN_SEPARATION = WM_OCEAN_SEP() || {};

/* -----------------------------------------------------------------------------
 * Default export (optional)
 * -------------------------------------------------------------------------- */
export default {
    // toggles
    STORY_ENABLE_HOTSPOTS,
    STORY_ENABLE_RIFTS,
    STORY_ENABLE_OROGENY,
    STORY_ENABLE_SWATCHES,
    STORY_ENABLE_PALEO,
    STORY_ENABLE_CORRIDORS,
    STORY_ENABLE_WORLDMODEL,
    // merged tunables
    STORY_TUNABLES,
    // groups
    LANDMASS_CFG,
    LANDMASS_GEOMETRY,
    COASTLINES_CFG,
    MARGINS_CFG,
    ISLANDS_CFG,
    CLIMATE_BASELINE_CFG,
    CLIMATE_REFINE_CFG,
    BIOMES_CFG,
    FEATURES_DENSITY_CFG,
    CORRIDORS_CFG,
    PLACEMENT_CFG,
    DEV_LOG_CFG,
    WORLDMODEL_CFG,
    // corridor sub-groups
    CORRIDOR_POLICY,
    CORRIDOR_KINDS,
    // world model subsets
    WORLDMODEL_PLATES,
    WORLDMODEL_WIND,
    WORLDMODEL_CURRENTS,
    WORLDMODEL_PRESSURE,
    WORLDMODEL_POLICY,
    WORLDMODEL_DIRECTIONALITY,
    WORLDMODEL_OCEAN_SEPARATION,
};
