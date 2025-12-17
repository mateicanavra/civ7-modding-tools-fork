/**
 * Orogeny Re-exports — Backward compatibility shim
 *
 * Mountain belt detection has been centralized in domain/morphology/mountains.
 * This module re-exports for backward compatibility with existing code.
 *
 * @deprecated Import from "../../morphology/mountains" instead
 */

// Re-export cache utilities
export {
  getMountainCache as getOrogenyCache,
  resetMountainCache as resetOrogenyCache,
  clearMountainCache as clearOrogenyCache,
  type MountainCacheInstance as OrogenyCacheInstance,
} from "../../morphology/mountains/index.js";

// Re-export belt detection
export {
  detectMountainBelts as storyTagOrogenyBelts,
  computeZonalWindStep as zonalWindStep,
} from "../../morphology/mountains/index.js";
