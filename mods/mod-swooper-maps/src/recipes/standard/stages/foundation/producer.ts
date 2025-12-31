import type { ExtendedMapContext, FoundationContext } from "@swooper/mapgen-core";
import {
  FOUNDATION_CONFIG_ARTIFACT_TAG,
  FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
  FOUNDATION_DYNAMICS_ARTIFACT_TAG,
  FOUNDATION_PLATES_ARTIFACT_TAG,
  FOUNDATION_SEED_ARTIFACT_TAG,
  createFoundationContext,
  ctxRandom,
  validateFoundationContext,
  devLogIf,
  idx,
  clampInt,
} from "@swooper/mapgen-core";
import type { FoundationConfig } from "@mapgen/config";
import { PlateSeedManager } from "@mapgen/domain/foundation/plate-seed.js";
import { computePlatesVoronoi } from "@mapgen/domain/foundation/plates.js";
import type {
  PlateConfig,
  RngFunction,
  SeedSnapshot,
  VoronoiUtilsInterface,
} from "@mapgen/domain/foundation/types.js";

interface PlateFieldsResult {
  plates: FoundationContext["plates"];
  plateSeed: Readonly<SeedSnapshot> | null;
  diagnostics: FoundationContext["diagnostics"];
}

interface DynamicsFieldsResult {
  dynamics: FoundationContext["dynamics"];
}

function requireRng(rng: RngFunction | undefined, scope: string): RngFunction {
  if (!rng) {
    throw new Error(`[Foundation] RNG not provided for ${scope}.`);
  }
  return rng;
}

function buildPlateConfig(config: FoundationConfig): PlateConfig {
  const platesCfg = config.plates || {};
  const directionality = config.dynamics?.directionality ?? null;

  const count = (platesCfg.count! | 0);
  const convergenceMix = platesCfg.convergenceMix!;
  const relaxationSteps = (platesCfg.relaxationSteps! | 0);
  const plateRotationMultiple = platesCfg.plateRotationMultiple!;
  const seedMode = platesCfg.seedMode!;
  const seedOffset = Math.trunc(platesCfg.seedOffset!);
  const fixedSeed = Number.isFinite(platesCfg.fixedSeed)
    ? Math.trunc(platesCfg.fixedSeed!)
    : undefined;

  return {
    count,
    relaxationSteps,
    convergenceMix,
    plateRotationMultiple,
    seedMode,
    fixedSeed,
    seedOffset,
    directionality,
  };
}

