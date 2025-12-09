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
  setDefaultVoronoiUtils,
} from "./plates.js";

// Export world model
export {
  WorldModel,
  setConfigProvider,
  type WorldModelConfig,
  type WorldModelInterface,
  type InitOptions,
} from "./model.js";

// Export crust-first Phase A utilities
export {
  buildPlateTopology,
  type PlateGraph,
  type PlateNode,
} from "../lib/plates/topology.js";
export { assignCrustTypes, CrustType, type CrustConfig } from "../lib/plates/crust.js";
export {
  generateBaseHeightfield,
  type BaseHeightConfig,
} from "../lib/heightfield/base.js";
export { computeSeaLevel } from "../lib/heightfield/sea-level.js";

// Module version
export const WORLD_MODULE_VERSION = "0.2.0";
