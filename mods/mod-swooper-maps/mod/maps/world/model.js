// @ts-nocheck
/**
 * WorldModel — Earth Forces Simulation (Physics-Based Plate Tectonics)
 *
 * Purpose
 * - Precompute global "world fields" (plates, plate boundaries, uplift/rift potentials,
 *   winds, ocean currents, mantle pressure) using proper Voronoi diagrams and physics.
 * - These fields are read-only for other layers (tagging, climate, coasts, corridors) to use later.
 * - Keep conservative defaults; remain fully optional via config toggle.
 *
 * Invariants
 * - Never mutate engine surfaces from here; this module only computes arrays/fields.
 * - Keep complexity O(width × height) with small constants; no flood fills.
 *
 * Dependencies (Base Game Scripts)
 * - Imports from /base-standard/scripts/voronoi-utils.js - Voronoi diagram generation
 * - Imports from /base-standard/scripts/voronoi-region.js - PlateRegion with movement vectors
 * - Imports from /base-standard/scripts/kd-tree.js - Spatial indexing for boundaries
 *
 * Status
 * - Phase 1.5 Complete: Proper Voronoi-based plates with physics-driven boundaries
 * - Phase 2 Pending: Wire WorldModel to consumers (mountains, climate, coasts)
 */
import { FOUNDATION_PLATES as __FOUNDATION_PLATES, FOUNDATION_DYNAMICS as __FOUNDATION_DYNAMICS, FOUNDATION_DIRECTIONALITY as __FOUNDATION_DIRECTIONALITY, } from "../bootstrap/tunables.js";
import { computePlatesVoronoi } from "./plates.js";
const FOUNDATION_PLATES = __FOUNDATION_PLATES;
const FOUNDATION_DYNAMICS = __FOUNDATION_DYNAMICS;
const FOUNDATION_DIRECTIONALITY = __FOUNDATION_DIRECTIONALITY;
import { devLogIf } from "../bootstrap/dev.js";
/** @typedef {"none" | "convergent" | "divergent" | "transform"} BoundaryType */
const ENUM_BOUNDARY = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});
/** Internal state holder (module singletons) */
const _state = {
    initialized: false,
    width: 0,
    height: 0,
    // Plates
    plateId: /** @type {Int16Array|null} */ (null),
    boundaryCloseness: /** @type {Uint8Array|null} */ (null), // 0..255 (higher = closer to boundary)
    boundaryType: /** @type {Uint8Array|null} */ (null), // ENUM_BOUNDARY
    tectonicStress: /** @type {Uint8Array|null} */ (null), // 0..255
    upliftPotential: /** @type {Uint8Array|null} */ (null), // 0..255
    riftPotential: /** @type {Uint8Array|null} */ (null), // 0..255
    shieldStability: /** @type {Uint8Array|null} */ (null), // 0..255 (higher = more interior/stable)
    // Plate movement vectors (new in Phase 1.5)
    plateMovementU: /** @type {Int8Array|null} */ (null), // -127..127 (horizontal plate movement)
    plateMovementV: /** @type {Int8Array|null} */ (null), // -127..127 (vertical plate movement)
    plateRotation: /** @type {Int8Array|null} */ (null), // -127..127 (plate rotation value)
    // Winds (per tile, basic vector)
    windU: /** @type {Int8Array|null} */ (null), // -127..127
    windV: /** @type {Int8Array|null} */ (null),
    // Ocean currents (only meaningful on water tiles)
    currentU: /** @type {Int8Array|null} */ (null),
    currentV: /** @type {Int8Array|null} */ (null),
    // Mantle pressure/bumps (0..255)
    pressure: /** @type {Uint8Array|null} */ (null),
    // Plate boundary spatial index (new in Phase 1.5)
    boundaryTree: /** @type {any|null} */ (null), // kdTree for fast boundary queries
    plateSeed: /** @type {Readonly<any>|null} */ (null),
};
/**
 * Public singleton API
 */
