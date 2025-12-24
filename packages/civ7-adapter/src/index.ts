/**
 * @civ7/adapter - Centralized adapter for Civ7 engine APIs
 *
 * This package is the ONLY place allowed to import /base-standard/... paths.
 * All other packages must consume the EngineAdapter interface.
 *
 * Usage:
 *   // In production (mod code):
 *   import { createCiv7Adapter } from "@civ7/adapter/civ7";
 *
 *   // In tests:
 *   import { createMockAdapter } from "@civ7/adapter/mock";
 *
 *   // For types only:
 *   import type { EngineAdapter } from "@civ7/adapter";
 */

// Re-export types
export type {
  EngineAdapter,
  FeatureData,
  MapDimensions,
  MapInitParams,
  MapSizeId,
  MapInfo,
  MapContext,
  ContinentBounds,
  PlotTagName,
  LandmassIdName,
} from "./types.js";
export { ENGINE_EFFECT_TAGS } from "./effects.js";
export type { EngineEffectTagId } from "./effects.js";

// Re-export mock adapter (safe to import anywhere)
export { MockAdapter, createMockAdapter } from "./mock-adapter.js";
export type { MockAdapterConfig } from "./mock-adapter.js";

// Note: Civ7Adapter is NOT re-exported from index to prevent accidental
// bundling of /base-standard/... imports. Import it explicitly from:
//   import { Civ7Adapter, createCiv7Adapter } from "@civ7/adapter/civ7";
