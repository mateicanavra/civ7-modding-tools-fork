import type { ExtendedMapContext } from "@swooper/mapgen-core";

export interface OrogenyCacheInstance {
  belts: Set<string>;
  windward: Set<string>;
  lee: Set<string>;
}

const OROGENY_CACHE = new WeakMap<ExtendedMapContext, OrogenyCacheInstance>();

function createCache(): OrogenyCacheInstance {
  return { belts: new Set(), windward: new Set(), lee: new Set() };
}

export function getOrogenyCache(ctx: ExtendedMapContext | null | undefined): OrogenyCacheInstance {
  if (!ctx) return createCache();
  const existing = OROGENY_CACHE.get(ctx);
  if (existing) return existing;
  const created = createCache();
  OROGENY_CACHE.set(ctx, created);
  return created;
}
