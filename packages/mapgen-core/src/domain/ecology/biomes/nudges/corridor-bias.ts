import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "@mapgen/domain/ecology/biomes/types.js";

export function applyCorridorTileBias(
  adapter: EngineAdapter,
  globals: BiomeGlobals,
  x: number,
  y: number,
  latAbs: number,
  rainfall: number,
  story: {
    corridorLandOpen?: Set<string>;
    corridorRiverChain?: Set<string>;
  },
  getRandom: (label: string, max: number) => number,
  cfg: { landBiasStrength: number; riverBiasStrength: number }
): void {
  if (story.corridorLandOpen && story.corridorLandOpen.has(`${x},${y}`)) {
    if (
      rainfall > 80 &&
      latAbs < 55 &&
      getRandom("Corridor Land-Open Biome", 100) < Math.round(cfg.landBiasStrength * 100)
    ) {
      adapter.setBiomeType(x, y, globals.grassland);
    }
  }

  if (story.corridorRiverChain && story.corridorRiverChain.has(`${x},${y}`)) {
    if (
      rainfall > 75 &&
      latAbs < 55 &&
      getRandom("Corridor River-Chain Biome", 100) < Math.round(cfg.riverBiasStrength * 100)
    ) {
      adapter.setBiomeType(x, y, globals.grassland);
    }
  }
}

export function applyCorridorKindBiomeBias(
  adapter: EngineAdapter,
  globals: BiomeGlobals,
  x: number,
  y: number,
  latAbs: number,
  elevation: number,
  rainfall: number,
  story: {
    corridorAttributes?: Map<string, unknown>;
    corridorKind?: Map<string, unknown>;
  },
  getRandom: (label: string, max: number) => number,
  cfg: { landBiasStrength: number; riverBiasStrength: number }
): void {
  const cKey = `${x},${y}`;
  const attr = story.corridorAttributes?.get?.(cKey) as
    | { kind?: string; biomes?: Record<string, number> }
    | undefined;
  const cKind = attr?.kind || (story.corridorKind && (story.corridorKind.get(cKey) as string | undefined));
  const biomesCfgCorridor = attr?.biomes;

  if ((cKind === "land" || cKind === "river") && biomesCfgCorridor) {
    const strength = cKind === "land" ? cfg.landBiasStrength : cfg.riverBiasStrength;

    if (strength > 0 && getRandom("Corridor Kind Bias", 100) < Math.round(strength * 100)) {
      const entries = Object.keys(biomesCfgCorridor);
      let totalW = 0;
      for (const k of entries) totalW += Math.max(0, biomesCfgCorridor[k] || 0);

      if (totalW > 0) {
        let roll = getRandom("Corridor Kind Pick", totalW);
        let chosen = entries[0];

        for (const k of entries) {
          const w = Math.max(0, biomesCfgCorridor[k] || 0);
          if (roll < w) {
            chosen = k;
            break;
          }
          roll -= w;
        }

        let target: number | null = null;
        if (chosen === "desert") target = globals.desert;
        else if (chosen === "plains") target = globals.plains;
        else if (chosen === "grassland") target = globals.grassland;
        else if (chosen === "tropical") target = globals.tropical;
        else if (chosen === "tundra") target = globals.tundra;
        else if (chosen === "snow") target = globals.snow;

        if (target != null) {
          let ok = true;
          if (target === globals.desert && rainfall > 110) ok = false;
          if (target === globals.tropical && !(latAbs < 25 && rainfall > 95)) ok = false;
          if (target === globals.tundra && !(latAbs > 60 || elevation > 800)) ok = false;
          if (target === globals.snow && !(latAbs > 70 || elevation > 900)) ok = false;
          if (ok) adapter.setBiomeType(x, y, target);
        }
      }
    }
  }
}

