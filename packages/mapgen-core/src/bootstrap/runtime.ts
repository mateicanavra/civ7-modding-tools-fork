/**
 * Runtime Config — Type Re-exports Only
 *
 * This file previously contained a module-scoped config store (setValidatedConfig,
 * getValidatedConfig, etc.). That store has been removed in favor of explicit
 * config passing via bootstrap() → MapGenConfig.
 *
 * The config flow is now:
 *   bootstrap(options) → applyPresets + overrides → parseConfig(rawConfig) → MapGenConfig
 *
 * Legacy callers should update to:
 *   - Use bootstrap() to get a validated MapGenConfig
 *   - Pass that config explicitly to MapOrchestrator
 *
 * @see bootstrap/entry.ts for the canonical bootstrap function
 */

// Re-export MapConfig as alias for backwards compatibility
export type { MapGenConfig as MapConfig } from "../config/index.js";