export const WorldModel = {
    /**
     * Returns true if WorldModel is toggled on and successfully initialized for this map.
     */
    isEnabled() {
        return !!_state.initialized;
    },
    /**
     * Initialize world fields. Safe to call multiple times; subsequent calls are no-ops.
     * Does nothing if the toggle is disabled or engine APIs are unavailable.
     */
    init() {
        if (_state.initialized)
            return true;
        // Guard: engine-provided API
        const ok = typeof GameplayMap?.getGridWidth === "function" &&
            typeof GameplayMap?.getGridHeight === "function" &&
            typeof GameplayMap?.isWater === "function" &&
            typeof GameplayMap?.getPlotLatitude === "function";
        if (!ok) {
            devLogIf &&
                devLogIf("LOG_STORY_TAGS", "[WorldModel] Engine APIs unavailable; skipping initialization.");
            return false;
        }
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        _state.width = width | 0;
        _state.height = height | 0;
        const size = Math.max(0, width * height) | 0;
        // Allocate arrays
        _state.plateId = new Int16Array(size);
        _state.boundaryCloseness = new Uint8Array(size);
        _state.boundaryType = new Uint8Array(size);
        _state.tectonicStress = new Uint8Array(size);
        _state.upliftPotential = new Uint8Array(size);
        _state.riftPotential = new Uint8Array(size);
        _state.shieldStability = new Uint8Array(size);
        _state.plateMovementU = new Int8Array(size);
        _state.plateMovementV = new Int8Array(size);
        _state.plateRotation = new Int8Array(size);
        _state.windU = new Int8Array(size);
        _state.windV = new Int8Array(size);
        _state.currentU = new Int8Array(size);
        _state.currentV = new Int8Array(size);
        _state.pressure = new Uint8Array(size);
        // Compute placeholder fields (fast, coherent)
        computePlates(width, height);
        computePressure(width, height);
        computeWinds(width, height);
        computeCurrents(width, height);
        _state.initialized = true;
        devLogIf &&
            devLogIf("LOG_STORY_TAGS", "[WorldModel] Initialized fields for this map.", {
                width,
                height,
                plates: FOUNDATION_PLATES?.count ?? 0,
            });
        return true;
    },
    /**
     * Utility to fetch typed arrays (read-only by convention).
     * Returns null if not initialized or disabled.
     */
    get plateId() {
        return _state.plateId;
    },
    get boundaryCloseness() {
        return _state.boundaryCloseness;
    },
    get boundaryType() {
        return _state.boundaryType;
    },
    get tectonicStress() {
        return _state.tectonicStress;
    },
    get upliftPotential() {
        return _state.upliftPotential;
    },
    get riftPotential() {
        return _state.riftPotential;
    },
    get shieldStability() {
        return _state.shieldStability;
    },
    get windU() {
        return _state.windU;
    },
    get windV() {
        return _state.windV;
    },
    get currentU() {
        return _state.currentU;
    },
    get currentV() {
        return _state.currentV;
    },
    get pressure() {
        return _state.pressure;
    },
    get plateMovementU() {
        return _state.plateMovementU;
    },
    get plateMovementV() {
        return _state.plateMovementV;
    },
    get plateRotation() {
        return _state.plateRotation;
    },
    get boundaryTree() {
        return _state.boundaryTree;
    },
    get plateSeed() {
        return _state.plateSeed;
    },
};
/* ---------------------------------- helpers ---------------------------------- */
function idx(x, y, width) {
    return y * width + x;
}
/**
 * Compute plate assignment using proper Voronoi diagrams with physics-based boundaries
 * - Uses base game's VoronoiUtils for accurate boundary detection
 * - Calculates subduction/sliding from plate movement vectors
 * - Stores boundaries in kdTree for fast Phase 2 queries
 *
 * Phase 1.5 Upgrade: Replaced simple distance-based Voronoi with proper edge-based system
 */
