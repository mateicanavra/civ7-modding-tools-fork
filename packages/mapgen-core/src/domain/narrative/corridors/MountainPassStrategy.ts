/**
 * MountainPassStrategy — Backward compatibility re-export
 *
 * Mountain pass detection has been centralized in domain/morphology/mountains.
 * This module re-exports for backward compatibility with existing code.
 *
 * @deprecated Import from "../../morphology/mountains" instead
 */

export {
  tagMountainPasses,
  detectMountainPasses,
  type MountainPassConfig,
} from "../../morphology/mountains/index.js";

export { tagMountainPasses as default } from "../../morphology/mountains/index.js";
