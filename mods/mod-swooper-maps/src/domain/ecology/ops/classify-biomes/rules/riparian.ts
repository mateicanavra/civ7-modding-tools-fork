import type { Static } from "@swooper/mapgen-core/authoring";
import { RiparianSchema } from "./riparian.schema.js";

export function computeRiparianMoistureBonus(params: {
  width: number;
  height: number;
  riverClass: Uint8Array;
  cfg: Static<typeof RiparianSchema> | undefined;
}): Float32Array {
  const { width, height, riverClass } = params;
  const cfg = params.cfg ?? {};

  const bonusByTile = new Float32Array(width * height);

  const adjacencyRadius = Math.max(0, Math.floor(cfg.adjacencyRadius ?? 1));
  const minorBonus = cfg.minorRiverMoistureBonus ?? 4;
  const majorBonus = cfg.majorRiverMoistureBonus ?? 8;

  if (adjacencyRadius === 0) {
    for (let i = 0; i < bonusByTile.length; i++) {
      const cls = riverClass[i] ?? 0;
      if (cls >= 2) bonusByTile[i] = majorBonus;
      else if (cls >= 1) bonusByTile[i] = minorBonus;
    }
    return bonusByTile;
  }

  for (let y = 0; y < height; y++) {
    const yOffset = y * width;
    const y0 = Math.max(0, y - adjacencyRadius);
    const y1 = Math.min(height - 1, y + adjacencyRadius);

    for (let x = 0; x < width; x++) {
      const idx = yOffset + x;
      const x0 = Math.max(0, x - adjacencyRadius);
      const x1 = Math.min(width - 1, x + adjacencyRadius);

      let maxClass = 0;
      for (let yy = y0; yy <= y1; yy++) {
        const yyOffset = yy * width;
        for (let xx = x0; xx <= x1; xx++) {
          const cls = riverClass[yyOffset + xx] ?? 0;
          if (cls > maxClass) maxClass = cls;
          if (maxClass >= 2) break;
        }
        if (maxClass >= 2) break;
      }

      if (maxClass >= 2) bonusByTile[idx] = majorBonus;
      else if (maxClass >= 1) bonusByTile[idx] = minorBonus;
    }
  }

  return bonusByTile;
}
