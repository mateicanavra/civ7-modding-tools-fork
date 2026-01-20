# Agent A Scratch — Contracts Hardening (`artifact:foundation.plates` Phase 2 lock)

## Current state (2026-01-20)

LOCKED (Phase 2-canonical):
- `artifact:foundation.plates` stays in Phase 2 as a Foundation-owned, derived-only tile-space view artifact for physics consumers (especially Morphology).
- No `artifact:map.plates` by default; if Gameplay needs plates for annotation/logic, it reads `artifact:foundation.plates` directly.

### Verified parity (code → Phase 2 contracts)

- Canonical tag + fields:
  - `packages/mapgen-core/src/core/types.ts` defines:
    - `export const FOUNDATION_PLATES_ARTIFACT_TAG = "artifact:foundation.plates"`
    - `export interface FoundationPlateFields` fields (exactly): `id`, `boundaryCloseness`, `boundaryType`, `tectonicStress`, `upliftPotential`, `riftPotential`, `shieldStability`, `movementU`, `movementV`, `rotation`
- Canonical artifact schema wiring (field names + array types):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts` defines `foundationArtifacts.plates` with the same 10 fields, typed as `i16/u8/i8` arrays.
- Canonical producer op + projection config defaults (single source of truth today):
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts` (`foundation/compute-plates-tensors`) locks:
    - `boundaryInfluenceDistance` default `5`, range `[1, 32]`
    - `boundaryDecay` default `0.55`, range `[0.05, 1]`
    - `movementScale` default `100`, range `[1, 200]`
    - `rotationScale` default `100`, range `[1, 200]`
- Canonical baseline semantics / determinism anchors:
  - `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts` implements:
    - mesh→tile projection via nearest mesh site in mesh “hex space” using wrapX periodic distance
    - tie-breaker: smallest `cellIndex` (implicit via “<” bestDist update)
    - boundary tiles via hex-neighbor plate-id differences (wrapX-aware)
    - `boundaryCloseness` via BFS distance-to-boundary + exponential decay
    - `movementU|movementV|rotation` via deterministic scale + `Math.round` + clamp into `[-127, 127]`

### Contract closure needs (Phase 2 posture)

- `artifact:foundation.plates` is Phase 2-canonical as a Foundation-owned, derived-only tile-space view artifact for physics consumers (especially Morphology).
- No `artifact:map.plates` by default; if Gameplay needs plate annotation it reads `artifact:foundation.plates` directly (no duplication under `artifact:map.*` unless a specific Gameplay reshaping/freeze boundary is required).
- `artifact:foundation.plateGraph` must be explicit that plate ids are dense and index-stable (`plates[i].id === i`) and `cellToPlate` values are indices into `plates[]` (this matches current code and prevents silent drift).

### Edits applied (owned file)

- Updated `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` to be closure-grade for `artifact:foundation.plates`:
  - Added Foundation-owned projection config semantics (defaults + ranges).
  - Locked `boundaryCloseness` formula in terms of `boundaryInfluenceDistance` + `boundaryDecay`.
  - Locked `tectonicStress` and `shieldStability` canonical baseline formulas.
  - Locked `movementU|movementV|rotation` formulas in terms of `movementScale` + `rotationScale`.
  - Hardened `artifact:foundation.plateGraph` semantics: dense `id` + `cellToPlate` index stability.

### Cross-doc consistency check (in-scope docs)

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md` already states `artifact:foundation.plates` is canonical and not modeled under `artifact:map.*`.
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` already states Gameplay should read `artifact:foundation.plates` directly by default (avoid duplicating under `artifact:map.*`).
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-lockdown-plan.md` already calls for “lock the Foundation projection config semantics” → now satisfied by the contracts doc.

### Out-of-scope drift (flag for orchestrator if desired)

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md` contradicts the lock:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md:380` says “for downstream convenience … but ideally uses the mesh-based tectonics data where possible.”
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md:1007` says “Used for convenience … mapping tectonics from mesh to tiles.”
  - Proposed drop-in replacement (both bullets):
    > `artifact:foundation.plates` — Foundation-owned, derived-only **tile-space canonical view** of mesh-first tectonic truths. Tile-based consumers (especially Morphology) **must** consume this artifact instead of re-deriving mesh→tile projections ad hoc. It is not modeled under `artifact:map.*`; Gameplay reads it directly when plate annotation is needed.
- Debate docs under `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/foundation-plates/` are explicitly labeled “historical”, but still contain now-false “verified” claims and contradictory recommendations deep in the file:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/foundation-plates/agent-arch-longterm.scratch.md` claims `PHASE-2-CONTRACTS.md` forbids `artifact:foundation.plates` (no longer true).
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/foundation-plates/agent-compromise-midterm.scratch.md` recommends deleting `artifact:foundation.plates` and proposes policy checks to forbid dependencies on it.
  - Recommendation: either move these debate files under `_archive/` or rewrite the superseded sections to “Historical (superseded)” language that cannot be misread as current guidance.
