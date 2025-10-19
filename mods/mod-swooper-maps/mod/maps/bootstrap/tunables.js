/**
 * Unified Tunables — Live bindings with runtime rebind()
 *
 * Intent
 * - Provide a single import surface for all generator tunables (toggles and groups)
 *   backed by the resolved config snapshot.
 * - Export live ES module bindings (let variables) so callers see updated values
 *   after a call to rebind().
 *
 * Usage
 *   // Import once anywhere (bindings are live)
 *   import {
 *     rebind,
 *     LANDMASS_CFG,
 *     WORLDMODEL_DIRECTIONALITY,
 *     // ...
 *   } from "./config/tunables.js";
 *
 *   // Call rebind() at the start of a generation (or when the active entry changes)
 *   rebind();
 *
 * Notes
 * - rebind() calls resolved.refresh() internally, then updates all exported bindings.
 * - A best‑effort initial rebind() is performed at module load for safety.
 * - Arrays and objects returned from the resolver are treated as read‑only.
 */
// @ts-check
import {
    refresh as __refreshResolved__,
    // group getters
    TOGGLES as __TOGGLES__,
    STORY as __STORY__,
    MICROCLIMATE as __MICROCLIMATE__,
    LANDMASS_CFG as __LANDMASS__,
    COASTLINES_CFG as __COASTLINES__,
    MARGINS_CFG as __MARGINS__,
    ISLANDS_CFG as __ISLANDS__,
    CLIMATE_CFG as __CLIMATE__,
    MOUNTAINS_CFG as __MOUNTAINS__,
    VOLCANOES_CFG as __VOLCANOES__,
    BIOMES_CFG as __BIOMES__,
    FEATURES_DENSITY_CFG as __FEATURES_DENSITY__,
    CORRIDORS_CFG as __CORRIDORS__,
    PLACEMENT_CFG as __PLACEMENT__,
    DEV_LOG_CFG as __DEV__,
    FOUNDATION_CFG as __FOUNDATION__,
    WORLDMODEL_CFG as __WM__,
    STAGE_MANIFEST as __STAGE_MANIFEST__,
    // foundation helpers
    FOUNDATION_SEED as __FOUNDATION_SEED__,
    FOUNDATION_PLATES as __FOUNDATION_PLATES__,
    FOUNDATION_DYNAMICS as __FOUNDATION_DYNAMICS__,
    FOUNDATION_SURFACE as __FOUNDATION_SURFACE__,
    FOUNDATION_POLICY as __FOUNDATION_POLICY__,
    FOUNDATION_DIAGNOSTICS as __FOUNDATION_DIAGNOSTICS__,
    FOUNDATION_DIRECTIONALITY as __FOUNDATION_DIR__,
    FOUNDATION_OCEAN_SEPARATION as __FOUNDATION_OSEPARATION__,
    // nested WM helpers
    WORLDMODEL_PLATES as __WM_PLATES__,
    WORLDMODEL_WIND as __WM_WIND__,
    WORLDMODEL_CURRENTS as __WM_CURRENTS__,
    WORLDMODEL_PRESSURE as __WM_PRESSURE__,
    WORLDMODEL_POLICY as __WM_POLICY__,
    WORLDMODEL_DIRECTIONALITY as __WM_DIR__,
    WORLDMODEL_OCEAN_SEPARATION as __WM_OSEPARATION__,
} from "./resolved.js";
/**
 * Type definitions for configuration objects (available at runtime).
 * @typedef {import('./map_config.types.js').Landmass} Landmass
 * @typedef {import('./map_config.types.js').LandmassGeometry} LandmassGeometry
 * @typedef {import('./map_config.types.js').Coastlines} CoastlinesCfg
 * @typedef {import('./map_config.types.js').Margins} MarginsCfg
 * @typedef {import('./map_config.types.js').Islands} IslandsCfg
 * @typedef {import('./map_config.types.js').ClimateBaseline} ClimateBaseline
 * @typedef {import('./map_config.types.js').ClimateRefine} ClimateRefine
 * @typedef {import('./map_config.types.js').Mountains} MountainsCfg
 * @typedef {import('./map_config.types.js').Biomes} Biomes
 * @typedef {import('./map_config.types.js').Volcanoes} VolcanoesCfg
 * @typedef {import('./map_config.types.js').FeaturesDensity} FeaturesDensity
 * @typedef {import('./map_config.types.js').Corridors} Corridors
 * @typedef {import('./map_config.types.js').CorridorPolicy} CorridorPolicy
 * @typedef {import('./map_config.types.js').CorridorKinds} CorridorKinds
 * @typedef {import('./map_config.types.js').Placement} Placement
 * @typedef {import('./map_config.types.js').DevLogging} DevLogging
 * @typedef {import('./map_config.types.js').WorldModel} WorldModel
 * @typedef {import('./map_config.types.js').FoundationConfig} FoundationConfig
 * @typedef {import('./map_config.types.js').FoundationSeedConfig} FoundationSeedConfig
 * @typedef {import('./map_config.types.js').FoundationDynamicsConfig} FoundationDynamicsConfig
 * @typedef {import('./map_config.types.js').FoundationSurfaceConfig} FoundationSurfaceConfig
 * @typedef {import('./map_config.types.js').FoundationDiagnosticsConfig} FoundationDiagnosticsConfig
 * @typedef {import('./map_config.types.js').StageManifest} StageManifest
 * @typedef {import('./map_config.types.js').StageDescriptor} StageDescriptor
 * @typedef {import('./map_config.types.js').StageName} StageName
 */
