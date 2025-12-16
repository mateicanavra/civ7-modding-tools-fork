/**
 * WorldModel — Earth Forces Simulation (Physics-Based Plate Tectonics)
 *
 * Purpose:
 * - Precompute global "world fields" (plates, plate boundaries, uplift/rift potentials,
 *   winds, ocean currents, mantle pressure) using proper Voronoi diagrams and physics.
 * - These fields are read-only for other layers (tagging, climate, coasts, corridors) to use later.
 * - Keep conservative defaults; remain fully optional via config toggle.
 *
 * Invariants:
 * - Never mutate engine surfaces from here; this module only computes arrays/fields.
 * - Keep complexity O(width × height) with small constants; no flood fills.
 *
 * Architecture:
 * - Pure TypeScript implementation with dependency injection for testability
 * - Uses lazy initialization to avoid crashes when globals unavailable
 */

/// <reference types="@civ7/types" />

import type {
  WorldModelState,
  PlateConfig,
  DirectionalityConfig,
  SeedSnapshot,
  RngFunction,
} from "./types.js";
import { BOUNDARY_TYPE } from "./types.js";
import { computePlatesVoronoi, type ComputePlatesOptions } from "./plates.js";
import { PlateSeedManager } from "./plate-seed.js";
import { devLogIf } from "../dev/index.js";
import { idx } from "../lib/grid/index.js";
import { clampInt } from "../lib/math/index.js";

// ============================================================================
// Internal State
// ============================================================================

const _state: WorldModelState = {
  initialized: false,
  width: 0,
  height: 0,
  plateId: null,
  boundaryCloseness: null,
  boundaryType: null,
  tectonicStress: null,
  upliftPotential: null,
  riftPotential: null,
  shieldStability: null,
  plateMovementU: null,
  plateMovementV: null,
  plateRotation: null,
  windU: null,
  windV: null,
  currentU: null,
  currentV: null,
  pressure: null,
  boundaryTree: null,
  plateSeed: null,
};

// ============================================================================
// Configuration Providers (lazy getters for testability)
// ============================================================================

export interface WorldModelConfig {
  plates?: Partial<PlateConfig>;
  dynamics?: {
    mantle?: {
      bumps?: number;
      amplitude?: number;
      scale?: number;
    };
    wind?: {
      jetStreaks?: number;
      jetStrength?: number;
      variance?: number;
    };
  };
  directionality?: DirectionalityConfig;
}

let _configProvider: (() => WorldModelConfig) | null = null;

/**
 * Set the configuration provider for WorldModel.
 * This allows lazy loading of config to avoid import-time crashes.
 */
export function setConfigProvider(provider: () => WorldModelConfig): void {
  _configProvider = provider;
}

/**
 * Test-only helper to clear the config provider.
 * This keeps unit tests isolated without affecting runtime reset semantics.
 */
export function resetConfigProviderForTest(): void {
  _configProvider = null;
}