function computePlates(width, height) {
    const platesCfg = FOUNDATION_PLATES || {};
    const count = Math.max(2, platesCfg?.count | 0 || 8);
    const convergenceMix = Math.max(0, Math.min(1, platesCfg?.convergenceMix ?? 0.5));
    const relaxationSteps = Math.max(0, platesCfg?.relaxationSteps | 0 || 5);
    const plateRotationMultiple = platesCfg?.plateRotationMultiple ?? 1.0;
    const seedMode = platesCfg?.seedMode === "fixed" ? "fixed" : "engine";
    const seedOffset = Number.isFinite(platesCfg?.seedOffset)
        ? Math.trunc(platesCfg.seedOffset)
        : 0;
    const fixedSeed = Number.isFinite(platesCfg?.fixedSeed)
        ? Math.trunc(platesCfg.fixedSeed)
        : undefined;

    // Call new Voronoi-based plate generation
    const plateData = computePlatesVoronoi(width, height, {
        count,
        relaxationSteps,
        convergenceMix,
        plateRotationMultiple,
        directionality: FOUNDATION_DIRECTIONALITY,
        seedMode,
        fixedSeed,
        seedOffset,
    });

    // Copy results into WorldModel state arrays
    _state.plateId.set(plateData.plateId);
    _state.boundaryCloseness.set(plateData.boundaryCloseness);
    _state.boundaryType.set(plateData.boundaryType);
    _state.tectonicStress.set(plateData.tectonicStress);
    _state.upliftPotential.set(plateData.upliftPotential);
    _state.riftPotential.set(plateData.riftPotential);
    _state.shieldStability.set(plateData.shieldStability);
    _state.plateMovementU.set(plateData.plateMovementU);
    _state.plateMovementV.set(plateData.plateMovementV);
    _state.plateRotation.set(plateData.plateRotation);

    // Store boundary tree for Phase 2 mountain placement
    _state.boundaryTree = plateData.boundaryTree;
    const meta = plateData.meta || {};
    const configSnapshot = Object.freeze({
        count,
        relaxationSteps,
        convergenceMix,
        plateRotationMultiple,
        seedMode,
        fixedSeed,
        seedOffset,
    });
    const seeds = Array.isArray(meta.seedLocations)
        ? Object.freeze(meta.seedLocations.map((loc, idx) => Object.freeze({
            id: loc?.id ?? idx,
            x: loc?.x ?? 0,
            y: loc?.y ?? 0,
        })))
        : Object.freeze([]);
    _state.plateSeed = Object.freeze({
        width,
        height,
        config: configSnapshot,
        seedLocations: seeds,
    });

    devLogIf &&
        devLogIf("LOG_STORY_TAGS", "[WorldModel] Plate generation complete", {
            plateCount: count,
            boundaryCount: plateData.boundaryTree ? "available" : "none",
        });
}
/**
 * Mantle pressure: small number of Gaussian bumps (very low frequency) + normalization.
 * Output: pressure 0..255
 */
function computePressure(width, height) {
    const size = width * height;
    const pressure = _state.pressure;
    if (!pressure)
        return;
    // Params
    const mantleCfg = FOUNDATION_DYNAMICS?.mantle || {};
    const bumps = Math.max(1, mantleCfg?.bumps | 0 || 4);
    const amp = Math.max(0.1, mantleCfg?.amplitude ?? 0.6);
    const scl = Math.max(0.1, mantleCfg?.scale ?? 0.4);
    const sigma = Math.max(4, Math.floor(Math.min(width, height) * scl));
    // Random bump centers
    const centers = [];
    for (let i = 0; i < bumps; i++) {
        const cx = TerrainBuilder?.getRandomNumber?.(width, "PressCX") ??
            (i * width) / bumps;
        const cy = TerrainBuilder?.getRandomNumber?.(height, "PressCY") ??
            (i * height) / bumps;
        const a = amp *
            (0.75 +
                (TerrainBuilder?.getRandomNumber?.(50, "PressA") ?? 0) / 100);
        centers.push({ x: Math.floor(cx), y: Math.floor(cy), a });
    }
    // Accumulate Gaussian bumps
    const acc = new Float32Array(size);
    const inv2s2 = 1.0 / (2 * sigma * sigma);
    let maxVal = 1e-6;
    for (let k = 0; k < centers.length; k++) {
        const { x: cx, y: cy, a } = centers[k];
        const yMin = Math.max(0, cy - sigma * 2);
        const yMax = Math.min(height - 1, cy + sigma * 2);
        const xMin = Math.max(0, cx - sigma * 2);
        const xMax = Math.min(width - 1, cx + sigma * 2);
        for (let y = yMin; y <= yMax; y++) {
            const dy = y - cy;
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - cx;
                const e = Math.exp(-(dx * dx + dy * dy) * inv2s2);
                const v = a * e;
                const i = idx(x, y, width);
                acc[i] += v;
                if (acc[i] > maxVal)
                    maxVal = acc[i];
            }
        }
    }
    // Normalize 0..255
    for (let i = 0; i < size; i++) {
        pressure[i] = toByte(acc[i] / maxVal);
    }
}
/**
 * Winds: zonal baseline by latitude band + a few jet streaks; tiny V component.
 * Output: windU, windV in approximate tile-units (-127..127)
 */
