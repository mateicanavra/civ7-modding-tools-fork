import path from "node:path";
import { mkdir } from "node:fs/promises";
import { copyDirectoryRecursive } from "@civ7/plugin-files";

export interface MapgenConfig {
  seed?: number | string;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface MapgenResult {
  width: number;
  height: number;
  tiles: unknown;
  metadata?: Record<string, unknown>;
}

export type Logger = (message: string) => void;

export const VERSION = "0.0.0-stub";

export function describe(): string {
  return "@civ7/plugin-mapgen (stub)";
}

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
  return { width, height, tiles: [], metadata: { stub: true } };
}

const ALLOWED_EXTS = new Set([".js", ".xml", ".modinfo"]);

export async function buildMapMod(
  srcDir: string,
  outDir: string,
  log: Logger = () => {}
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  copyDirectoryRecursive(srcDir, outDir, {
    filter: (rel, entry) => {
      if (!entry.isFile()) return true;
      const lower = rel.toLowerCase();
      if (lower.endsWith(".d.ts") || lower.endsWith(".map")) return false;
      const ext = path.extname(lower);
      return ALLOWED_EXTS.has(ext);
    },
  });
  log(`[plugin-mapgen] copied artifacts from ${srcDir} to ${outDir}`);
}
