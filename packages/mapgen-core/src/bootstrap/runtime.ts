/**
 * Runtime Config — Type Re-exports Only
 *
 * This file previously contained a module-scoped config store (setValidatedConfig,
 * getValidatedConfig, etc.). That store has been removed in favor of explicit
 * config passing via bootstrap() → MapGenConfig → bindTunables().
 *
 * The config flow is now:
 *   bootstrap(options) → parseConfig(rawConfig) → bindTunables(config) → getTunables()
 *
 * Legacy callers should update to:
 *   - Use bootstrap() to get a validated MapGenConfig
 *   - Pass that config explicitly to MapOrchestrator
 *   - Call getTunables() to read tunables derived from the bound config
 *
 * @see bootstrap/entry.ts for the canonical bootstrap function
 * @see bootstrap/tunables.ts for the tunables binding layer
 */

// Re-export MapConfig as alias for backwards compatibility
export type { MapGenConfig as MapConfig } from "../config/index.js";
