/**
 * Runtime Config — Type Re-exports Only
 *
 * This file previously contained a module-scoped config store (setValidatedConfig,
 * getValidatedConfig, etc.). That store has been removed in favor of explicit
 * config passing via bootstrap() → MapGenConfig.
 *
 * The config flow is now:
 *   bootstrap({ overrides }) → parseConfig(overrides) → MapGenConfig
 *
 * Legacy callers should update to:
 *   - Use bootstrap() (or parseConfig) to get a validated MapGenConfig
 *   - Build a RunRequest and execute via compileExecutionPlan + PipelineExecutor
 *     (or use runTaskGraphGeneration for the standard recipe path)
 *   - Use applyMapInitData for RequestMapInitData
 *
 * @see bootstrap/entry.ts for the canonical bootstrap function
 */

// Re-export MapConfig as alias for backwards compatibility
export type { MapGenConfig as MapConfig } from "@mapgen/config/index.js";
