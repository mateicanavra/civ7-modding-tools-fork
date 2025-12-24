/**
 * @swooper/mapgen-core - Pure TypeScript domain library for map generation
 *
 * This package contains all map generation algorithms and can be tested
 * via `bun test` without the Civ7 game engine.
 *
 * Architecture:
 * - bootstrap/: Configuration providers (lazy-loaded)
 * - pipeline/: Step wiring + task graph execution primitives
 * - domain/: Mapgen algorithms + narrative tagging/overlays
 * - core/: Shared utilities and types
 */

// Re-export core types from adapter
export type { EngineAdapter, MapContext } from "@civ7/adapter";

// Re-export bootstrap entry
export { bootstrap } from "@mapgen/bootstrap/entry.js";

// Re-export domain algorithms + types
export * from "@mapgen/domain/index.js";

// Re-export core utilities and types
export * from "@mapgen/core/index.js";

// Re-export dev diagnostics module
export * from "@mapgen/dev/index.js";

// Re-export tracing primitives
export * from "@mapgen/trace/index.js";

// Orchestration helpers (RunRequest → ExecutionPlan entry)
export { applyMapInitData, resolveMapInitData } from "@mapgen/orchestrator/map-init.js";
export { runTaskGraphGeneration } from "@mapgen/orchestrator/task-graph.js";
export type {
  GenerationResult,
  MapInfo,
  MapInitParams,
  MapSizeDefaults,
  OrchestratorConfig,
  StageResult,
} from "@mapgen/orchestrator/types.js";

// Re-export pipeline primitives (M3 Task Graph MVP)
export * from "@mapgen/pipeline/index.js";

// Re-export standard mod package
export { mod as standardMod } from "@mapgen/mods/standard/mod.js";

// Package version
export const VERSION = "0.1.0";
