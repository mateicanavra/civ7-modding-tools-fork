/**
 * Epic Diverse Huge — Temperate (Sibling Entry)
 *
 * Minimal sibling map that reuses the working Epic Diverse Huge generator
 * by statically importing it. The imported script registers the necessary
 * engine listeners (RequestMapInitData/GenerateMap), so this file stays tiny.
 *
 * Notes:
 * - This file is listed as a separate <Row> in config/config.xml.
 * - To customize behavior later (e.g., different tunables), introduce a
 *   variant tunables module and point the original generator to it via a
 *   small indirection. For now, this simply reuses the default setup.
 */

console.log("[EpicDiverseHuge:Temperate] Loading sibling map entry...");

import { setConfig } from "./config/runtime.js";

const MAP_CONFIG = Object.freeze({
    toggles: {
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_WORLDMODEL: true,
    },
    // Temperate-leaning defaults (gentle, safe)
    landmass: {
        geometry: {
            preset: "classic",
            oceanColumnsScale: 1.1,
        },
    },
    worldModel: {
        directionality: {
            cohesion: 0.6,
            hemispheres: { monsoonBias: 0.25 },
        },
    },
});

setConfig(MAP_CONFIG);

// Import the orchestrator after setting config (registers engine listeners on load)
import "./map_orchestrator.js";

console.log(
    "[EpicDiverseHuge:Temperate] Ready (delegating to Epic Diverse Huge generator).",
);
