// Types
export type { MountainsConfig } from "./types.js";
export type { MountainCacheInstance, OrogenyCache } from "./cache.js";
export type { MountainBeltConfig, MountainBeltSummary } from "./MountainBeltStrategy.js";
export type { MountainPassConfig } from "./MountainPassStrategy.js";

// Terrain Application (existing)
export { addMountainsCompat, layerAddMountainsPhysics } from "./apply.js";

// Mountain Cache
export {
  getMountainCache,
  resetMountainCache,
  clearMountainCache,
  getOrogenyCompatCache,
} from "./cache.js";

// Mountain Belt Strategy (orogeny belts, windward/lee)
export {
  detectMountainBelts,
  computeZonalWindStep,
  zonalWindStep,
} from "./MountainBeltStrategy.js";

// Mountain Pass Strategy (passes through ranges)
export {
  detectMountainPasses,
  tagMountainPasses,
} from "./MountainPassStrategy.js";

// Default export
export { layerAddMountainsPhysics as default } from "./apply.js";
