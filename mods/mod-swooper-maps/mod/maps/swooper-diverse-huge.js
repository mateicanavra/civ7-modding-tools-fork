// @ts-nocheck
/**
 * Epic Diverse Huge — Base Map Entry
 *
 * Minimal entry: set a default per‑map config, then import the orchestrator.
 * The orchestrator registers engine listeners on load and reads config at runtime.
 */
import { bootstrap } from "./bootstrap/entry.js";
bootstrap({
    presets: ["voronoi"],
});
import "./map_orchestrator.js";
