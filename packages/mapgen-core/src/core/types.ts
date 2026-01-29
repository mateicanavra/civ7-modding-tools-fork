/**
 * Core Types — MapContext and data contracts
 *
 * Purpose:
 * - Define the seam between pure logic and engine coupling
 * - MapContext holds all data dependencies for passes (buffers/fields, rng)
 * - EngineAdapter abstracts read/write operations (enables testing, replay, diffing)
 *
 * Invariants:
 * - Passes should ONLY access engine APIs via the adapter
 * - RNG calls should go through ctx.rng() for deterministic replay
 * - Context is immutable reference (but buffers/fields are mutable for performance)
 * - Buffers are currently treated as artifacts for pipeline gating and DX
 *   (see ArtifactStore + MapBuffers notes for the temporary exception).
 */

import type { EngineAdapter, MapDimensions } from "@civ7/adapter";
import type { Env } from "@mapgen/core/env.js";
import { initializeTerrainConstants } from "@mapgen/core/terrain-constants.js";
import type { TraceScope } from "@mapgen/trace/index.js";
import { createNoopTraceScope } from "@mapgen/trace/index.js";

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
 *
 * NOTE:
 * - Buffers are mutable and are updated in-place across steps.
 * - Some buffers are also published as artifacts for gating/typing.
 * - Buffer artifacts are mutable after a single publish; do not republish them.
 * TODO(architecture): redesign buffers as a distinct dependency kind (not artifacts).
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
 * Derived snapshot describing a sparse narrative overlay (debug/inspection surface).
 *
 * This is not a canonical pipeline product: narrative story entries are the published primitives,
 * and overlay snapshots are derived on demand from those story entries.
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
 * Non-canonical overlay collections (debug/compat only).
 *
 * Overlays are append-preferred and may be mutated by multiple steps. They are
 * currently threaded through artifacts for wiring, but will be redesigned as a
 * distinct dependency kind in a future architecture pass.
 */
export interface StoryOverlayRegistry {
  corridors: StoryOverlaySnapshot[];
  swatches: StoryOverlaySnapshot[];
  motifs: StoryOverlaySnapshot[];
}

/**
 * Plate-centric tensors emitted by the foundation stage.
 */
export interface FoundationPlateFields {
  id: Int16Array;
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  tectonicStress: Uint8Array;
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  shieldStability: Uint8Array;
  volcanism: Uint8Array;
  movementU: Int8Array;
  movementV: Int8Array;
  rotation: Int8Array;
}

export const FOUNDATION_PLATES_ARTIFACT_TAG = "artifact:foundation.plates";
export const FOUNDATION_MESH_ARTIFACT_TAG = "artifact:foundation.mesh";
export const FOUNDATION_CRUST_ARTIFACT_TAG = "artifact:foundation.crust";
export const FOUNDATION_PLATE_GRAPH_ARTIFACT_TAG = "artifact:foundation.plateGraph";
export const FOUNDATION_TECTONICS_ARTIFACT_TAG = "artifact:foundation.tectonics";
export const FOUNDATION_TILE_TO_CELL_INDEX_ARTIFACT_TAG = "artifact:foundation.tileToCellIndex";
export const FOUNDATION_CRUST_TILES_ARTIFACT_TAG = "artifact:foundation.crustTiles";

/**
 * Store of published artifacts keyed by dependency tag id.
 *
 * Buffer artifacts are a temporary exception: they are published once and then
 * mutated in-place via ctx.buffers for performance. Do not republish buffers.
 * TODO(architecture): split buffers into their own dependency type (not artifacts).
 */
export class ArtifactStore extends Map<string, unknown> {}

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

export type VizLayerKind = "grid" | "points" | "segments";

export type VizScalarFormat = "u8" | "i8" | "u16" | "i16" | "i32" | "f32";

export interface VizDumper {
  /**
   * Base directory for run dumps. The concrete run directory is typically
   * resolved as `${outputRoot}/${runId}`.
   *
   * NOTE: this is expected to be injected by local tooling; runtime/game code
   * should not assume it exists.
   */
  outputRoot: string;