/**
 * @typedef {Readonly<Partial<Record<string, StageDescriptor>>>} StageDescriptorMap
 * @typedef {Readonly<{
 *   order: ReadonlyArray<string>;
 *   stages: StageDescriptorMap;
 * }>} StageManifestSnapshot
 */
const EMPTY_OBJECT = /** @type {Readonly<any>} */ (Object.freeze({}));
const EMPTY_ARRAY = /** @type {ReadonlyArray<any>} */ (Object.freeze([]));
const EMPTY_STAGE_ORDER = /** @type {ReadonlyArray<string>} */ (Object.freeze([]));
const EMPTY_STAGE_MANIFEST = /** @type {StageManifestSnapshot} */ (Object.freeze({
    order: EMPTY_STAGE_ORDER,
    stages: Object.freeze(
        /** @type {Partial<Record<string, StageDescriptor>>} */ ({})
    ),
}));
const EMPTY_CLIMATE_BASELINE = /** @type {Readonly<ClimateBaseline>} */ (Object.freeze({}));
const EMPTY_CLIMATE_REFINE = /** @type {Readonly<ClimateRefine>} */ (Object.freeze({}));
/* -----------------------------------------------------------------------------
 * Exported live bindings (updated by rebind)
 * -------------------------------------------------------------------------- */
/** @type {StageManifestSnapshot} */
export let STAGE_MANIFEST = EMPTY_STAGE_MANIFEST;
/**
 * Check whether a manifest stage is enabled after dependency evaluation.
 * @param {StageName} stage
 * @returns {boolean}
 */
