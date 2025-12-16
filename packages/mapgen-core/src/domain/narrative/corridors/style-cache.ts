import { freezeClone } from "../../../lib/collections/freeze-clone.js";
import type { ExtendedMapContext } from "../../../core/types.js";
import { getStoryTags } from "../tags/index.js";

import type { CorridorKind, CorridorStyle } from "./types.js";

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
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>,
  key: string,
  kind: CorridorKind,
  style: CorridorStyle
): void {
  if (typeof key !== "string" || typeof kind !== "string" || typeof style !== "string") return;
  const tags = getStoryTags(ctx);
  tags.corridorKind.set(key, kind);
  tags.corridorStyle.set(key, style);
  const primitive = fetchCorridorStylePrimitive(ctx, corridorsCfg, kind, style);
  if (primitive) tags.corridorAttributes.set(key, primitive);
  else tags.corridorAttributes.delete(key);
}

export function resetCorridorStyleCache(ctx: ExtendedMapContext | null | undefined): void {
  const cache = getStylePrimitiveCache(ctx);
  cache?.clear();
}