function computePlates(
  width: number,
  height: number,
  config: FoundationConfig,
  rng: RngFunction,
  voronoiUtils: VoronoiUtilsInterface
): PlateFieldsResult {
  const plateConfig = buildPlateConfig(config);

  devLogIf(
    "LOG_FOUNDATION_PLATES",
    `[Foundation] Config plates.count=${plateConfig.count}, relaxationSteps=${plateConfig.relaxationSteps}, ` +
      `convergenceMix=${plateConfig.convergenceMix}, rotationMultiple=${plateConfig.plateRotationMultiple}, ` +
      `seedMode=${plateConfig.seedMode}, seedOffset=${plateConfig.seedOffset}, fixedSeed=${
        plateConfig.fixedSeed ?? "n/a"
      }`
  );

  const windCfg = config.dynamics?.wind;
  const mantleCfg = config.dynamics?.mantle;
  const directionalityCfg = plateConfig.directionality;

  devLogIf(
    "LOG_FOUNDATION_DYNAMICS",
    `[Foundation] Config dynamics.wind jetStreaks=${windCfg?.jetStreaks ?? "n/a"}, ` +
      `jetStrength=${windCfg?.jetStrength ?? "n/a"}, variance=${windCfg?.variance ?? "n/a"}; ` +
      `mantle.bumps=${mantleCfg?.bumps ?? "n/a"}, amplitude=${mantleCfg?.amplitude ?? "n/a"}, ` +
      `scale=${mantleCfg?.scale ?? "n/a"}; ` +
      `directionality.cohesion=${directionalityCfg?.cohesion ?? "n/a"}, ` +
      `plateAxisDeg=${directionalityCfg?.primaryAxes?.plateAxisDeg ?? "n/a"}, ` +
      `windsFollowPlates=${directionalityCfg?.interplay?.windsFollowPlates ?? "n/a"}`
  );

  const { snapshot: seedBase } = PlateSeedManager.capture(width, height, plateConfig);
  let plateData: ReturnType<typeof computePlatesVoronoi> | null = null;
  plateData = computePlatesVoronoi(width, height, plateConfig, { rng, voronoiUtils });

  if (!plateData) {
    throw new Error("[Foundation] Plate generation failed.");
  }

  const meta = plateData.meta;
  const plateSeed =
    PlateSeedManager.finalize(seedBase, {
      config: plateConfig,
      meta: meta ? { seedLocations: meta.seedLocations } : undefined,
    }) ||
    Object.freeze({
      width,
      height,
      seedMode: "engine" as const,
      config: Object.freeze({ ...plateConfig }),
    });

  return {
    plates: Object.freeze({
      id: plateData.plateId,
      boundaryCloseness: plateData.boundaryCloseness,
      boundaryType: plateData.boundaryType,
      tectonicStress: plateData.tectonicStress,
      upliftPotential: plateData.upliftPotential,
      riftPotential: plateData.riftPotential,
      shieldStability: plateData.shieldStability,
      movementU: plateData.plateMovementU,
      movementV: plateData.plateMovementV,
      rotation: plateData.plateRotation,
    }),
    plateSeed,
    diagnostics: Object.freeze({ boundaryTree: plateData.boundaryTree ?? null }),
  };
}

function computePressure(
  width: number,
  height: number,
  config: FoundationConfig,
  rng: RngFunction
): Uint8Array {
  const size = width * height;
  const pressure = new Uint8Array(size);

  const mantleCfg = config.dynamics?.mantle || {};
  const bumps = (mantleCfg.bumps! | 0);
  const amp = mantleCfg.amplitude!;
  const scl = mantleCfg.scale!;
  const sigma = Math.max(4, Math.floor(Math.min(width, height) * scl));

  // Random bump centers
  const centers: Array<{ x: number; y: number; a: number }> = [];
  for (let i = 0; i < bumps; i++) {
    const cx = rng(width, "PressCX");
    const cy = rng(height, "PressCY");
    const a = amp * (0.75 + rng(50, "PressA") / 100);
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
    const value = acc[i] / maxVal;
    const clamped = Math.max(0, Math.min(1, value));
    pressure[i] = Math.round(clamped * 255) | 0;
  }

  return pressure;
}

function computeWinds(
  width: number,
  height: number,
  config: FoundationConfig,
  getLatitude: (x: number, y: number) => number,
  rng: RngFunction
): { windU: Int8Array; windV: Int8Array } {
  const size = width * height;
  const windU = new Int8Array(size);
  const windV = new Int8Array(size);

  const windCfg = config.dynamics?.wind || {};
  const streaks = (windCfg.jetStreaks! | 0);
  const jetStrength = windCfg.jetStrength!;
  const variance = windCfg.variance!;

  const getLat = getLatitude;

  // Build jet streak latitude centers
  const streakLats: number[] = [];
  for (let s = 0; s < streaks; s++) {
    const base = 30 + s * (30 / Math.max(1, streaks - 1));
    const jitter = rng(12, "JetJit") - 6;
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
    const varU = Math.round((rng(21, "WindUVar") - 10) * variance) | 0;
    const varV = Math.round((rng(11, "WindVVar") - 5) * variance) | 0;

    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      windU[i] = clampInt(u + varU, -127, 127);
      windV[i] = clampInt(v + varV, -127, 127);
    }
  }

  return { windU, windV };
}