export function stageEnabled(stage) {
    if (!STAGE_MANIFEST || typeof STAGE_MANIFEST !== "object")
        return false;
    const stages = STAGE_MANIFEST.stages || {};
    const entry = stages && stages[stage];
    return !!(entry && entry.enabled !== false);
}
// Master toggles
export let STORY_ENABLE_HOTSPOTS = true;
export let STORY_ENABLE_RIFTS = true;
export let STORY_ENABLE_OROGENY = true;
export let STORY_ENABLE_SWATCHES = true;
export let STORY_ENABLE_PALEO = true;
export let STORY_ENABLE_CORRIDORS = true;
// Merged story+micro tunables convenience view
export let STORY_TUNABLES = Object.freeze({
    hotspot: Object.freeze({}),
    rift: Object.freeze({}),
    orogeny: Object.freeze({}),
    swatches: Object.freeze({}),
    paleo: Object.freeze({}),
    rainfall: Object.freeze({}),
    features: Object.freeze({}),
});
// Group objects (treat as read‑only from callers)
/** @type {Readonly<Landmass>} */
export let LANDMASS_CFG = Object.freeze({});
/** @type {Readonly<LandmassGeometry>} */
export let LANDMASS_GEOMETRY = Object.freeze({});
/** @type {Readonly<CoastlinesCfg>} */
export let COASTLINES_CFG = Object.freeze({});
/** @type {Readonly<MarginsCfg>} */
export let MARGINS_CFG = Object.freeze({});
/** @type {Readonly<IslandsCfg>} */
export let ISLANDS_CFG = Object.freeze({});
/** @type {Readonly<any>} */
export let CLIMATE_CFG = Object.freeze({});
/**
 * Shared climate primitives exposed to layers and narrative overlays.
 *
 * climate.drivers — canonical baseline/refinement parameter blocks.
 * climate.moistureAdjustments — targeted adjustments used by layers and overlays.
 */
export let CLIMATE = Object.freeze({
    drivers: Object.freeze({
        baseline: Object.freeze({}),
        refine: Object.freeze({}),
    }),
    moistureAdjustments: Object.freeze({
        baseline: Object.freeze({}),
        refine: Object.freeze({}),
        story: Object.freeze({}),
        micro: Object.freeze({}),
    }),
});
export let CLIMATE_DRIVERS = CLIMATE.drivers;
export let MOISTURE_ADJUSTMENTS = CLIMATE.moistureAdjustments;
/** @type {Readonly<FoundationConfig>} */
export let FOUNDATION_CFG = Object.freeze({});
/**
 * Consolidated view of the world foundation configuration (seed, plates, dynamics, surface, policy).
 */
export let FOUNDATION = Object.freeze({
    core: Object.freeze({}),
    seed: Object.freeze({}),
    plates: Object.freeze({}),
    dynamics: Object.freeze({}),
    surface: Object.freeze({}),
    policy: Object.freeze({}),
        diagnostics: Object.freeze({}),
    });
/** @type {Readonly<FoundationSeedConfig>} */
export let FOUNDATION_SEED = Object.freeze({});
/** @type {Readonly<WorldModel['plates']>} */
export let FOUNDATION_PLATES = Object.freeze({});
/** @type {Readonly<FoundationDynamicsConfig>} */
export let FOUNDATION_DYNAMICS = Object.freeze({});
/** @type {Readonly<FoundationSurfaceConfig>} */
export let FOUNDATION_SURFACE = Object.freeze({});
/** @type {Readonly<WorldModel['policy']>} */
export let FOUNDATION_POLICY = Object.freeze({});
/** @type {Readonly<FoundationDiagnosticsConfig>} */
export let FOUNDATION_DIAGNOSTICS = Object.freeze({});
/** @type {Readonly<WorldModel['directionality']>} */
export let FOUNDATION_DIRECTIONALITY = Object.freeze({});
/** @type {Readonly<NonNullable<WorldModel['policy']>['oceanSeparation']>} */
export let FOUNDATION_OCEAN_SEPARATION = Object.freeze({});
/** @type {Readonly<MountainsCfg>} */
export let MOUNTAINS_CFG = Object.freeze({});
/** @type {Readonly<VolcanoesCfg>} */
export let VOLCANOES_CFG = Object.freeze({});
/** @type {Readonly<Biomes>} */
export let BIOMES_CFG = Object.freeze({});
/** @type {Readonly<FeaturesDensity>} */
export let FEATURES_DENSITY_CFG = Object.freeze({});
/** @type {Readonly<Corridors>} */
export let CORRIDORS_CFG = Object.freeze({});
/** @type {Readonly<Placement>} */
export let PLACEMENT_CFG = Object.freeze({});
/** @type {Readonly<DevLogging>} */
export let DEV_LOG_CFG = Object.freeze({});
/** @type {Readonly<WorldModel>} */
export let WORLDMODEL_CFG = Object.freeze({});
// Corridor sub-groups
/** @type {Readonly<CorridorPolicy>} */
export let CORRIDOR_POLICY = Object.freeze({});
/** @type {Readonly<CorridorKinds>} */
export let CORRIDOR_KINDS = Object.freeze({});
// WorldModel nested groups
/** @type {Readonly<WorldModel['plates']>} */
export let WORLDMODEL_PLATES = Object.freeze({});
/** @type {Readonly<WorldModel['wind']>} */
export let WORLDMODEL_WIND = Object.freeze({});
/** @type {Readonly<WorldModel['currents']>} */
export let WORLDMODEL_CURRENTS = Object.freeze({});
/** @type {Readonly<WorldModel['pressure']>} */
export let WORLDMODEL_PRESSURE = Object.freeze({});
/** @type {Readonly<WorldModel['policy']>} */
export let WORLDMODEL_POLICY = Object.freeze({});
/** @type {Readonly<WorldModel['directionality']>} */
export let WORLDMODEL_DIRECTIONALITY = Object.freeze({});
/** @type {Readonly<NonNullable<WorldModel['policy']>['oceanSeparation']>} */
export let WORLDMODEL_OCEAN_SEPARATION = Object.freeze({});
/* -----------------------------------------------------------------------------
 * Namespaced views (lightweight import helpers)
 * -------------------------------------------------------------------------- */
