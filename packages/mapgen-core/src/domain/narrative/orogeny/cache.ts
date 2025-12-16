export interface OrogenyCacheInstance {
  belts: Set<string>;
  windward: Set<string>;
  lee: Set<string>;
}


let _cache: OrogenyCacheInstance | null = null;

function createCache(): OrogenyCacheInstance {
  return { belts: new Set(), windward: new Set(), lee: new Set() };
}

export function getOrogenyCache(): OrogenyCacheInstance {
  if (_cache) return _cache;
  _cache = createCache();
  return _cache;
}

export function resetOrogenyCache(): void {
  _cache = null;
}

export function clearOrogenyCache(): void {
  const cache = getOrogenyCache();
  cache.belts.clear();
  cache.windward.clear();
  cache.lee.clear();
}