function getConfig(): WorldModelConfig {
  if (_configProvider) {
    return _configProvider();
  }
  throw new Error(
    "WorldModel configuration provider not set. MapOrchestrator must bind a provider before WorldModel.init()."
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function toByte01(f: number): number {
  const v = Math.max(0, Math.min(1, f));
  return Math.round(v * 255) | 0;
}

function toByte(v: number): number {
  if (v <= 1 && v >= 0) return toByte01(v);
  return clampInt(Math.round(v), 0, 255);
}

// ============================================================================
// Plate Computation
// ============================================================================

// Defaults for plates/dynamics/wind now live in the config schema (src/config/schema.ts).
// WorldModel assumes it receives fully validated config via tunables/MapGenConfig.
function computePlates(
  width: number,
  height: number,
  options?: ComputePlatesOptions
): void {
  const config = getConfig();
  const platesCfg = config.plates || {};

  // Schema defaults and min/max constraints are enforced by parseConfig.
  // Integer conversion (| 0) retained for runtime safety; no re-defaulting.
  const count = (platesCfg.count! | 0);
  const convergenceMix = platesCfg.convergenceMix!;
  const relaxationSteps = (platesCfg.relaxationSteps! | 0);
  const plateRotationMultiple = platesCfg.plateRotationMultiple!;
  const seedMode = platesCfg.seedMode!;
  const seedOffset = Math.trunc(platesCfg.seedOffset!);
  const fixedSeed = Number.isFinite(platesCfg.fixedSeed)
    ? Math.trunc(platesCfg.fixedSeed!)
    : undefined;

  const configSnapshot: PlateConfig = {
    count,
    relaxationSteps,
    convergenceMix,
    plateRotationMultiple,
    seedMode,
    fixedSeed,
    seedOffset,
    directionality: config.directionality ?? null,
  };

  devLogIf(
    "LOG_FOUNDATION_PLATES",
    `[WorldModel] Config plates.count=${count}, relaxationSteps=${relaxationSteps}, ` +
      `convergenceMix=${convergenceMix}, rotationMultiple=${plateRotationMultiple}, ` +
      `seedMode=${seedMode}, seedOffset=${seedOffset}, fixedSeed=${fixedSeed ?? "n/a"}`
  );

  const windCfg = config.dynamics?.wind;
  const mantleCfg = config.dynamics?.mantle;
  const directionalityCfg = configSnapshot.directionality;

  devLogIf(
    "LOG_FOUNDATION_DYNAMICS",
    `[WorldModel] Config dynamics.wind jetStreaks=${windCfg?.jetStreaks ?? "n/a"}, ` +
      `jetStrength=${windCfg?.jetStrength ?? "n/a"}, variance=${windCfg?.variance ?? "n/a"}; ` +
      `mantle.bumps=${mantleCfg?.bumps ?? "n/a"}, amplitude=${mantleCfg?.amplitude ?? "n/a"}, ` +
      `scale=${mantleCfg?.scale ?? "n/a"}; ` +
      `directionality.cohesion=${directionalityCfg?.cohesion ?? "n/a"}, ` +
      `plateAxisDeg=${directionalityCfg?.primaryAxes?.plateAxisDeg ?? "n/a"}, ` +
      `windsFollowPlates=${directionalityCfg?.interplay?.windsFollowPlates ?? "n/a"}`
  );

  const { snapshot: seedBase, restore: restoreSeed } = PlateSeedManager.capture(
    width,
    height,
    configSnapshot
  );

  let plateData = null;
  try {
    plateData = computePlatesVoronoi(width, height, configSnapshot, options);
  } finally {
    if (typeof restoreSeed === "function") {
      try {
        restoreSeed();
      } catch {
        /* no-op */
      }
    }
  }

  if (!plateData) {
    const fallbackConfig = Object.freeze({ ...configSnapshot });
    const fallbackSeed = seedBase
      ? Object.freeze({
          ...seedBase,
          config: fallbackConfig,
        })
      : Object.freeze({
          width,
          height,
          seedMode: "engine" as const,
          config: fallbackConfig,
        });

    _state.plateSeed =
      PlateSeedManager.finalize(seedBase, { config: configSnapshot }) || fallbackSeed;
    return;
  }

  // Copy results into state arrays
  _state.plateId!.set(plateData.plateId);
  _state.boundaryCloseness!.set(plateData.boundaryCloseness);
  _state.boundaryType!.set(plateData.boundaryType);
  _state.tectonicStress!.set(plateData.tectonicStress);
  _state.upliftPotential!.set(plateData.upliftPotential);
  _state.riftPotential!.set(plateData.riftPotential);
  _state.shieldStability!.set(plateData.shieldStability);
  _state.plateMovementU!.set(plateData.plateMovementU);
  _state.plateMovementV!.set(plateData.plateMovementV);
  _state.plateRotation!.set(plateData.plateRotation);

  _state.boundaryTree = plateData.boundaryTree;

  const meta = plateData.meta;
  _state.plateSeed =
    PlateSeedManager.finalize(seedBase, {
      config: configSnapshot,
      meta: meta ? { seedLocations: meta.seedLocations } : undefined,
    }) ||
    Object.freeze({
      width,
      height,
      seedMode: "engine" as const,
      config: Object.freeze({ ...configSnapshot }),
    });
}

// ============================================================================
// Pressure Computation
// ============================================================================

function computePressure(width: number, height: number, rng?: RngFunction): void {
  const size = width * height;
  const pressure = _state.pressure;
  if (!pressure) return;

  const config = getConfig();
  const mantleCfg = config.dynamics?.mantle || {};
  // Schema defaults and min/max constraints are enforced by parseConfig.
  const bumps = (mantleCfg.bumps! | 0);
  const amp = mantleCfg.amplitude!;
  const scl = mantleCfg.scale!;
  const sigma = Math.max(4, Math.floor(Math.min(width, height) * scl));

  const getRandom = rng || getDefaultRng();

  // Random bump centers
  const centers: Array<{ x: number; y: number; a: number }> = [];
  for (let i = 0; i < bumps; i++) {
    const cx = getRandom(width, "PressCX");
    const cy = getRandom(height, "PressCY");
    const a = amp * (0.75 + getRandom(50, "PressA") / 100);
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
        if (acc[i] > maxVal) maxVal = acc[i];
      }
    }
  }

  // Normalize 0..255
  for (let i = 0; i < size; i++) {
    pressure[i] = toByte(acc[i] / maxVal);
  }
}