/**
 * Focused accessor bundle for climate-related tunables.
 * Uses getters so consumers always see the most recent rebind() snapshot.
 */
export const CLIMATE_TUNABLES = Object.freeze({
    get config() {
        return CLIMATE_CFG;
    },
    get snapshot() {
        return CLIMATE;
    },
    get drivers() {
        return CLIMATE_DRIVERS;
    },
    get moistureAdjustments() {
        return MOISTURE_ADJUSTMENTS;
    },
});
/**
 * Focused accessor bundle for foundation/world settings.
 */
export const FOUNDATION_TUNABLES = Object.freeze({
    get config() {
        return FOUNDATION_CFG;
    },
    get snapshot() {
        return FOUNDATION;
    },
    get seed() {
        return FOUNDATION_SEED;
    },
    get plates() {
        return FOUNDATION_PLATES;
    },
    get dynamics() {
        return FOUNDATION_DYNAMICS;
    },
    get surface() {
        return FOUNDATION_SURFACE;
    },
    get policy() {
        return FOUNDATION_POLICY;
    },
    get diagnostics() {
        return FOUNDATION_DIAGNOSTICS;
    },
    get directionality() {
        return FOUNDATION_DIRECTIONALITY;
    },
    get oceanSeparation() {
        return FOUNDATION_OCEAN_SEPARATION;
    },
});
/**
 * Legacy world model accessor bundle (mirrors foundation data when available).
 */
export const WORLDMODEL_TUNABLES = Object.freeze({
    get config() {
        return WORLDMODEL_CFG;
    },
    get plates() {
        return WORLDMODEL_PLATES;
    },
    get wind() {
        return WORLDMODEL_WIND;
    },
    get currents() {
        return WORLDMODEL_CURRENTS;
    },
    get pressure() {
        return WORLDMODEL_PRESSURE;
    },
    get policy() {
        return WORLDMODEL_POLICY;
    },
    get directionality() {
        return WORLDMODEL_DIRECTIONALITY;
    },
    get oceanSeparation() {
        return WORLDMODEL_OCEAN_SEPARATION;
    },
});
/* -----------------------------------------------------------------------------
 * Rebind implementation
 * -------------------------------------------------------------------------- */
/**
 * Refresh the resolved snapshot then update all exported bindings.
 * Call this at the start of a generation (or whenever the active entry changes).
 */
