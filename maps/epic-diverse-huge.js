/**
 * Epic Diverse Huge — Base Map Entry
 *
 * Minimal entry: set a default per‑map config, then import the orchestrator.
 * The orchestrator registers engine listeners on load and reads config at runtime.
 */
import { setConfig } from "./config/runtime.js";

// Minimal default config for this map entry (safe defaults)
const MAP_CONFIG = Object.freeze({
    presets: ["classic"],
});

setConfig(MAP_CONFIG);

console.log("[EpicDiverseHuge] Entry loaded — importing orchestrator...");
import "./map_orchestrator.js";
console.log("[EpicDiverseHuge] Orchestrator imported — ready.");
