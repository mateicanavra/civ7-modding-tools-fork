---
id: LOCAL-TBD-M4-ENGINE-BOUNDARY-CLEANUP
title: "[M4] Engine boundary cleanup: remove engine-global dependency surfaces"
state: planned
priority: 3
estimate: 8
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove or fence engine-global dependency surfaces (`GameplayMap`, module-load `GameInfo`, `PlotTags`/`LandmassRegion`) so cross-step dependencies are explicit and fail-fast.

## Why This Exists

The accepted engine-boundary policy disallows “read engine later” dependency surfaces. M4 must eliminate remaining engine-global reads so pipeline correctness is driven by explicit artifacts/effects, not hidden globals.

## Recommended Target Scope

### In scope

- Remove/fence direct engine-global reads used as dependency surfaces.
- Replace with adapter-backed reads or reified fields/artifacts as needed.
- Ensure failures are explicit (no silent fallbacks to globals).

### Out of scope

- Algorithm changes inside steps.
- Full redesign of adapter APIs beyond minimal replacements.

## Acceptance Criteria

- `GameplayMap` fallbacks, module-load-time `GameInfo` lookups, and `PlotTags`/`LandmassRegion` globals are removed or explicitly fenced behind adapter/runtime surfaces (dev/test-only isolated where needed).
- No new engine-global dependency surfaces are introduced; failures are explicit.

## Primary Touchpoints (Expected)

- Engine-global reads:
  - `packages/mapgen-core/src/domain/narrative/utils/*.ts`
  - `packages/mapgen-core/src/core/terrain-constants.ts`
  - `packages/mapgen-core/src/core/plot-tags.ts`
- Policy references:
  - `docs/system/libs/mapgen/architecture.md`
  - `docs/projects/engine-refactor-v1/deferrals.md`

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A smoke run validates no implicit engine-global reads remain on the default path.

## Dependencies / Notes

- Phase F work; coordinate with narrative cleanup where paths overlap.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Inventory engine-global reads

- Enumerate `GameplayMap` fallbacks, module-load `GameInfo` access, and `PlotTags`/`LandmassRegion` globals.

### 2) Define replacement surfaces

- For each usage, classify the replacement surface: adapter-backed read, reified field/artifact, or explicit fencing.

### 3) Implement removal/fencing

- Replace globals with explicit inputs or adapter calls.
- Ensure any remaining global access is dev/test-only and fails loudly.

## Prework Prompt (Agent Brief)

Goal: map every engine-global dependency surface and define its replacement so cleanup is mechanical.

Deliverables:
- An inventory of `GameplayMap`, `GameInfo`, `PlotTags`, and `LandmassRegion` usages (file + usage + dependency role).
- A proposed replacement for each usage (adapter read, reified field/artifact, or explicit fence).
- A shortlist of tests/docs that must be updated to reflect the new boundary.

Where to look:
- Narrative utilities: `packages/mapgen-core/src/domain/narrative/utils/*.ts`.
- Terrain constants: `packages/mapgen-core/src/core/terrain-constants.ts`.
- Plot tags: `packages/mapgen-core/src/core/plot-tags.ts`.
- Engine boundary policy: `docs/system/libs/mapgen/architecture.md`.
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- No implicit engine-global dependency surfaces; failures must be explicit.
- Keep behavior stable; this is boundary cleanup, not algorithm change.
- Do not implement code; return the inventory and mapping as markdown tables/lists.

## Prework Results / References

- Resource doc: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-engine-boundary-globals-inventory.md`
- Includes: inventory of `GameplayMap` fallbacks, module-load `GameInfo` lookups, and `PlotTags`/`LandmassRegion` globals (with dependency roles), plus a per-surface replacement proposal (adapter-backed reads/explicit inputs) and a shortlist of tests/docs that will need updates once globals are removed/fenced.