export function rebind() {
    // 1) Resolve the current snapshot from defaults + presets + per-entry overrides
    __refreshResolved__();
    STAGE_MANIFEST = coerceStageManifest(__STAGE_MANIFEST__());
    const manifestToggleMap = deriveManifestToggleMap(STAGE_MANIFEST);
    const resolvedToggleSnapshot = /** @type {Readonly<Record<string, unknown>>} */ (safeObj(__TOGGLES__()));
    /**
     * Resolve a toggle key using manifest overrides, then runtime toggles.
     * @param {string} key
     * @param {boolean} fallback
     * @returns {boolean}
     */
    const toggleValue = (key, fallback) => {
        if (Object.prototype.hasOwnProperty.call(manifestToggleMap, key))
            return manifestToggleMap[key];
        const raw = resolvedToggleSnapshot[key];
        return typeof raw === "boolean" ? raw : fallback;
    };
    // 2) Toggles
    STORY_ENABLE_HOTSPOTS = toggleValue("STORY_ENABLE_HOTSPOTS", true);
    STORY_ENABLE_RIFTS = toggleValue("STORY_ENABLE_RIFTS", true);
    STORY_ENABLE_OROGENY = toggleValue("STORY_ENABLE_OROGENY", true);
    STORY_ENABLE_SWATCHES = toggleValue("STORY_ENABLE_SWATCHES", true);
    STORY_ENABLE_PALEO = toggleValue("STORY_ENABLE_PALEO", true);
    STORY_ENABLE_CORRIDORS = toggleValue("STORY_ENABLE_CORRIDORS", true);
    // 3) Story+Micro merged convenience
    const S = safeObj(__STORY__());
    const M = safeObj(__MICROCLIMATE__());
    STORY_TUNABLES = Object.freeze({
        hotspot: safeObj(S.hotspot),
        rift: safeObj(S.rift),
        orogeny: safeObj(S.orogeny),
        swatches: safeObj(S.swatches),
        paleo: safeObj(S.paleo),
        rainfall: safeObj(M.rainfall),
        features: safeObj(M.features),
    });
    // 4) Groups
    LANDMASS_CFG = safeObj(__LANDMASS__());
    LANDMASS_GEOMETRY = safeObj(LANDMASS_CFG.geometry);
    COASTLINES_CFG = safeObj(__COASTLINES__());
    MARGINS_CFG = safeObj(__MARGINS__());
    ISLANDS_CFG = safeObj(__ISLANDS__());
    CLIMATE_CFG = safeObj(__CLIMATE__());
    const climateBaselineRaw = safeObj(CLIMATE_CFG.baseline, EMPTY_CLIMATE_BASELINE);
    const climateRefineRaw = safeObj(CLIMATE_CFG.refine, EMPTY_CLIMATE_REFINE);
    const climateSwatches = safeObj(CLIMATE_CFG.swatches);
    const climateBaseline = Object.keys(climateBaselineRaw).length > 0 ? climateBaselineRaw : EMPTY_CLIMATE_BASELINE;
    const climateRefine = Object.keys(climateRefineRaw).length > 0 ? climateRefineRaw : EMPTY_CLIMATE_REFINE;
    MOUNTAINS_CFG = safeObj(__MOUNTAINS__());
    VOLCANOES_CFG = safeObj(__VOLCANOES__());
    BIOMES_CFG = safeObj(__BIOMES__());
    FEATURES_DENSITY_CFG = safeObj(__FEATURES_DENSITY__());
    CORRIDORS_CFG = safeObj(__CORRIDORS__());
    PLACEMENT_CFG = safeObj(__PLACEMENT__());
    DEV_LOG_CFG = safeObj(__DEV__());
    // 5) Foundation config (new unified world settings)
    FOUNDATION_CFG = safeObj(__FOUNDATION__());
    FOUNDATION_SEED = safeObj(__FOUNDATION_SEED__());
    FOUNDATION_PLATES = safeObj(__FOUNDATION_PLATES__());
    FOUNDATION_DYNAMICS = safeObj(__FOUNDATION_DYNAMICS__());
    const foundationWind = safeObj(FOUNDATION_DYNAMICS.wind);
    const foundationCurrents = safeObj(FOUNDATION_DYNAMICS.currents);
    const foundationMantle = safeObj(FOUNDATION_DYNAMICS.mantle);
    const foundationDirResolved = safeObj(__FOUNDATION_DIR__());
    const foundationSurfaceRaw = safeObj(__FOUNDATION_SURFACE__());
    FOUNDATION_SURFACE = foundationSurfaceRaw;
    const foundationPolicyRaw = safeObj(__FOUNDATION_POLICY__());
    FOUNDATION_POLICY = foundationPolicyRaw;
    FOUNDATION_DIAGNOSTICS = safeObj(__FOUNDATION_DIAGNOSTICS__());
    const foundationDirectionalityFromDynamics = safeObj(FOUNDATION_DYNAMICS.directionality);
    FOUNDATION_DIRECTIONALITY =
        Object.keys(foundationDirectionalityFromDynamics).length > 0
            ? foundationDirectionalityFromDynamics
            : foundationDirResolved;
    const foundationSurfaceOcean = safeObj(foundationSurfaceRaw.oceanSeparation);
    const foundationPolicyOcean = safeObj(foundationPolicyRaw.oceanSeparation);
    const foundationOceanResolved = safeObj(__FOUNDATION_OSEPARATION__());
    FOUNDATION_OCEAN_SEPARATION =
        Object.keys(foundationSurfaceOcean).length > 0
            ? foundationSurfaceOcean
            : Object.keys(foundationPolicyOcean).length > 0
                ? foundationPolicyOcean
                : foundationOceanResolved;
    FOUNDATION = Object.freeze({
        core: FOUNDATION_CFG,
        seed: FOUNDATION_SEED,
        plates: FOUNDATION_PLATES,
        dynamics: FOUNDATION_DYNAMICS,
        surface: FOUNDATION_SURFACE,
        policy: FOUNDATION_POLICY,
        diagnostics: FOUNDATION_DIAGNOSTICS,
    });
    // 6) Legacy worldModel snapshot (mirrors foundation; keep until consumers migrate)
    WORLDMODEL_CFG = safeObj(__WM__());
    // Corridor sub-groups
    CORRIDOR_POLICY = safeObj(CORRIDORS_CFG.policy);
    CORRIDOR_KINDS = safeObj(CORRIDORS_CFG.kinds);
    // WorldModel nested groups
    WORLDMODEL_PLATES = safeObj(__WM_PLATES__());
    WORLDMODEL_WIND = safeObj(__WM_WIND__());
    WORLDMODEL_CURRENTS = safeObj(__WM_CURRENTS__());
    WORLDMODEL_PRESSURE = safeObj(__WM_PRESSURE__());
    WORLDMODEL_POLICY = safeObj(__WM_POLICY__());
    WORLDMODEL_DIRECTIONALITY = safeObj(__WM_DIR__());
    WORLDMODEL_OCEAN_SEPARATION = safeObj(__WM_OSEPARATION__());
    const foundationHasData = Object.keys(FOUNDATION_CFG).length > 0;
    if (!Object.keys(WORLDMODEL_CFG).length && foundationHasData) {
        WORLDMODEL_CFG = Object.freeze({
            enabled: true,
            plates: FOUNDATION_PLATES,
            wind: foundationWind,
            currents: foundationCurrents,
            pressure: foundationMantle,
            directionality: FOUNDATION_DIRECTIONALITY,
            policy: FOUNDATION_POLICY,
        });
    }
    if (!Object.keys(WORLDMODEL_PLATES).length && foundationHasData)
        WORLDMODEL_PLATES = FOUNDATION_PLATES;
    if (!Object.keys(WORLDMODEL_WIND).length && foundationHasData)
        WORLDMODEL_WIND = foundationWind;
    if (!Object.keys(WORLDMODEL_CURRENTS).length && foundationHasData)
        WORLDMODEL_CURRENTS = foundationCurrents;
    if (!Object.keys(WORLDMODEL_PRESSURE).length && foundationHasData)
        WORLDMODEL_PRESSURE = foundationMantle;
    if (!Object.keys(WORLDMODEL_DIRECTIONALITY).length && foundationHasData)
        WORLDMODEL_DIRECTIONALITY = FOUNDATION_DIRECTIONALITY;
    if (!Object.keys(WORLDMODEL_POLICY).length && foundationHasData)
        WORLDMODEL_POLICY = FOUNDATION_POLICY;
    if (!Object.keys(WORLDMODEL_OCEAN_SEPARATION).length && foundationHasData)
        WORLDMODEL_OCEAN_SEPARATION = FOUNDATION_OCEAN_SEPARATION;
    // 7) Climate primitives (drivers + shared adjustments)
    const baselineDrivers = Object.freeze({
        bands: safeObj(climateBaseline.bands),
        blend: safeObj(climateBaseline.blend),
    });
    const refineDrivers = Object.freeze({
        waterGradient: safeObj(climateRefine.waterGradient),
        orographic: safeObj(climateRefine.orographic),
        riverCorridor: safeObj(climateRefine.riverCorridor),
        lowBasin: safeObj(climateRefine.lowBasin),
        pressure: safeObj(climateRefine.pressure),
    });
    const storyMoisture = Object.freeze({
        swatches: Object.keys(climateSwatches).length > 0 ? climateSwatches : safeObj(S.swatches),
        paleo: safeObj(S.paleo),
        rainfall: safeObj(M.rainfall),
        orogeny: safeObj(S.orogeny),
    });
    const baselineMoisture = Object.freeze({
        orographic: safeObj(climateBaseline.orographic),
        coastal: safeObj(climateBaseline.coastal),
        noise: safeObj(climateBaseline.noise),
        bands: baselineDrivers.bands,
        blend: baselineDrivers.blend,
    });
    const refineMoisture = Object.freeze({
        waterGradient: refineDrivers.waterGradient,
        orographic: refineDrivers.orographic,
        riverCorridor: refineDrivers.riverCorridor,
        lowBasin: refineDrivers.lowBasin,
        pressure: refineDrivers.pressure,
    });
    const microMoisture = Object.freeze({
        rainfall: safeObj(M.rainfall),
        features: safeObj(M.features),
    });
    CLIMATE = Object.freeze({
        drivers: Object.freeze({
            baseline: Object.freeze({
                ...baselineDrivers,
                orographic: baselineMoisture.orographic,
                coastal: baselineMoisture.coastal,
                noise: baselineMoisture.noise,
            }),
            refine: Object.freeze({
                ...refineDrivers,
            }),
        }),
        moistureAdjustments: Object.freeze({
            baseline: baselineMoisture,
            refine: refineMoisture,
            story: storyMoisture,
            micro: microMoisture,
        }),
    });
    CLIMATE_DRIVERS = CLIMATE.drivers;
    MOISTURE_ADJUSTMENTS = CLIMATE.moistureAdjustments;
}
/* -----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */
/**
 * Normalize a resolver-provided manifest into a frozen snapshot with safe defaults.
 * @param {Readonly<StageManifest> | StageManifestSnapshot | null | undefined} manifest
 * @returns {StageManifestSnapshot}
 */
