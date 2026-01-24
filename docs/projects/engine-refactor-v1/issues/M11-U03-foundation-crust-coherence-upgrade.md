---
id: M11-U03
title: "[M11/U03] Foundation crust coherence upgrade (make `foundation.crust` a real driver)"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, morphology, physics]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace the placeholder-grade `artifact:foundation.crust` implementation (IID RNG per mesh cell) with a coherent, plate-anchored crust model that can actually serve as an upstream “material driver” for Morphology substrate/erodibility.

## Deliverables
- `artifact:foundation.crust` remains the same Phase 2 shape (`type`, `age`) but becomes spatially coherent and physically motivated (even if simplified).
- Determinism anchors are explicit (seed derivation labels, tie-breakers, no hidden constants).
- Documented semantics for:
  - how `type` relates to plate identity / plate history,
  - how `age` is derived and why it is meaningful downstream.

## Acceptance Criteria
- For fixed inputs/seeds, crust output is deterministic.
- `type` and `age` exhibit spatial coherence (no per-cell salt-and-pepper noise) and correlate to plate structure.
- “Physics-first” downstream consumers (Morphology substrate) can use crust fields without immediately needing noise to break patterns.

## Testing / Verification
- Add at least one test that fails if crust becomes IID again:
  - adjacency coherence check (neighbor similarity above a minimum threshold) on a fixed seed fixture.
- `pnpm -C mods/mod-swooper-maps test -- <new-or-existing-foundation-test>`

## Dependencies / Notes
- Current placeholder implementation: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`.
- This issue intentionally avoids inventing new contract fields; it upgrades driver quality within the existing Phase 2 contract surface.
