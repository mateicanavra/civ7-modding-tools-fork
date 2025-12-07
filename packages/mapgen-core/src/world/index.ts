/**
 * World module - Voronoi tectonics and plate simulation
 *
 * This module contains the WorldModel, plate generation,
 * and Voronoi cell algorithms for simulating plate tectonics.
 *
 * @module @swooper/mapgen-core/world
 */

// Export types
export * from "./types.js";

// Export plate seed management
export { PlateSeedManager } from "./plate-seed.js";
export type { PlateSeedManagerInterface } from "./plate-seed.js";

// Export plate generation
export {
  computePlatesVoronoi,
  calculateVoronoiCells,
  type ComputePlatesOptions,
} from "./plates.js";

// Export world model
export {
  WorldModel,
  setConfigProvider,
  type WorldModelConfig,
  type WorldModelInterface,
  type InitOptions,
} from "./model.js";

// Module version
export const WORLD_MODULE_VERSION = "0.2.0";