function coerceStageManifest(manifest) {
    if (!manifest || typeof manifest !== "object")
        return EMPTY_STAGE_MANIFEST;
    const rawOrder = Array.isArray(manifest.order) ? manifest.order : EMPTY_ARRAY;
    /** @type {Array<string>} */
    const order = [];
    for (const entry of rawOrder) {
        if (typeof entry === "string")
            order.push(entry);
    }
    const rawStages = manifest.stages && typeof manifest.stages === "object"
        ? /** @type {Record<string, any>} */ (manifest.stages)
        : {};
    /** @type {Partial<Record<string, StageDescriptor>>} */
    const normalizedStages = {};
    for (const name of Object.keys(rawStages)) {
        const descriptor = rawStages[name];
        if (!descriptor || typeof descriptor !== "object")
            continue;
        normalizedStages[name] = /** @type {StageDescriptor} */ (Object.isFrozen(descriptor)
            ? descriptor
            : Object.freeze({ ...descriptor }));
    }
    if (!order.length && !Object.keys(normalizedStages).length) {
        return EMPTY_STAGE_MANIFEST;
    }
    return /** @type {StageManifestSnapshot} */ (Object.freeze({
        order: /** @type {ReadonlyArray<string>} */ (Object.freeze(order)),
        stages: Object.freeze(normalizedStages),
    }));
}
/**
 * Build a lookup of legacy toggle keys derived from the stage manifest.
 * @param {StageManifestSnapshot} manifest
 * @returns {Record<string, boolean>}
 */