  dumpGrid: (
    trace: TraceScope,
    layer: {
      layerId: string;
      dims: { width: number; height: number };
      format: VizScalarFormat;
      values: ArrayBufferView;
      /**
       * Optional stable suffix to keep filenames unique within a run.
       * Does not affect `layerId` (which should remain stable).
       */
      fileKey?: string;
    }
  ) => void;

  dumpPoints: (
    trace: TraceScope,
    layer: {
      layerId: string;
      positions: Float32Array; // [x0,y0,x1,y1,...]
      values?: ArrayBufferView;
      valueFormat?: VizScalarFormat;
      fileKey?: string;
    }
  ) => void;

  dumpSegments: (
    trace: TraceScope,
    layer: {
      layerId: string;
      segments: Float32Array; // [x0,y0,x1,y1,...] pairs per segment
      values?: ArrayBufferView;
      valueFormat?: VizScalarFormat;
      fileKey?: string;
    }
  ) => void;
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
  rng: RNGState;
  env: Env;
  metrics: GenerationMetrics;
  trace: TraceScope;
  viz?: VizDumper;
  adapter: EngineAdapter;
  /**
   * Published data products keyed by dependency tag (e.g. "artifact:climateField").
   * Used by PipelineExecutor for runtime requires/provides gating.
   */
  artifacts: ArtifactStore;
  /**
   * Mutable generation buffers (heightfield, climate, scratch masks).
   *
   * Some buffers are currently mirrored as artifacts for gating, but they remain
   * mutable after the initial publish. Do not republish buffer artifacts.
   */
  buffers: MapBuffers;
  /**
   * Derived narrative overlays (debug/compat view).
   *
   * Overlays are append-preferred and may be mutated across steps. They are
   * currently carried via artifacts for wiring only.
   * TODO(architecture): redesign overlays as a distinct dependency kind.
   */
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
  env: Env
): ExtendedMapContext {
  initializeTerrainConstants(adapter);
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
    rng: {
      callCounts: new Map(),
      seed: null,
    },
    env,
    metrics: {
      timings: new Map(),
      histograms: new Map(),
      warnings: [],
    },
    trace: createNoopTraceScope(),
    adapter,
    artifacts: new ArtifactStore(),
    buffers: {
      heightfield,
      climate,
      scratchMasks: new Map(),
    },
    overlays: {
      corridors: [],
      swatches: [],
      motifs: [],
    },
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

/**
 * Canonical ctxRandom label for op-level seed derivation.
 * Format: "<stepId>:<opName>:<suffix>" (default suffix = "rngSeed").
 */
export function ctxRandomLabel(
  stepId: string,
  opName: string,
  suffix = "rngSeed"
): string {
  return `${stepId}:${opName}:${suffix}`;
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
// Foundation Artifact Helpers
// ============================================================================

function ensureTensor<T extends { length: number }>(
  name: string,
  tensor: T | null | undefined,
  size: number
): T {
  if (!tensor || typeof tensor.length !== "number") {
    throw new Error(`[FoundationArtifact] Missing ${name} tensor.`);
  }
  if (tensor.length !== size) {
    throw new Error(
      `[FoundationArtifact] ${name} tensor length mismatch (expected ${size}, received ${tensor.length}).`
    );
  }
  return tensor;
}

export function validateFoundationPlatesArtifact(
  value: unknown,
  dimensions: MapDimensions
): asserts value is FoundationPlateFields {
  if (!value || typeof value !== "object") {
    throw new Error("[FoundationArtifact] Missing foundation plates artifact payload.");
  }
  const plates = value as FoundationPlateFields;
  const width = dimensions.width | 0;
  const height = dimensions.height | 0;
  const size = Math.max(0, width * height) | 0;

  ensureTensor("plateId", plates.id, size);
  ensureTensor("boundaryCloseness", plates.boundaryCloseness, size);
  ensureTensor("boundaryType", plates.boundaryType, size);
  ensureTensor("tectonicStress", plates.tectonicStress, size);
  ensureTensor("upliftPotential", plates.upliftPotential, size);
  ensureTensor("riftPotential", plates.riftPotential, size);
  ensureTensor("shieldStability", plates.shieldStability, size);
  ensureTensor("volcanism", plates.volcanism, size);
  ensureTensor("plateMovementU", plates.movementU, size);
  ensureTensor("plateMovementV", plates.movementV, size);
  ensureTensor("plateRotation", plates.rotation, size);
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
