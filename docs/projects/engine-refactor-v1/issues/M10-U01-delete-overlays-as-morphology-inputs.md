---
id: M10-U01
title: "[M10/U01] Delete overlays as Morphology inputs"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M10
assignees: []
labels: [morphology, refactor]
parent: null
children: []
blocked_by: []
blocked: [M10-U02]
related_to: [M10-U06]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Remove story overlays from Morphology contracts, ops, and step implementations while preserving behavior where possible.

## Deliverables
- Morphology step contracts no longer require `artifact:storyOverlays`.
- Morphology step implementations no longer read overlays or import overlay helpers.
- Morphology ops remove overlay-derived inputs with Phase 2-compliant replacements.
- Contract guardrails enforce the no-overlays posture for Morphology.

## Acceptance Criteria
- No Morphology step contract under `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*` requires `artifact:storyOverlays`.
- No Morphology step implementation imports `overlays.js` or `readOverlay*`.
- Morphology ops touched in this slice have zero overlay-derived inputs (contracts enforce this).
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh` passes.

## Testing / Verification
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `rg -n "artifact:storyOverlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src`

## Dependencies / Notes
- Blocks [M10-U02](./M10-U02-delete-overlay-system.md).
- Tracing pass is tracked separately in [M10-U06](./M10-U06-tracing-observability-hardening.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Scope
- Remove `artifact:storyOverlays` from Morphology step contracts:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts`
- Remove overlay parsing from Morphology implementations:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
- Remove overlay-derived inputs from Morphology ops:
  - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts`
    - Required: `artifact:morphology.topography.landMask` (vents land-only)
    - Required: `artifact:foundation.plates` (tile-space boundary context)
    - Required: `artifact:foundation.tectonics` (mesh-space driver; use field `volcanism`)
    - Optional (Phase 2 tie-breaker): `artifact:morphology.topography.elevation`
    - If tile-space volcanism is needed, extend Foundation projection; do not reintroduce overlays.
  - `mods/mod-swooper-maps/src/domain/morphology/ops/compute-coastline-metrics/contract.ts`
  - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/contract.ts`
    - Delete overlay-coupled masks (`seaLaneMask`, `activeMarginMask`, `passiveShelfMask`, `hotspotMask`).
    - Remove `HotspotBias*` config surfaces.
    - Replace with deterministic Physics truth drivers only.
- Delete/replace `readOverlay*` dependencies from Morphology call paths.

### Guardrails (slice-local)
- Extend `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts`:
  - Fail if any Morphology step contract `requires` `artifact:storyOverlays`.
  - Fail if any Morphology step implementation imports `overlays.js` / `readOverlay*`.

### Downstream migrations
- Consumer matrix “Break” rows completed here:
  - `morphology-mid/rugged-coasts` (stop requiring overlays)
  - `morphology-post/islands` (stop requiring overlays)
  - `morphology-post/volcanoes` (stop requiring overlays)

### Exit criteria (pipeline-green)
- Standard recipe builds/tests pass and Morphology contracts no longer require overlays.
- Ruthlessness mini-pass in-slice: delete newly-unused overlay helper imports; run fast gates.

### Files
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts
    notes: Drop `artifact:storyOverlays` requires
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts
    notes: Drop `artifact:storyOverlays` requires
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts
    notes: Drop `artifact:storyOverlays` requires
  - path: mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts
    notes: Remove overlay masks; require Foundation drivers per Phase 2
  - path: mods/mod-swooper-maps/test/morphology/contract-guard.test.ts
    notes: Enforce “no overlays” posture for Morphology contracts + implementations
```

### Prework Findings (Complete)

#### 1) Island chains without overlays (Physics truth only)

**Current state (why this is prework):**
- The op `morphology/plan-island-chains` currently depends on overlay-shaped masks and engine-derived noise:
  - Op contract inputs include `seaLaneMask`, `activeMarginMask`, `passiveShelfMask`, `hotspotMask`, and `fractal` (plus `rngSeed`). (`mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/contract.ts`)
  - `passiveShelfMask` is validated but not read in the op implementation (dead input). (`mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/strategies/default.ts`)
- The `morphology-post/islands` step currently:
  - Requires `artifact:storyOverlays` via `narrativePreArtifacts.overlays`. (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts`)
  - Reads overlays via `readOverlayCorridors`, `readOverlayMotifsMargins`, `readOverlayMotifsHotspots`. (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`, `mods/mod-swooper-maps/src/recipes/standard/overlays.ts`)
  - Generates `fractal` via adapter fractals (`adapter.createFractal`, `adapter.getFractalHeight`) and derives randomness via `ctxRandom()` which is adapter-coupled. (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`, `packages/mapgen-core/src/core/types.ts`)

**Phase 2 / M10 posture constraints:**
- No story overlays in Morphology (M10 lock).
- No adapter coupling in Physics (no fractals; no adapter RNG; no `artifact:map.*` inputs).

**Proposed minimal contract + wiring changes (no overlays, no adapter RNG):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/contract.ts
    notes: Drop overlay masks + fractal; keep width/height/landMask; add Foundation-derived drivers.
  - path: mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/rules/index.ts
    notes: Update input validation to match new tensors; remove validation for deleted masks/fractal.
  - path: mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/strategies/default.ts
    notes: Replace overlay + fractal branching with deterministic noise + Foundation drivers only.
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts
    notes: Remove `narrativePreArtifacts.overlays` require; require `foundationArtifacts.plates` instead.
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts
    notes: Delete overlay reads + adapter fractals + ctxRandom; derive seed from `context.env.seed`.
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/helpers/seed.ts
    notes: Reuse `deriveStepSeed(baseSeed,label)` for deterministic, adapter-free seed derivation.
```

**Concrete shape (recommended):**
- In `morphology/plan-island-chains` input:
  - Remove: `seaLaneMask`, `activeMarginMask`, `passiveShelfMask`, `hotspotMask`, `fractal`.
  - Add: `boundaryType: u8[]`, `boundaryCloseness: u8[]` from `artifact:foundation.plates` (already exists).
  - Add: `volcanism: u8[]` (preferred; see Foundation driver findings below) to replace `hotspotMask` semantics without overlays.
  - Keep: `rngSeed`, but explicitly document it is derived from `context.env.seed` using a stable label (and must not call `ctxRandom()` / adapter RNG).
- In island-chains implementation:
  - Replace `normalizeFractal(fractal[i])` with a deterministic per-tile noise function seeded from `rngSeed` (existing precedent: `PerlinNoise` usage in Hydrology, `@swooper/mapgen-core/lib/noise`).
  - Remove any sea-lane avoidance logic (overlay-derived constraint) and remove `seaLaneAvoidRadius` from strategy schema.

**Important behavioral note (non-blocking but worth calling out in implementation):**
- The op emits edits with `kind: 'coast'|'peak'`. In current constants, `COAST_TERRAIN` is water; so `kind:'coast'` does not create land. (`packages/mapgen-core/src/core/terrain-constants.ts`)
  - Keep semantics as-is in M10 unless/until we decide to redefine island edits; do not “fix” by adding new narrative masks or engine coupling.

**Verification (post-change):**
- `rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays" mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`
- `rg -n "deps\\.artifacts\\.overlays|readOverlay(Corridors|Motifs)" mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
- `rg -n "adapter\\.(createFractal|getFractalHeight)\\(|ctxRandom\\(|getRandomNumber\\(" mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
- `rg -n "seaLaneMask|activeMarginMask|passiveShelfMask|hotspotMask|fractal" mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains`

#### 2) Foundation volcanism + tectonics drivers for Morphology (no overlays)

**Current state:**
- `artifact:foundation.plates` is a tile-indexed raster with (at least): `id`, `boundaryCloseness`, `boundaryType`, `tectonicStress`, `upliftPotential`, `riftPotential`, `shieldStability`, motion fields, etc. (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`)
- `artifact:foundation.tectonics` (mesh-indexed) includes `volcanism`. (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`)
- The Foundation projection that generates `artifact:foundation.plates` already computes a tile→cell mapping internally, but does not currently project `tectonics.volcanism` into tile space. (`mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`)

**Phase 2 requirement:**
- Volcano intent (and any hotspot/plume signal) must be derived from Foundation drivers (not overlays), with `artifact:foundation.tectonics.volcanism` as the canonical driver in the Phase 2 narrative. (`docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`)

**Minimal delta plan (recommended): add tile-space volcanism to `artifact:foundation.plates`**
- Add a required tile raster `volcanism: Uint8Array (0..255)` to `artifact:foundation.plates`, computed by sampling mesh `tectonics.volcanism[cellId]` using the existing Foundation tile→cell mapping.
- Use this tile raster as the replacement input for overlay `hotspotMask` consumers (Morphology island-chains and volcano planning).

```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts
    notes: Add required `volcanism` to Foundation plates artifact schema.
  - path: mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts
    notes: Add required `volcanism` tensor to the op output `plates.*`.
  - path: mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts
    notes: Project mesh `tectonics.volcanism` into tile-space `volcanism` via existing tile→cell mapping.
  - path: packages/mapgen-core/src/core/types.ts
    notes: Extend `FoundationPlateFields` + validation to require `volcanism` (no silent defaults).
  - path: mods/mod-swooper-maps/test/foundation/contract-guard.test.ts
    notes: Assert `artifact:foundation.plates` schema includes required `volcanism` field.
  - path: mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts
    notes: Replace `hotspotMask` with `volcanism` (tile-space driver) to remove overlays.
```

**Guardrail posture (“no silent defaults”):**
- `volcanism` must be required (not optional) at schema + runtime validation layers so missing fields fail loudly during projection/validation.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
