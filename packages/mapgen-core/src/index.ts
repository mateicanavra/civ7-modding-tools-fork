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
 */

// Re-export core types
export type { EngineAdapter, MapContext } from "@civ7/adapter";

// Re-export bootstrap entry
export { bootstrap } from "./bootstrap/entry.js";

// Re-export world module
export * from "./world/index.js";

// Re-export layers module
export * from "./layers/index.js";

// Re-export core utilities
export * from "./core/index.js";

// Package version
export const VERSION = "0.1.0";
