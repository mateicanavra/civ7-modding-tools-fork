import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "@mapgen/domain/ecology/biomes/types.js";
import type { NarrativeCorridorsV1 } from "@mapgen/domain/narrative/artifacts.js";

export function applyCorridorEdgeHints(
  adapter: EngineAdapter,
  globals: BiomeGlobals,
  x: number,
  y: number,
  width: number,
  latAbs: number,
  rainfall: number,
  corridors: NarrativeCorridorsV1 | null | undefined,
  getRandom: (label: string, max: number) => number
): void {
  if (corridors?.landCorridors?.has(`${x},${y}`) || corridors?.riverCorridors?.has(`${x},${y}`)) {
    return;
  }

  let edgeAttr: { edge?: Record<string, number> } | null = null;

  for (let ddy = -1; ddy <= 1 && !edgeAttr; ddy++) {
    for (let ddx = -1; ddx <= 1; ddx++) {
      if (ddx === 0 && ddy === 0) continue;
      const nx = x + ddx;
      const ny = y + ddy;
      const nk = `${nx},${ny}`;

      if (corridors?.landCorridors?.has(nk) || corridors?.riverCorridors?.has(nk)) {
        const attr = corridors?.attributesByTile?.get?.(nk) as { edge?: Record<string, number> } | undefined;
        if (attr && attr.edge) edgeAttr = attr;
      }
    }
  }

  if (!edgeAttr?.edge) return;
  const edgeCfg = edgeAttr.edge;

  const forestRimChance = Math.max(0, Math.min(1, edgeCfg.forestRimChance ?? 0));
  if (forestRimChance > 0 && rainfall > 90 && getRandom("Corr Forest Rim", 100) < Math.round(forestRimChance * 100)) {
    const target = latAbs < 22 && rainfall > 110 ? globals.tropical : globals.grassland;
    adapter.setBiomeType(x, y, target);
  }

  const hillRimChance = Math.max(0, Math.min(1, edgeCfg.hillRimChance ?? 0));
  const mountainRimChance = Math.max(0, Math.min(1, edgeCfg.mountainRimChance ?? 0));
  const escarpmentChance = Math.max(0, Math.min(1, edgeCfg.escarpmentChance ?? 0));
  const reliefChance = Math.max(0, Math.min(1, hillRimChance + mountainRimChance + escarpmentChance));

  if (reliefChance > 0 && getRandom("Corr Relief Rim", 100) < Math.round(reliefChance * 100)) {
    const elev = adapter.getElevation(x, y);
    const target = (latAbs > 62 || elev > 800) && rainfall < 95 ? globals.tundra : globals.plains;
    adapter.setBiomeType(x, y, target);
  }
}
