/**
 * Base defaults for Epic Diverse Huge map configs.
 *
 * Purpose
 * - Provide a single, explicit source for baseline defaults that other modules
 *   (e.g., resolved.js and presets) can import without ambiguity.
 *
 * Notes
 * - We import the central defaults from map_config.js safely via a namespace import
 *   to avoid type-checker confusion when using @ts-check. We then extract the
 *   named export MAP_CONFIG (or fall back to a default export if present).
 */

// @ts-check

import * as CENTRAL from "../map_config.js";

/**
 * Resolve the central defaults export safely.
 * Prefer the named export `MAP_CONFIG`; fall back to `default` if needed.
 * If neither is present (unexpected), use an empty object (typed as any).
 */
const __centralAny = /** @type {any} */ (CENTRAL);
const __resolved =
    (__centralAny && (__centralAny.MAP_CONFIG ?? __centralAny.default)) || {};

/**
 * Immutable baseline configuration object.
 * Consumers should treat this as read-only and compose presets/overrides on top.
 * We trust the runtime export shape provided by map_config.js.
 */
/** @type {import('../map_config.d.ts').MapConfig} */
// @ts-ignore — trusted runtime export from map_config.js
export const BASE_CONFIG = __resolved;

export default BASE_CONFIG;
