---
id: CIV-21
title: "[M-TS-P0] Reactivate Minimal Story Tagging"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [bug]
parent: CIV-14
children: []
blocked_by: [CIV-18]
blocked: [CIV-23]
related_to: [CIV-10]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Port a minimal subset of story tagging from JS to populate `StoryTags` with continental margins, hotspots, and rifts — the foundational tags that climate, biomes, and features depend on.

> **Note:** This issue was originally scoped as P0 remediation under the M1 TypeScript migration (CIV-14). It is now part of Milestone M3, where story tagging will be implemented against the stabilized pipeline and config shapes.

## Problem

### The Story Void

The TypeScript migration created `story/tags.ts` with type definitions, but `story/tagging.ts` (the actual tagging logic) was never ported. This means:

- `StoryTags` data structures exist but are always empty
- Climate code checks for margin tags → finds nothing → skips moisture adjustments
- Biomes code checks for hotspot tags → finds nothing → skips volcanic rules
- Features code checks for rift tags → finds nothing → skips geological placement

**Result:** All story-aware code paths are no-ops, producing bland, uniform maps.

### What We Need (Minimal Set)

Not the full story system, just the foundation:
1. **Continental margins** — active vs passive edges, subduction zones
2. **Hotspots** — volcanic activity centers
3. **Rifts** — divergent boundaries, potential lakes/seas

These feed into climate moisture patterns, biome special cases, and feature placement.

## Deliverables

- [ ] **Port minimal `story/tagging.ts`:**
  - `imaprintMargins(ctx)` — classify plate boundaries as active/passive
  - `seedHotspots(ctx)` — place volcanic hotspot tags based on plate stress
  - `seedRifts(ctx)` — place rift tags at divergent boundaries
- [ ] **Wire into orchestrator:**
  - Call tagging functions in `storySeed` or `story*` stages
  - Ensure `StoryTags` is populated before climate/biomes/features run
- [ ] **Verify downstream consumption:**
  - Climate reads margin tags for moisture adjustments
  - Biomes reads hotspot tags for volcanic rules
  - Features reads rift tags for geological placement
- [ ] **Add smoke tests:**
  - After story stages, assert `StoryTags` contains non-empty margin/hotspot/rift data

## Acceptance Criteria

- [ ] `story/tagging.ts` exists with minimal porting
- [ ] `StoryTags` populated after story stages execute
- [ ] Margin tags present (active/passive classification)
- [ ] Hotspot tags present (based on tectonic stress)
- [ ] Rift tags present (at divergent boundaries)
- [ ] Climate/biomes/features can read these tags
- [ ] Build passes, tests pass

## Testing / Verification

```typescript
// Test: story tagging populates StoryTags
test("story stages populate margin tags", () => {
  const ctx = createMockContext();
  setupFoundationWithPlates(ctx);

  runStoryStages(ctx);

  expect(ctx.overlays.has("margins")).toBe(true);
  const margins = ctx.overlays.get("margins");
  expect(margins.active.length).toBeGreaterThan(0);
});

// Test: climate uses margin tags
test("climate reads margin tags for moisture", () => {
  const ctx = createMockContext();
  populateStoryTags(ctx);  // Mock story data

  applyClimate(ctx);

  // Active margins should have moisture bonus
  const activeMarginIdx = findActiveMarginCell(ctx);
  expect(ctx.fields.rainfall[activeMarginIdx]).toBeGreaterThan(baseRainfall);
});
```

```bash
# Build verification
pnpm -C packages/mapgen-core build

# Run story tests
pnpm -C packages/mapgen-core test --grep "story|margin|hotspot|rift"
```

## Dependencies / Notes

- **Blocked by**: Config resolver + call-site fixes (Stack 2)
- **Blocks**: Integration tests (story enables meaningful downstream behavior)
- **Related to**: CIV-10 (original story migration, incomplete)
- **Scope**: Minimal port, not full story system (full system is P1)

### What's NOT In Scope

- Full corridor algorithms (sea lanes, mountain passes)
- Paleo-geological history
- Named story overlays for specific terrain features
- Story-driven placement (cities, resources)

These are deferred to P1 once the pipeline is stable.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Minimal Story Functions

```typescript
// story/tagging.ts

import type { ExtendedMapContext, FoundationContext } from "../core/types.js";
import { BOUNDARY_TYPE } from "../world/constants.js";

export function imprintMargins(ctx: ExtendedMapContext): void {
  const { foundation, dimensions } = ctx;
  const { plates } = foundation;
  const { width, height } = dimensions;

  const activeMargins: number[] = [];
  const passiveMargins: number[] = [];

  for (let i = 0; i < width * height; i++) {
    const boundaryType = plates.boundaryType[i];
    const closeness = plates.boundaryCloseness[i];

    // Only tag cells near plate boundaries
    if (closeness < 10) continue;

    if (boundaryType === BOUNDARY_TYPE.CONVERGENT ||
        boundaryType === BOUNDARY_TYPE.SUBDUCTION) {
      activeMargins.push(i);
    } else if (boundaryType === BOUNDARY_TYPE.DIVERGENT ||
               boundaryType === BOUNDARY_TYPE.TRANSFORM) {
      passiveMargins.push(i);
    }
  }

  ctx.overlays.set("margins", {
    key: "margins",
    kind: "continental-margins",
    version: 1,
    width,
    height,
    active: activeMargins,
    passive: passiveMargins,
    summary: {
      activeCount: activeMargins.length,
      passiveCount: passiveMargins.length,
    },
  });
}

export function seedHotspots(ctx: ExtendedMapContext): void {
  const { foundation, dimensions, rng } = ctx;
  const { plates } = foundation;
  const { width, height } = dimensions;

  const hotspots: number[] = [];
  const threshold = 200;  // High tectonic stress threshold

  for (let i = 0; i < width * height; i++) {
    const stress = plates.tectonicStress[i];
    if (stress > threshold) {
      // Probability based on stress intensity
      if (Math.random() < stress / 255) {
        hotspots.push(i);
      }
    }
  }

  ctx.overlays.set("hotspots", {
    key: "hotspots",
    kind: "volcanic-hotspots",
    version: 1,
    width,
    height,
    active: hotspots,
    summary: { count: hotspots.length },
  });
}

export function seedRifts(ctx: ExtendedMapContext): void {
  const { foundation, dimensions } = ctx;
  const { plates } = foundation;
  const { width, height } = dimensions;

  const rifts: number[] = [];

  for (let i = 0; i < width * height; i++) {
    const riftPotential = plates.riftPotential[i];
    if (riftPotential > 100) {
      rifts.push(i);
    }
  }

  ctx.overlays.set("rifts", {
    key: "rifts",
    kind: "tectonic-rifts",
    version: 1,
    width,
    height,
    active: rifts,
    summary: { count: rifts.length },
  });
}
```

### Orchestrator Integration

```typescript
// MapOrchestrator.ts - in story stage
if (stageEnabled("storySeed")) {
  console.log("Starting: storySeed");
  imprintMargins(ctx);
  seedHotspots(ctx);
  seedRifts(ctx);
  console.log("Finished: storySeed");
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
