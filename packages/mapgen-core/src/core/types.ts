/**
 * Core Types — MapContext, FoundationContext, and data contracts
 *
 * Purpose:
 * - Define the seam between pure logic and engine coupling
 * - MapContext holds all data dependencies for passes (fields, worldModel, rng, config)
 * - EngineAdapter abstracts read/write operations (enables testing, replay, diffing)
 *
 * Invariants:
 * - Passes should ONLY access engine APIs via the adapter
 * - RNG calls should go through ctx.rng() for deterministic replay
 * - Context is immutable reference (but fields are mutable for performance)
 */

import type { EngineAdapter, MapDimensions } from "@civ7/adapter";
import type { WorldModelState, SeedSnapshot } from "../world/types.js";
import type { MapConfig } from "../bootstrap/types.js";

// ============================================================================
// Field Buffer Types
// ============================================================================

/**
 * Typed arrays for terrain data
 */
export interface MapFields {
  rainfall: Uint8Array | null;
  elevation: Int16Array | null;
  temperature: Uint8Array | null;
  biomeId: Uint8Array | null;
  featureType: Int16Array | null;
  terrainType: Uint8Array | null;
}

/**
 * Primary morphology staging buffer.
 * Captures the heightfield before flushing to engine.
 */
export interface HeightfieldBuffer {
  elevation: Int16Array;
  terrain: Uint8Array;
  landMask: Uint8Array;
}

/**
 * Staged climate buffer for rainfall and humidity fields.
 */
export interface ClimateFieldBuffer {
  rainfall: Uint8Array;
  humidity: Uint8Array;
}

/**
 * Collection of reusable buffers shared across generation stages.
 */
export interface MapBuffers {
  heightfield: HeightfieldBuffer;
  climate: ClimateFieldBuffer;
  scratchMasks: Map<string, Uint8Array>;
}

// ============================================================================
// Story Overlay Types
// ============================================================================

/**
 * Immutable snapshot describing a sparse narrative overlay.
 */
export interface StoryOverlaySnapshot {
  key: string;
  kind: string;
  version: number;
  width: number;
  height: number;
  active?: readonly string[];
  passive?: readonly string[];
  summary: Readonly<Record<string, unknown>>;
}

/**
 * Registry of immutable story overlays published during generation.
 */
export type StoryOverlayRegistry = Map<string, StoryOverlaySnapshot>;

// ============================================================================
// Foundation Context Types
// ============================================================================

/**
 * Snapshot of configuration that informed the foundation run.
 */
export interface FoundationConfigSnapshot {
  seed: Readonly<Record<string, unknown>>;
  plates: Readonly<Record<string, unknown>>;
  dynamics: Readonly<Record<string, unknown>>;
  surface: Readonly<Record<string, unknown>>;
  policy: Readonly<Record<string, unknown>>;
  diagnostics: Readonly<Record<string, unknown>>;
}

/**
 * Plate-centric tensors emitted by the WorldModel.
 */
export interface FoundationPlateFields {
  id: Int16Array;
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  tectonicStress: Uint8Array;
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  shieldStability: Uint8Array;
  movementU: Int8Array;
  movementV: Int8Array;
  rotation: Int8Array;
}

/**
 * Atmospheric and oceanic tensors emitted by the WorldModel.
 */
export interface FoundationDynamicsFields {
  windU: Int8Array;
  windV: Int8Array;
  currentU: Int8Array;
  currentV: Int8Array;
  pressure: Uint8Array;
}

/**
 * Diagnostics payload accompanying the foundation tensors.
 */
export interface FoundationDiagnosticsFields {
  boundaryTree: unknown | null;
}

/**
 * Immutable data product emitted by the foundation stage.
 * Downstream stages rely on this instead of touching WorldModel directly.
 */
export interface FoundationContext {
  dimensions: Readonly<{ width: number; height: number; size: number }>;
  plateSeed: Readonly<SeedSnapshot> | null;
  plates: Readonly<FoundationPlateFields>;
  dynamics: Readonly<FoundationDynamicsFields>;
  diagnostics: Readonly<FoundationDiagnosticsFields>;
  config: Readonly<FoundationConfigSnapshot>;
}

// ============================================================================
// RNG and Metrics Types
// ============================================================================

/**
 * RNG state for deterministic replay
 */
