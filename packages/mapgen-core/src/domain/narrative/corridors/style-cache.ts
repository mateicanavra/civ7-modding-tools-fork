import { freezeClone } from "@mapgen/lib/collections/freeze-clone.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

import type { CorridorKind, CorridorStyle } from "@mapgen/domain/narrative/corridors/types.js";
import type { CorridorState } from "@mapgen/domain/narrative/corridors/state.js";

const STYLE_PRIMITIVE_CACHE_KEY = "story:corridorStyleCache";

function getStylePrimitiveCache(
  ctx: ExtendedMapContext | null | undefined
): Map<string, Readonly<Record<string, unknown>>> | null {
  if (!ctx) return null;
  const existing = ctx.artifacts?.get(STYLE_PRIMITIVE_CACHE_KEY) as
    | Map<string, Readonly<Record<string, unknown>>>
    | undefined;
  if (existing) return existing;
  const created = new Map<string, Readonly<Record<string, unknown>>>();
  ctx.artifacts?.set(STYLE_PRIMITIVE_CACHE_KEY, created);
  return created;
}

export function fetchCorridorStylePrimitive(
  ctx: ExtendedMapContext | null | undefined,
  corridorsCfg: Record<string, unknown>,
  kind: CorridorKind,
  style: CorridorStyle
): Readonly<Record<string, unknown>> | null {
  if (typeof kind !== "string" || typeof style !== "string") return null;
  const cacheKey = `${kind}:${style}`;
  const cache = getStylePrimitiveCache(ctx);
  if (cache && cache.has(cacheKey)) return cache.get(cacheKey)!;

  const kinds = corridorsCfg.kinds as Record<string, unknown> | undefined;
  const kindCfg = (kinds?.[kind] || null) as Record<string, unknown> | null;
  const styles = (kindCfg?.styles || null) as Record<string, unknown> | null;
  const styleCfg = (styles?.[style] || null) as Record<string, unknown> | null;
  if (!styleCfg) return null;

  const primitive = Object.freeze({
    kind,
    style,
    biomes: styleCfg.biomes ? freezeClone(styleCfg.biomes) : undefined,
    features: styleCfg.features ? freezeClone(styleCfg.features) : undefined,
    edge: styleCfg.edge ? freezeClone(styleCfg.edge) : undefined,
  });

  cache?.set(cacheKey, primitive);
  return primitive;
}

export function assignCorridorMetadata(
  state: CorridorState,
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>,
  key: string,
  kind: CorridorKind,
  style: CorridorStyle
): void {
  if (typeof key !== "string" || typeof kind !== "string" || typeof style !== "string") return;
  state.kindByTile.set(key, kind);
  state.styleByTile.set(key, style);
  const primitive = fetchCorridorStylePrimitive(ctx, corridorsCfg, kind, style);
  if (primitive) state.attributesByTile.set(key, primitive);
  else state.attributesByTile.delete(key);
}
