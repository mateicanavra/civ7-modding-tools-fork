/**
 * @swooper/mapgen-core - Pure TypeScript domain library for map generation
 *
 * This package contains all map generation algorithms and can be tested
 * via `bun test` without the Civ7 game engine.
 *
 * Architecture:
 * - bootstrap/: Configuration providers (lazy-loaded)
 * - world/: Voronoi tectonics, plate simulation
 * - layers/: Terrain generation stages (mountains, climate, etc.)
 * - core/: Shared utilities and types
 * - story/: Narrative tagging and overlay system
 */

// Re-export core types from adapter
export type { EngineAdapter, MapContext } from "@civ7/adapter";

// Re-export bootstrap entry
export { bootstrap } from "./bootstrap/entry.js";

// Re-export world module
export * from "./world/index.js";

// Re-export layers module
export * from "./layers/index.js";

// Re-export core utilities and types
export * from "./core/index.js";

// Re-export story module
export * from "./story/index.js";

// Re-export dev diagnostics module
export * from "./dev/index.js";

// Re-export MapOrchestrator
export {
  MapOrchestrator,
  type MapInitParams,
  type MapInfo,
  type OrchestratorConfig,
  type StageResult,
  type GenerationResult,
} from "./MapOrchestrator.js";

// Re-export pipeline primitives (M3 Task Graph MVP)
export * from "./pipeline/index.js";

// Package version
export const VERSION = "0.1.0";
