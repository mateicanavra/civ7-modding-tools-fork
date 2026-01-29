---
id: M11-U03
title: "[M11/U03] Foundation crust coherence upgrade (make `foundation.crust` a real driver)"
state: done
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
- `bun run --cwd mods/mod-swooper-maps test -- <new-or-existing-foundation-test>`

## Dependencies / Notes
- Current placeholder implementation: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`.
- This issue intentionally avoids inventing new contract fields; it upgrades driver quality within the existing Phase 2 contract surface.

## Implementation Decisions

### Upgrade `foundation.crust` using proto-plate coherence (no per-cell RNG fields)
- **Context:** Phase 2 `foundation.crust` was IID per-cell RNG (“salt and pepper”) and couldn’t serve as a meaningful downstream driver.
- **Options:** (A) add new contract fields / new artifacts, (B) upgrade within existing `type`/`age` surface.
- **Choice:** B.
- **Rationale:** Keeps Phase 2 surface area stable while materially improving signal quality for downstream substrate/erodibility.
- **Risk:** This is a simplified physical model; later issues may still want an explicit “material driver” artifact for tiles.

### Semantics for `type` and `age`
- **Context:** Downstream systems need consistent meaning, not just coherent noise.
- **Choice:** Derive both fields from a deterministic proto-plate partition over the mesh.
- **Semantics:**
  - `type`: mesh cells are assigned to a proto-plate via nearest-seed Voronoi in mesh-space; proto-plates are marked continental via contiguous growth on the proto-plate adjacency graph until the configured `continentalRatio` target is reached.
  - `age`: per cell, age is proportional to distance from the proto-plate boundary (young at boundaries, old toward interiors), with a small per-plate deterministic bias to avoid uniform fields within same-distance bands.

### Determinism anchors
- **Choice:** All randomness is derived from `createLabelRng(rngSeed)` with explicit labels (`CrustSeedShuffle`, `CrustContinentSeedShuffle`, `CrustContinentFrontierPick`, `CrustPlateAgeBias`).
