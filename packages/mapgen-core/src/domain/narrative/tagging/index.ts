/**
 * Story Tagging — Minimal narrative parity for M2 stable slice.
 *
 * Ports a conservative subset of legacy JS story/tagging.js:
 * - Continental margins (active/passive shelves) with overlay publication
 * - Hotspot trail polylines
 * - Rift valleys (lines + shoulders)
 */

export type { ContinentalMarginsOptions, HotspotTrailsSummary, RiftValleysSummary } from "./types.js";
export { storyTagContinentalMargins } from "./margins.js";
export { storyTagHotspotTrails } from "./hotspots.js";
export { storyTagRiftValleys } from "./rifts.js";

import { storyTagContinentalMargins } from "./margins.js";
import { storyTagHotspotTrails } from "./hotspots.js";
import { storyTagRiftValleys } from "./rifts.js";

export default {
  storyTagContinentalMargins,
  storyTagHotspotTrails,
  storyTagRiftValleys,
};
