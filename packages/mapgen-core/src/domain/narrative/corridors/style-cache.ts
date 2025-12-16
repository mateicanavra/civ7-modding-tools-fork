import { freezeClone } from "../../../lib/collections/freeze-clone.js";
import { getStoryTags } from "../tags/index.js";

import type { CorridorKind, CorridorStyle } from "./types.js";

const STYLE_PRIMITIVE_CACHE = new Map<string, Readonly<Record<string, unknown>>>();

export function fetchCorridorStylePrimitive(
  corridorsCfg: Record<string, unknown>,
  kind: CorridorKind,
  style: CorridorStyle
): Readonly<Record<string, unknown>> | null {
  if (typeof kind !== "string" || typeof style !== "string") return null;
  const cacheKey = `${kind}:${style}`;
  if (STYLE_PRIMITIVE_CACHE.has(cacheKey)) return STYLE_PRIMITIVE_CACHE.get(cacheKey)!;

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

  STYLE_PRIMITIVE_CACHE.set(cacheKey, primitive);
  return primitive;
}

export function assignCorridorMetadata(
  corridorsCfg: Record<string, unknown>,
  key: string,
  kind: CorridorKind,
  style: CorridorStyle
): void {
  if (typeof key !== "string" || typeof kind !== "string" || typeof style !== "string") return;
  const tags = getStoryTags();
  tags.corridorKind.set(key, kind);
  tags.corridorStyle.set(key, style);
  const primitive = fetchCorridorStylePrimitive(corridorsCfg, kind, style);
  if (primitive) tags.corridorAttributes.set(key, primitive);
  else tags.corridorAttributes.delete(key);
}

export function resetCorridorStyleCache(): void {
  STYLE_PRIMITIVE_CACHE.clear();
}
