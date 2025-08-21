/**
 * @civ7/plugin-mapgen
 *
 * Temporary placeholder module to make the package buildable within the monorepo.
 * This will be replaced by a full TypeScript implementation that emits the JS
 * artifacts required by the downstream CIV7 client.
 */

/**
 * Basic configuration shape for the map generator. This will be expanded
 * substantially during the TS rewrite to cover all layers and tunables.
 */
export interface MapgenConfig {
  seed?: number | string;
  width?: number;
  height?: number;
  // Allow future options without breaking the placeholder API
  [key: string]: unknown;
}

/**
 * Result structure returned by the generator. The concrete representation of
 * tiles and metadata will be defined during the TS rewrite.
 */
export interface MapgenResult {
  width: number;
  height: number;
  tiles: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Logger function signature used across plugins in this repo.
 */
export type Logger = (message: string) => void;

/**
 * Placeholder version string. Will be wired to package metadata in the full implementation.
 */
export const VERSION = "0.0.0-stub";

/**
 * Returns a brief capability descriptor for diagnostics and smoke tests.
 */
export function describe(): string {
  return "@civ7/plugin-mapgen (stub) — placeholder implementation for build/testing";
}

/**
 * Stubbed map generation function. This intentionally returns a minimal
 * structure so that early integration work and build pipelines succeed.
 *
 * The eventual implementation will:
 * - Migrate the legacy JS to TypeScript
 * - Preserve backwards-compatible JS artifacts expected by the CIV7 client
 * - Expose a stable, testable public API from this entry point
 */
export async function generateMap(
  config: MapgenConfig = {},
  log: Logger = () => {}
): Promise<MapgenResult> {
  const width = typeof config.width === "number" ? config.width : 0;
  const height = typeof config.height === "number" ? config.height : 0;

  log(
    `[plugin-mapgen] (stub) generateMap called with seed=${String(
      config.seed ?? "N/A"
    )}, width=${width}, height=${height}`
  );

  // Return an empty tileset placeholder. This will be replaced with the real
  // map data structure during the migration.
  return {
    width,
    height,
    tiles: [],
    metadata: {
      stub: true,
      note:
        "This is a temporary artifact. Replace with real generation output during TS rewrite.",
    },
  };
}

/**
 * Temporary no-op compile step placeholder.
 * In the full implementation this will help produce legacy-compatible JS artifacts
 * (ESM/CJS as needed) that the CIV7 client consumes.
 */
export async function buildArtifacts(log: Logger = () => {}): Promise<void> {
  log("[plugin-mapgen] (stub) buildArtifacts — no-op");
}