export interface RNGState {
  callCounts: Map<string, number>;
  seed: number | null;
}

/**
 * Performance and validation metrics
 */
export interface GenerationMetrics {
  timings: Map<string, number>;
  histograms: Map<string, unknown>;
  warnings: string[];
}

// ============================================================================
// Extended MapContext
// ============================================================================

/**
 * Extended MapContext with all generation state.
 * This extends the minimal MapContext from @civ7/adapter.
 */
export interface ExtendedMapContext {
  dimensions: MapDimensions;
  fields: MapFields;
  worldModel: WorldModelState | null;
  rng: RNGState;
  config: MapConfig;
  metrics: GenerationMetrics;
  adapter: EngineAdapter;
  foundation: FoundationContext | null;
  /**
   * Published data products keyed by dependency tag (e.g. "artifact:climateField").
   * Used by PipelineExecutor for runtime requires/provides gating.
   */
  artifacts: Map<string, unknown>;
  buffers: MapBuffers;
  overlays: StoryOverlayRegistry;
}

// ============================================================================
// Factory Functions
// ============================================================================

const EMPTY_FROZEN_OBJECT = Object.freeze({});

/**
 * Create a new ExtendedMapContext with default/empty fields.
 */
export function createExtendedMapContext(
  dimensions: MapDimensions,
  adapter: EngineAdapter,
  config: MapConfig
): ExtendedMapContext {
  const { width, height } = dimensions;
  const size = width * height;

  const heightfield: HeightfieldBuffer = {
    elevation: new Int16Array(size),
    terrain: new Uint8Array(size),
    landMask: new Uint8Array(size),
  };

  const rainfall = new Uint8Array(size);
  const climate: ClimateFieldBuffer = {
    rainfall,
    humidity: new Uint8Array(size),
  };

  return {
    dimensions,
    fields: {
      rainfall,
      elevation: new Int16Array(size),
      temperature: new Uint8Array(size),
      biomeId: new Uint8Array(size),
      featureType: new Int16Array(size),
      terrainType: new Uint8Array(size),
    },
    worldModel: null,
    rng: {
      callCounts: new Map(),
      seed: null,
    },
    config,
    metrics: {
      timings: new Map(),
      histograms: new Map(),
      warnings: [],
    },
    adapter,
    foundation: null,
    artifacts: new Map(),
    buffers: {
      heightfield,
      climate,
      scratchMasks: new Map(),
    },
    overlays: new Map(),
  };
}

/**
 * Deterministic RNG helper for MapContext.
 * Tracks call counts per label for debugging and replay.
 */
export function ctxRandom(
  ctx: ExtendedMapContext,
  label: string,
  max: number
): number {
  const count = ctx.rng.callCounts.get(label) || 0;
  ctx.rng.callCounts.set(label, count + 1);
  return ctx.adapter.getRandomNumber(max, `${label}_${count}`);
}

// ============================================================================
// Heightfield and Climate Writers
// ============================================================================

export interface HeightfieldWriteOptions {
  terrain?: number;
  elevation?: number;
  isLand?: boolean;
}

/**
 * Write staged heightfield values and mirror to engine adapter.
 */
export function writeHeightfield(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  options: HeightfieldWriteOptions
): void {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const hf = ctx.buffers?.heightfield;

  if (hf) {
    if (typeof options.terrain === "number") {
      hf.terrain[idxValue] = options.terrain & 0xff;
    }
    if (typeof options.elevation === "number") {
      hf.elevation[idxValue] = options.elevation | 0;
    }
    if (typeof options.isLand === "boolean") {
      hf.landMask[idxValue] = options.isLand ? 1 : 0;
    }
  }

  if (typeof options.terrain === "number") {
    ctx.adapter.setTerrainType(x, y, options.terrain);
  }
}

export interface ClimateWriteOptions {
  rainfall?: number;
  humidity?: number;
}

/**
 * Write staged climate values and mirror to engine adapter.
 */
