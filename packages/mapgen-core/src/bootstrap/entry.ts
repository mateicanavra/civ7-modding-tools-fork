/**
 * Bootstrap entry point
 *
 * Provides the main `bootstrap()` function that initializes map generation.
 * This module uses lazy loading to avoid crashes when globals are unavailable.
 */

/// <reference types="@civ7/types" />

export interface BootstrapConfig {
  /** Enable specific generation stages */
  stages?: {
    foundation?: boolean;
    mountains?: boolean;
    climate?: boolean;
    biomes?: boolean;
    features?: boolean;
    resources?: boolean;
  };
  /** Override default configuration values */
  overrides?: Record<string, unknown>;
}

/**
 * Bootstrap the map generation system
 *
 * This is called from the mod entry point to initialize generation.
 * It sets up configuration and registers with the game engine.
 */
export function bootstrap(config: BootstrapConfig = {}): void {
  console.log("[mapgen-core] Bootstrap called with config:", config);

  // Gate A: Minimal implementation - just log that we're loaded
  // Full implementation comes in Gate B/C
}

/**
 * Reset bootstrap state (for testing)
 */
export function resetBootstrap(): void {
  // Will be implemented when we add lazy providers in CIV-6
}