function deriveManifestToggleMap(manifest) {
    /** @type {Record<string, boolean>} */
    const out = {};
    if (!manifest || typeof manifest !== "object")
        return out;
    const stages = manifest?.stages
        ? /** @type {Partial<Record<string, StageDescriptor>>} */ (manifest.stages)
        : {};
    const order = manifest?.order && manifest.order.length > 0
        ? Array.from(manifest.order)
        : Object.keys(stages);
    for (const name of order) {
        const stage = stages && stages[name];
        if (!stage)
            continue;
        const toggles = Array.isArray(stage.legacyToggles) ? stage.legacyToggles : [];
        for (const key of toggles) {
            if (typeof key !== "string")
                continue;
            out[key] = stage.enabled !== false;
        }
    }
    for (const name of Object.keys(stages)) {
        const stage = stages[name];
        if (!stage)
            continue;
        const toggles = Array.isArray(stage.legacyToggles) ? stage.legacyToggles : [];
        for (const key of toggles) {
            if (typeof key !== "string" || Object.prototype.hasOwnProperty.call(out, key))
                continue;
            out[key] = stage.enabled !== false;
        }
    }
    return out;
}
/**
 * Ensure we always return a frozen object of the expected shape for TS consumers.
 * Falls back to an empty frozen object when input is null/undefined or not an object.
 * @template {object | ReadonlyArray<any>} T
 * @param {T | null | undefined} value
 * @param {Readonly<T>} [fallback]
 * @returns {Readonly<T>}
 */