// ============================================================================
// Wind Computation
// ============================================================================

function computeWinds(
  width: number,
  height: number,
  getLatitude?: (x: number, y: number) => number,
  rng?: RngFunction
): void {
  const U = _state.windU;
  const V = _state.windV;
  if (!U || !V) return;

  const config = getConfig();
  const windCfg = config.dynamics?.wind || {};
  // Schema defaults and min/max constraints are enforced by parseConfig.
  const streaks = (windCfg.jetStreaks! | 0);
  const jetStrength = windCfg.jetStrength!;
  const variance = windCfg.variance!;

  const getRandom = rng || getDefaultRng();
  const getLat =
    getLatitude ||
    ((x: number, y: number) => {
      const global = globalThis as Record<string, unknown>;
      if (
        global.GameplayMap &&
        typeof (global.GameplayMap as Record<string, unknown>).getPlotLatitude === "function"
      ) {
        return (global.GameplayMap as { getPlotLatitude: (x: number, y: number) => number })
          .getPlotLatitude(x, y);
      }
      // Fallback: estimate latitude from y position
      return ((y / height) * 180 - 90) * -1;
    });

  // Build jet streak latitude centers
  const streakLats: number[] = [];
  for (let s = 0; s < streaks; s++) {
    const base = 30 + s * (30 / Math.max(1, streaks - 1));
    const jitter = getRandom(12, "JetJit") - 6;
    streakLats.push(Math.max(15, Math.min(75, base + jitter)));
  }

  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(getLat(0, y));

    // Zonal baseline (Coriolis)
    let u = latDeg < 30 || latDeg >= 60 ? -80 : 80;
    const v = 0;

    // Jet amplification
    for (let k = 0; k < streakLats.length; k++) {
      const d = Math.abs(latDeg - streakLats[k]);
      const f = Math.max(0, 1 - d / 12);
      if (f > 0) {
        const boost = Math.round(32 * jetStrength * f);
        u += latDeg < streakLats[k] ? boost : -boost;
      }
    }

    // Per-row variance
    const varU = Math.round((getRandom(21, "WindUVar") - 10) * variance) | 0;
    const varV = Math.round((getRandom(11, "WindVVar") - 5) * variance) | 0;

    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      U[i] = clampInt(u + varU, -127, 127);
      V[i] = clampInt(v + varV, -127, 127);
    }
  }
}

// ============================================================================
// Ocean Current Computation
// ============================================================================

function computeCurrents(
  width: number,
  height: number,
  isWater?: (x: number, y: number) => boolean,
  getLatitude?: (x: number, y: number) => number
): void {
  const U = _state.currentU;
  const V = _state.currentV;
  if (!U || !V) return;

  const checkWater =
    isWater ||
    ((x: number, y: number) => {
      const global = globalThis as Record<string, unknown>;
      if (
        global.GameplayMap &&
        typeof (global.GameplayMap as Record<string, unknown>).isWater === "function"
      ) {
        return (global.GameplayMap as { isWater: (x: number, y: number) => boolean }).isWater(
          x,
          y
        );
      }
      return false;
    });

  const getLat =
    getLatitude ||
    ((x: number, y: number) => {
      const global = globalThis as Record<string, unknown>;
      if (
        global.GameplayMap &&
        typeof (global.GameplayMap as Record<string, unknown>).getPlotLatitude === "function"
      ) {
        return (global.GameplayMap as { getPlotLatitude: (x: number, y: number) => number })
          .getPlotLatitude(x, y);
      }
      return ((y / height) * 180 - 90) * -1;
    });

  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(getLat(0, y));

    let baseU = 0;
    const baseV = 0;

    if (latDeg < 12) {
      baseU = -50; // westward
    } else if (latDeg >= 45 && latDeg < 60) {
      baseU = 20; // modest eastward mid-lat
    } else if (latDeg >= 60) {
      baseU = -15; // weak westward near polar
    }

    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      if (checkWater(x, y)) {
        U[i] = clampInt(baseU, -127, 127);
        V[i] = clampInt(baseV, -127, 127);
      } else {
        U[i] = 0;
        V[i] = 0;
      }
    }
  }
}

// ============================================================================
// Default RNG Helper
// ============================================================================

function getDefaultRng(): RngFunction {
  const global = globalThis as Record<string, unknown>;
  if (global.TerrainBuilder) {
    const tb = global.TerrainBuilder as Record<string, unknown>;
    if (typeof tb.getRandomNumber === "function") {
      console.log("[WorldModel] Using TerrainBuilder.getRandomNumber as RNG");
      return (tb as { getRandomNumber: RngFunction }).getRandomNumber.bind(tb);
    }
  }
  console.log("[WorldModel] Using Math.random as RNG");
  return (max) => Math.floor(Math.random() * max);
}

