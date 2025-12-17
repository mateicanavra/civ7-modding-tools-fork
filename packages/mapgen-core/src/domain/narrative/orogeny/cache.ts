/**
 * Orogeny Cache — Backward compatibility re-export
 * @deprecated Import from "../../morphology/mountains" instead
 */
export {
  getMountainCache as getOrogenyCache,
  resetMountainCache as resetOrogenyCache,
  clearMountainCache as clearOrogenyCache,
  type MountainCacheInstance as OrogenyCacheInstance,
} from "../../morphology/mountains/index.js";
