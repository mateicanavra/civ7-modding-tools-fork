---
id: CIV-10
title: "[M-TS-07a] Migrate Core Utils & Story System"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [feature]
parent: CIV-7
children: []
blocked_by: [CIV-5, CIV-6]
blocked: [CIV-11, CIV-12, CIV-13]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate core utility files and story system from JavaScript to TypeScript, establishing the foundation types that all other layers depend on.

## Deliverables

- [x] Migrate core utilities to `src/core/`:
  - [x] `types.js` → `types.ts` (ExtendedMapContext, FoundationContext, MapFields, MapBuffers)
  - [x] `utils.js` → `utils.ts` (clamp, inBounds, storyKey, fillBuffer)
  - [x] `plot_tags.js` → `plot-tags.ts` (addPlotTags with adapter pattern)
  - [x] Remove `adapters.js` (use `@civ7/adapter` instead)
- [x] Migrate story system to `src/story/`:
  - [x] `tags.js` → `tags.ts` (StoryTags sparse registry with lazy provider)
  - [x] `overlays.js` → `overlays.ts` (StoryOverlaySnapshot)
  - [ ] `tagging.js` → `tagging.ts` (deferred to CIV-11/12/13 layer migrations)
  - [ ] `corridors.js` → `corridors.ts` (deferred to CIV-11/12/13 layer migrations)
- [x] Export all types from `@swooper/mapgen-core`
- [x] Write unit tests for story tag operations

## Acceptance Criteria

- [x] All core/story files compile without TypeScript errors
- [x] Types are properly exported and importable
- [x] StoryTags sparse registry operations tested (19 tests)
- [x] No remaining `.js` files in `src/core/` or `src/story/`

## Testing / Verification

```bash
# Type check
pnpm -C packages/mapgen-core check

# Run tests
pnpm -C packages/mapgen-core test --filter story
pnpm -C packages/mapgen-core test --filter core

# Verify exports
node -e "import('@swooper/mapgen-core').then(m => console.log('MapContext' in m))"
```

## Dependencies / Notes

- **Parent**: M-TS-07
- **Blocked by**: M-TS-05 (World logic for FoundationContext), M-TS-06 (Bootstrap)
- **Blocks**: M-TS-07b, M-TS-07c, M-TS-07d (all layers depend on these types)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Files to Migrate

| Source | Target | Lines |
|--------|--------|-------|
| `core/types.js` | `src/core/types.ts` | ~150 |
| `core/utils.js` | `src/core/utils.ts` | ~100 |
| `core/plot_tags.js` | `src/core/plot-tags.ts` | ~50 |
| `story/tags.js` | `src/story/tags.ts` | ~200 |
| `story/overlays.js` | `src/story/overlays.ts` | ~150 |
| `story/tagging.js` | `src/story/tagging.ts` | ~300 |
| `story/corridors.js` | `src/story/corridors.ts` | ~200 |

### Key Types to Define

```typescript
// src/core/types.ts
export interface MapContext {
  dimensions: { width: number; height: number };
  fields: MapFields;
  worldModel: WorldModel | null;
  rng: RngState;
  config: MapConfig;
  metrics: Metrics;
  adapter: EngineAdapter;
  foundation: FoundationContext | null;
  buffers: MapBuffers;
  overlays: Map<string, StoryOverlaySnapshot>;
}

// src/story/tags.ts
export interface StoryTags {
  get(key: string): Set<string>;
  add(key: string, x: number, y: number): void;
  has(key: string, x: number, y: number): boolean;
  clear(key: string): void;
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