export function writeClimateField(
  ctx: ExtendedMapContext,
  x: number,
  y: number,
  options: ClimateWriteOptions
): void {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const climate = ctx.buffers?.climate;

  if (climate) {
    if (typeof options.rainfall === "number") {
      const rf = Math.max(0, Math.min(200, options.rainfall)) | 0;
      climate.rainfall[idxValue] = rf & 0xff;
      if (ctx.fields?.rainfall) {
        ctx.fields.rainfall[idxValue] = rf & 0xff;
      }
    }
    if (typeof options.humidity === "number") {
      const hum = Math.max(0, Math.min(255, options.humidity)) | 0;
      climate.humidity[idxValue] = hum & 0xff;
    }
  }

  if (typeof options.rainfall === "number") {
    ctx.adapter.setRainfall(
      x,
      y,
      Math.max(0, Math.min(200, options.rainfall)) | 0
    );
  }
}

// ============================================================================
// Foundation Context Helpers
// ============================================================================

function freezeConfigSnapshot(
  value: unknown
): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object") return EMPTY_FROZEN_OBJECT;
  try {
    return Object.freeze(value as Record<string, unknown>);
  } catch {
    return value as Record<string, unknown>;
  }
}

function ensureTensor<T extends { length: number }>(
  name: string,
  tensor: T | null | undefined,
  size: number
): T {
  if (!tensor || typeof tensor.length !== "number") {
    throw new Error(`[FoundationContext] Missing ${name} tensor.`);
  }
  if (tensor.length !== size) {
    throw new Error(
      `[FoundationContext] ${name} tensor length mismatch (expected ${size}, received ${tensor.length}).`
    );
  }
  return tensor;
}

export function validateFoundationContext(
  foundation: FoundationContext,
  dimensions: MapDimensions
): void {
  if (!foundation) {
    throw new Error("[FoundationContext] Missing foundation payload.");
  }
  if (!dimensions) {
    throw new Error("[FoundationContext] Map dimensions are required to validate foundation.");
  }

  const width = dimensions.width | 0;
  const height = dimensions.height | 0;
  const size = Math.max(0, width * height) | 0;

  if (size <= 0) {
    throw new Error("[FoundationContext] Invalid map dimensions.");
  }

  if (
    foundation.dimensions.width !== width ||
    foundation.dimensions.height !== height ||
    foundation.dimensions.size !== size
  ) {
    throw new Error(
      "[FoundationContext] Dimension mismatch between context and foundation payload."
    );
  }

  const { plates, dynamics } = foundation;

  ensureTensor("plateId", plates.id, size);
  ensureTensor("boundaryCloseness", plates.boundaryCloseness, size);
  ensureTensor("boundaryType", plates.boundaryType, size);
  ensureTensor("tectonicStress", plates.tectonicStress, size);
  ensureTensor("upliftPotential", plates.upliftPotential, size);
  ensureTensor("riftPotential", plates.riftPotential, size);
  ensureTensor("shieldStability", plates.shieldStability, size);
  ensureTensor("plateMovementU", plates.movementU, size);
  ensureTensor("plateMovementV", plates.movementV, size);
  ensureTensor("plateRotation", plates.rotation, size);
  ensureTensor("windU", dynamics.windU, size);
  ensureTensor("windV", dynamics.windV, size);
  ensureTensor("currentU", dynamics.currentU, size);
  ensureTensor("currentV", dynamics.currentV, size);
  ensureTensor("pressure", dynamics.pressure, size);
}

export interface CreateFoundationContextOptions {
  dimensions: MapDimensions;
  config?: Partial<FoundationConfigSnapshot>;
}

/**
 * Create an immutable FoundationContext snapshot from the active WorldModel state.
 */
