import type { ExtendedMapContext } from "@mapgen/core/types.js";

export interface OrogenyCacheInstance {
  belts: Set<string>;
  windward: Set<string>;
  lee: Set<string>;
}

const OROGENY_CACHE_ARTIFACT_KEY = "story:orogenyCache";

function createCache(): OrogenyCacheInstance {
  return { belts: new Set(), windward: new Set(), lee: new Set() };
}

export function getOrogenyCache(ctx: ExtendedMapContext | null | undefined): OrogenyCacheInstance {
  if (!ctx) return createCache();
  const existing = ctx.artifacts?.get(OROGENY_CACHE_ARTIFACT_KEY) as OrogenyCacheInstance | undefined;
  if (existing) return existing;
  const created = createCache();
  ctx.artifacts?.set(OROGENY_CACHE_ARTIFACT_KEY, created);
  return created;
}
