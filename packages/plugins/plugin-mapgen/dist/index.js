import path from "node:path";
import { mkdir } from "node:fs/promises";
import { copyDirectoryRecursive } from "@civ7/plugin-files";
export const VERSION = "0.0.0-stub";
export function describe() {
    return "@civ7/plugin-mapgen (stub)";
}
export async function generateMap(config = {}, log = () => { }) {
    const width = typeof config.width === "number" ? config.width : 0;
    const height = typeof config.height === "number" ? config.height : 0;
    log(`[plugin-mapgen] (stub) generateMap called with seed=${String(config.seed ?? "N/A")}, width=${width}, height=${height}`);
    return { width, height, tiles: [], metadata: { stub: true } };
}
const ALLOWED_EXTS = new Set([".js", ".xml", ".modinfo"]);
export async function buildMapMod(srcDir, outDir, log = () => { }) {
    await mkdir(outDir, { recursive: true });
    copyDirectoryRecursive(srcDir, outDir, {
        filter: (rel, entry) => {
            if (!entry.isFile())
                return true;
            const lower = rel.toLowerCase();
            if (lower.endsWith(".d.ts") || lower.endsWith(".map"))
                return false;
            const ext = path.extname(lower);
            return ALLOWED_EXTS.has(ext);
        },
    });
    log(`[plugin-mapgen] copied artifacts from ${srcDir} to ${outDir}`);
}
//# sourceMappingURL=index.js.map