function safeObj(value, fallback) {
    if (!value || typeof value !== "object") {
        if (fallback)
            return fallback;
        return /** @type {Readonly<T>} */ (EMPTY_OBJECT);
    }
    if (Object.isFrozen(value))
        return /** @type {Readonly<T>} */ (value);
    if (Array.isArray(value)) {
        const clone = value.slice();
        return /** @type {Readonly<T>} */ (/** @type {unknown} */ (Object.freeze(clone)));
    }
    return /** @type {Readonly<T>} */ (Object.freeze({ ...value }));
}
/* -----------------------------------------------------------------------------
 * Module-load bootstrap
 * -------------------------------------------------------------------------- */
// Perform an initial bind so imports have sane values even if callers forget to rebind().
// Callers should still rebind() at the start of each GenerateMap to ensure the
// snapshot reflects the active entry’s presets and overrides.
try {
    rebind();
}
catch {
    // Keep imports resilient even if resolution fails very early in a cold VM.
    // Bindings already hold conservative defaults above.
}
export default {
    rebind,
    // expose current group snapshots (optional convenience mirror)
    get LANDMASS() {
        return LANDMASS_CFG;
    },
    get CORRIDORS() {
        return CORRIDORS_CFG;
    },
    get WORLD_MODEL() {
        return WORLDMODEL_CFG;
    },
    get FOUNDATION() {
        return FOUNDATION;
    },
    get CLIMATE() {
        return CLIMATE;
    },
};
