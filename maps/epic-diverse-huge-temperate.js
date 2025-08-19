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
    presets: ["temperate"],
});

setConfig(MAP_CONFIG);

// Import the orchestrator after setting config (registers engine listeners on load)
import "./map_orchestrator.js";

console.log(
    "[EpicDiverseHuge:Temperate] Ready (delegating to Epic Diverse Huge generator).",
);
