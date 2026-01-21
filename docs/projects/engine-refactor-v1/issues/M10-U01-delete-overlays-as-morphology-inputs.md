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

### Prework Prompt (Agent Brief)
Delete this prompt section once the prework is completed.

### Island chains without overlays (Physics truth only)
- Purpose: Make `morphology/plan-island-chains` consistent with Phase 2 and the M10 “no overlays” posture.
- Expected output:
  - Inventory current inputs/masks and their sources (overlay reads, adapter fractals, etc.).
  - Propose minimal replacement inputs derived from Foundation/Morphology truth plus a deterministic noise source.
    - Noise must be derived internally from `context.env.seed` + a stable label (e.g. `morphology/plan-island-chains`).
    - Do not add noise as a `requires` contract input or expose a new “overlay-like” toggle.
  - Provide explicit contract edits for:
    - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/contract.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`

### Foundation volcanism + tectonics drivers for Morphology (no overlays)
- Purpose: Make Phase 2’s upstream driver posture executable without overlays.
- Expected output:
  - Confirm current `artifact:foundation.plates` schema vs Phase 2 required fields; list deltas.
  - Decide how tile-space Morphology consumes volcanism deterministically (avoid “two projections” drift):
    - Preferred: extend Foundation projection (`foundation/steps/projection` + `ops.computePlates`) so `artifact:foundation.plates` publishes required tile-space fields.
    - Morphology must not introduce a second mesh→tile projection implementation.
  - Produce a concrete “contract patch” list:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`
    - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts`
    - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts`
  - Add/extend guard tests for new contract fields (no silent defaults).
- Sources to check:
  - Phase 2 authority:
    - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
    - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - Current repo truth:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