// ============================================================================
// WorldModel Public API
// ============================================================================

export interface WorldModelInterface {
  // Initialization state
  readonly initialized: boolean;
  readonly width: number;
  readonly height: number;

  isEnabled(): boolean;
  init(options?: InitOptions): boolean;
  reset(): void;

  // Getters for state arrays
  readonly plateId: Int16Array | null;
  readonly boundaryCloseness: Uint8Array | null;
  readonly boundaryType: Uint8Array | null;
  readonly tectonicStress: Uint8Array | null;
  readonly upliftPotential: Uint8Array | null;
  readonly riftPotential: Uint8Array | null;
  readonly shieldStability: Uint8Array | null;
  readonly windU: Int8Array | null;
  readonly windV: Int8Array | null;
  readonly currentU: Int8Array | null;
  readonly currentV: Int8Array | null;
  readonly pressure: Uint8Array | null;
  readonly plateMovementU: Int8Array | null;
  readonly plateMovementV: Int8Array | null;
  readonly plateRotation: Int8Array | null;
  readonly boundaryTree: unknown | null;
  readonly plateSeed: Readonly<SeedSnapshot> | null;
}

export interface InitOptions {
  /** Override width (default: from GameplayMap) */
  width?: number;
  /** Override height (default: from GameplayMap) */
  height?: number;
  /** Custom RNG function */
  rng?: RngFunction;
  /** Custom isWater check */
  isWater?: (x: number, y: number) => boolean;
  /** Custom latitude function */
  getLatitude?: (x: number, y: number) => number;
  /** Plate generation options */
  plateOptions?: ComputePlatesOptions;
}

export const WorldModel: WorldModelInterface = {
  get initialized() {
    return _state.initialized;
  },

  get width() {
    return _state.width;
  },

  get height() {
    return _state.height;
  },

  isEnabled(): boolean {
    return !!_state.initialized;
  },

  init(options: InitOptions = {}): boolean {
    if (_state.initialized) return true;

    // Get dimensions from options or game API
    let width = options.width;
    let height = options.height;

    if (width === undefined || height === undefined) {
      const global = globalThis as Record<string, unknown>;
      if (global.GameplayMap) {
        const gm = global.GameplayMap as {
          getGridWidth?: () => number;
          getGridHeight?: () => number;
        };
        if (typeof gm.getGridWidth === "function" && typeof gm.getGridHeight === "function") {
          width = width ?? gm.getGridWidth();
          height = height ?? gm.getGridHeight();
        }
      }
    }

    if (width === undefined || height === undefined) {
      console.warn("[WorldModel] Cannot initialize: dimensions not available");
      return false;
    }

    _state.width = width | 0;
    _state.height = height | 0;
    const size = Math.max(0, width * height) | 0;

    console.log(
      `[WorldModel] init starting with dimensions ${_state.width}x${_state.height} (size=${size})`
    );

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

    // Compute fields
    console.log("[WorldModel] computePlates starting");
    computePlates(width, height, options.plateOptions);
    console.log("[WorldModel] computePlates succeeded");

    console.log("[WorldModel] computePressure starting");
    computePressure(width, height, options.rng);
    console.log("[WorldModel] computePressure succeeded");

    console.log("[WorldModel] computeWinds starting");
    computeWinds(width, height, options.getLatitude, options.rng);
    console.log("[WorldModel] computeWinds succeeded");

    console.log("[WorldModel] computeCurrents starting");
    computeCurrents(width, height, options.isWater, options.getLatitude);
    console.log("[WorldModel] computeCurrents succeeded");

    _state.initialized = true;
    console.log("[WorldModel] init completed successfully");
    return true;
  },

  reset(): void {
    _state.initialized = false;
    _state.width = 0;
    _state.height = 0;
    _state.plateId = null;
    _state.boundaryCloseness = null;
    _state.boundaryType = null;
    _state.tectonicStress = null;
    _state.upliftPotential = null;
    _state.riftPotential = null;
    _state.shieldStability = null;
    _state.plateMovementU = null;
    _state.plateMovementV = null;
    _state.plateRotation = null;
    _state.windU = null;
    _state.windV = null;
    _state.currentU = null;
    _state.currentV = null;
    _state.pressure = null;
    _state.boundaryTree = null;
    _state.plateSeed = null;
  },

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

export default WorldModel;

// Re-export BOUNDARY_TYPE for convenience
export { BOUNDARY_TYPE };