export function createFoundationContext(
  worldModel: WorldModelState,
  options: CreateFoundationContextOptions
): FoundationContext {
  if (!worldModel?.initialized) {
    throw new Error(
      "[FoundationContext] WorldModel is not initialized or disabled."
    );
  }
  if (!options?.dimensions) {
    throw new Error(
      "[FoundationContext] Map dimensions are required to build the context."
    );
  }

  const width = options.dimensions.width | 0;
  const height = options.dimensions.height | 0;
  const size = Math.max(0, width * height) | 0;

  if (size <= 0) {
    throw new Error("[FoundationContext] Invalid map dimensions.");
  }

  const plateId = ensureTensor("plateId", worldModel.plateId, size);
  const boundaryCloseness = ensureTensor(
    "boundaryCloseness",
    worldModel.boundaryCloseness,
    size
  );
  const boundaryType = ensureTensor(
    "boundaryType",
    worldModel.boundaryType,
    size
  );
  const tectonicStress = ensureTensor(
    "tectonicStress",
    worldModel.tectonicStress,
    size
  );
  const upliftPotential = ensureTensor(
    "upliftPotential",
    worldModel.upliftPotential,
    size
  );
  const riftPotential = ensureTensor(
    "riftPotential",
    worldModel.riftPotential,
    size
  );
  const shieldStability = ensureTensor(
    "shieldStability",
    worldModel.shieldStability,
    size
  );
  const plateMovementU = ensureTensor(
    "plateMovementU",
    worldModel.plateMovementU,
    size
  );
  const plateMovementV = ensureTensor(
    "plateMovementV",
    worldModel.plateMovementV,
    size
  );
  const plateRotation = ensureTensor(
    "plateRotation",
    worldModel.plateRotation,
    size
  );
  const windU = ensureTensor("windU", worldModel.windU, size);
  const windV = ensureTensor("windV", worldModel.windV, size);
  const currentU = ensureTensor("currentU", worldModel.currentU, size);
  const currentV = ensureTensor("currentV", worldModel.currentV, size);
  const pressure = ensureTensor("pressure", worldModel.pressure, size);

  const configInput = options.config || {};
  const configSnapshot: FoundationConfigSnapshot = {
    seed: freezeConfigSnapshot(configInput.seed),
    plates: freezeConfigSnapshot(configInput.plates),
    dynamics: freezeConfigSnapshot(configInput.dynamics),
    surface: freezeConfigSnapshot(configInput.surface),
    policy: freezeConfigSnapshot(configInput.policy),
    diagnostics: freezeConfigSnapshot(configInput.diagnostics),
  };

  return Object.freeze({
    dimensions: Object.freeze({ width, height, size }),
    plateSeed: worldModel.plateSeed || null,
    plates: Object.freeze({
      id: plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      movementU: plateMovementU,
      movementV: plateMovementV,
      rotation: plateRotation,
    }),
    dynamics: Object.freeze({ windU, windV, currentU, currentV, pressure }),
    diagnostics: Object.freeze({
      boundaryTree: worldModel.boundaryTree || null,
    }),
    config: Object.freeze(configSnapshot),
  });
}

/**
 * Check whether the provided context already carries a FoundationContext.
 */
export function hasFoundationContext(
  ctx: ExtendedMapContext
): ctx is ExtendedMapContext & { foundation: FoundationContext } {
  return !!(ctx && ctx.foundation && typeof ctx.foundation === "object");
}

/**
 * Assert that a FoundationContext exists on the provided context.
 * Throws when absent so stages fail loudly instead of running with stale data.
 */
export function assertFoundationContext(
  ctx: ExtendedMapContext,
  stage?: string
): FoundationContext {
  if (hasFoundationContext(ctx)) {
    validateFoundationContext(ctx.foundation, ctx.dimensions);
    return ctx.foundation;
  }
  const message = stage
    ? `[StageManifest] Stage "${stage}" requires FoundationContext but it is unavailable.`
    : "[StageManifest] Required FoundationContext is unavailable.";
  throw new Error(message);
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Synchronize staged heightfield buffers from the current engine surface.
 */
export function syncHeightfield(ctx: ExtendedMapContext): void {
  if (!ctx?.adapter) return;
  const hf = ctx.buffers?.heightfield;
  if (!hf) return;

  const { width, height } = ctx.dimensions;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxValue = y * width + x;
      const terrain = ctx.adapter.getTerrainType(x, y);
      if (terrain != null) {
        hf.terrain[idxValue] = terrain & 0xff;
      }
      const elevation = ctx.adapter.getElevation(x, y);
      if (Number.isFinite(elevation)) {
        hf.elevation[idxValue] = elevation | 0;
      }
      hf.landMask[idxValue] = ctx.adapter.isWater(x, y) ? 0 : 1;
    }
  }
}

/**
 * Synchronize staged climate buffers from the current engine surface.
 */
export function syncClimateField(_ctx: ExtendedMapContext): never {
  throw new Error(
    "[MapContext] syncClimateField has been removed. Climate buffers are now canonical; seed rainfall via climate stages/artifacts instead of reading from the engine adapter."
  );
}