function computeWinds(width, height) {
    const U = _state.windU;
    const V = _state.windV;
    if (!U || !V)
        return;
    const windCfg = FOUNDATION_DYNAMICS?.wind || {};
    const streaks = Math.max(0, windCfg?.jetStreaks | 0 || 3);
    const jetStrength = Math.max(0, windCfg?.jetStrength ?? 1.0);
    const variance = Math.max(0, windCfg?.variance ?? 0.6);
    // Build jet streak latitude centers (absolute degrees)
    const streakLats = [];
    for (let s = 0; s < streaks; s++) {
        const base = 30 + s * (30 / Math.max(1, streaks - 1)); // between 30 and ~60
        const jitter = (TerrainBuilder?.getRandomNumber?.(12, "JetJit") ?? 0) - 6;
        streakLats.push(Math.max(15, Math.min(75, base + jitter)));
    }
    for (let y = 0; y < height; y++) {
        const latDeg = Math.abs(GameplayMap.getPlotLatitude(0, y));
        // Zonal baseline (Coriolis): 0–30 and 60–90 E→W (-), 30–60 W→E (+)
        let u = latDeg < 30 || latDeg >= 60 ? -80 : 80;
        let v = 0;
        // Jet amplification near streak latitudes
        for (let k = 0; k < streakLats.length; k++) {
            const d = Math.abs(latDeg - streakLats[k]);
            const f = Math.max(0, 1 - d / 12); // within ~12° band
            if (f > 0) {
                const boost = Math.round(32 * jetStrength * f);
                u += latDeg < streakLats[k] ? boost : -boost; // simple shear orientation
            }
        }
        // Per-row variance
        const varU = Math.round(((TerrainBuilder?.getRandomNumber?.(21, "WindUVar") ?? 0) -
            10) *
            variance) | 0;
        const varV = Math.round(((TerrainBuilder?.getRandomNumber?.(11, "WindVVar") ?? 0) - 5) *
            variance) | 0;
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);
            // Directionality bias for winds (cohesive global control)
            (function applyWindBias() {
                try {
                    const DIR = FOUNDATION_DIRECTIONALITY || {};
                    const cohesion = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                    const followPlates = Math.max(0, Math.min(1, DIR?.interplay?.windsFollowPlates ?? 0));
                    let biasDeg = DIR?.primaryAxes?.windBiasDeg ?? 0;
                    biasDeg +=
                        (DIR?.primaryAxes?.plateAxisDeg ?? 0) *
                            followPlates *
                            cohesion;
                    // Optional hemisphere flip around equator
                    const rawLat = GameplayMap.getPlotLatitude(0, y);
                    if ((DIR?.hemispheres?.southernFlip ?? false) &&
                        rawLat < 0) {
                        biasDeg = -biasDeg;
                    }
                    const angleJitter = (DIR?.variability?.angleJitterDeg ?? 0) | 0;
                    const jitter = (TerrainBuilder?.getRandomNumber?.(angleJitter * 2 + 1, "WindDirJit") ?? 0) - angleJitter;
                    const rad = ((biasDeg + jitter) * Math.PI) / 180;
                    const biasMag = Math.round(30 * cohesion);
                    const bu = Math.round(biasMag * Math.cos(rad));
                    const bv = Math.round(biasMag * Math.sin(rad));
                    U[i] = clampInt(u + varU + bu, -127, 127);
                    V[i] = clampInt(v + varV + bv, -127, 127);
                    return;
                }
                catch (_) {
                    /* fall back to baseline below */
                }
                U[i] = clampInt(u + varU, -127, 127);
                V[i] = clampInt(v + varV, -127, 127);
            })();
        }
    }
}
/**
 * Ocean currents: placeholder banded flows.
 * - Equatorial westward current near 0–12°
 * - Weak subpolar east/west hints at high latitudes
 */