function computeCurrents(
  width: number,
  height: number,
  isWater: (x: number, y: number) => boolean,
  getLatitude: (x: number, y: number) => number
): { currentU: Int8Array; currentV: Int8Array } {
  const size = width * height;
  const currentU = new Int8Array(size);
  const currentV = new Int8Array(size);

  const checkWater = isWater;
  const getLat = getLatitude;

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
        currentU[i] = clampInt(baseU, -127, 127);
        currentV[i] = clampInt(baseV, -127, 127);
      } else {
        currentU[i] = 0;
        currentV[i] = 0;
      }
    }
  }

  return { currentU, currentV };
}

function computeDynamics(
  width: number,
  height: number,
  config: FoundationConfig,
  rng: RngFunction,
  getLatitude: (x: number, y: number) => number,
  isWater: (x: number, y: number) => boolean
): DynamicsFieldsResult {
  const pressure = computePressure(width, height, config, rng);
  const { windU, windV } = computeWinds(width, height, config, getLatitude, rng);
  const { currentU, currentV } = computeCurrents(width, height, isWater, getLatitude);

  return {
    dynamics: Object.freeze({ windU, windV, currentU, currentV, pressure }),
  };
}

export function buildFoundationContext(
  context: ExtendedMapContext,
  foundationConfig: FoundationConfig
): FoundationContext {
  const { width, height } = context.dimensions;
  const size = Math.max(0, width * height) | 0;

  if (size <= 0) {
    throw new Error("[Foundation] Invalid map dimensions.");
  }

  const foundationCfg = foundationConfig;
  const rng = requireRng(
    (max: number, label = "Foundation") => ctxRandom(context, label, max),
    "buildFoundationContext"
  );
  const { adapter } = context;

  if (typeof adapter.getLatitude !== "function") {
    throw new Error("[Foundation] Adapter missing getLatitude.");
  }
  if (typeof adapter.isWater !== "function") {
    throw new Error("[Foundation] Adapter missing isWater.");
  }
  if (typeof adapter.getVoronoiUtils !== "function") {
    throw new Error("[Foundation] Adapter missing getVoronoiUtils.");
  }

  const plateResult = computePlates(width, height, foundationCfg, rng, adapter.getVoronoiUtils());
  const dynamicsResult = computeDynamics(
    width,
    height,
    foundationCfg,
    rng,
    (x, y) => adapter.getLatitude(x, y),
    (x, y) => adapter.isWater(x, y)
  );

  const foundationContext = createFoundationContext(
    {
      plates: plateResult.plates,
      dynamics: dynamicsResult.dynamics,
      plateSeed: plateResult.plateSeed,
      diagnostics: plateResult.diagnostics,
    },
    {
      dimensions: context.dimensions,
      config: {
        seed: (foundationCfg.seed || {}) as Record<string, unknown>,
        plates: (foundationCfg.plates || {}) as Record<string, unknown>,
        dynamics: foundationCfg.dynamics as Record<string, unknown>,
        surface: (foundationCfg.surface || {}) as Record<string, unknown>,
        policy: (foundationCfg.policy || {}) as Record<string, unknown>,
        diagnostics: (foundationCfg.diagnostics || {}) as Record<string, unknown>,
      },
    }
  );

  validateFoundationContext(foundationContext, context.dimensions);
  return foundationContext;
}

export function runFoundationStage(
  context: ExtendedMapContext,
  foundationConfig: FoundationConfig
): FoundationContext {
  const foundationContext = buildFoundationContext(context, foundationConfig);

  context.artifacts.set(FOUNDATION_PLATES_ARTIFACT_TAG, foundationContext.plates);
  context.artifacts.set(FOUNDATION_DYNAMICS_ARTIFACT_TAG, foundationContext.dynamics);
  if (!foundationContext.plateSeed) {
    throw new Error("[Foundation] Missing plate seed snapshot.");
  }
  context.artifacts.set(FOUNDATION_SEED_ARTIFACT_TAG, foundationContext.plateSeed);
  context.artifacts.set(FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG, foundationContext.diagnostics);
  context.artifacts.set(FOUNDATION_CONFIG_ARTIFACT_TAG, foundationContext.config);

  return foundationContext;
}