function computeCurrents(width, height) {
    const U = _state.currentU;
    const V = _state.currentV;
    if (!U || !V)
        return;
    for (let y = 0; y < height; y++) {
        const latDeg = Math.abs(GameplayMap.getPlotLatitude(0, y));
        let baseU = 0;
        let baseV = 0;
        if (latDeg < 12) {
            baseU = -50; // westward
        }
        else if (latDeg >= 45 && latDeg < 60) {
            baseU = 20; // modest eastward mid-lat
        }
        else if (latDeg >= 60) {
            baseU = -15; // weak westward near polar
        }
        for (let x = 0; x < width; x++) {
            const i = idx(x, y, width);
            if (GameplayMap.isWater(x, y)) {
                // Directionality bias for currents + interplay with winds
                let cu = baseU;
                let cv = baseV;
                (function applyCurrentBias() {
                    try {
                        const DIR = FOUNDATION_DIRECTIONALITY || {};
                        const cohesion = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                        const windsFactor = Math.max(0, Math.min(1, DIR?.interplay?.currentsFollowWinds ?? 0)) * cohesion;
                        // Sample prevailing wind vector at the row center (cheap proxy)
                        let wu = 0, wv = 0;
                        if (_state.windU && _state.windV) {
                            const wi = idx(Math.floor(width / 2), y, width);
                            wu = _state.windU[wi] | 0;
                            wv = _state.windV[wi] | 0;
                        }
                        cu += Math.round(wu * windsFactor);
                        cv += Math.round(wv * windsFactor);
                        // Add global current bias (optionally nudged toward plate axis via winds-follow-plates)
                        let biasDeg = DIR?.primaryAxes?.currentBiasDeg ?? 0;
                        biasDeg +=
                            (DIR?.interplay?.windsFollowPlates ?? 0) *
                                (DIR?.primaryAxes?.plateAxisDeg ?? 0) *
                                cohesion *
                                0.5;
                        const angleJitter = (DIR?.variability?.angleJitterDeg ?? 0) | 0;
                        const jitter = (TerrainBuilder?.getRandomNumber?.(angleJitter * 2 + 1, "CurrentDirJit") ?? 0) - angleJitter;
                        // Optional hemisphere flip around equator
                        const rawLat = GameplayMap.getPlotLatitude(0, y);
                        if ((DIR?.hemispheres?.southernFlip ?? false) &&
                            rawLat < 0) {
                            biasDeg = -biasDeg;
                        }
                        const rad = ((biasDeg + jitter) * Math.PI) / 180;
                        const biasMag = Math.round(25 * cohesion);
                        cu += Math.round(biasMag * Math.cos(rad));
                        cv += Math.round(biasMag * Math.sin(rad));
                    }
                    catch (_) {
                        /* keep baseline cu/cv */
                    }
                })();
                U[i] = clampInt(cu, -127, 127);
                V[i] = clampInt(cv, -127, 127);
            }
            else {
                U[i] = 0;
                V[i] = 0;
            }
        }
    }
}
/* --------------------------------- utilities -------------------------------- */
function clampInt(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v | 0;
}
function toByte01(f) {
    const v = Math.max(0, Math.min(1, f));
    return Math.round(v * 255) | 0;
}
function toByte(v) {
    // Accept 0..1 or raw float values; clamp to [0..255]
    if (v <= 1 && v >= 0)
        return toByte01(v);
    return clampInt(Math.round(v), 0, 255);
}
export default WorldModel;
