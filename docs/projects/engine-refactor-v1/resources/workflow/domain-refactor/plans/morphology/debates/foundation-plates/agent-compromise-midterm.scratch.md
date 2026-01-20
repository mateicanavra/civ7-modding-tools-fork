# Debate Scratchpad — `artifact:foundation.plates` (Agent 3: Mid-term compromise / forcing convergence)

## UPDATE (decision locked)

We are **keeping `artifact:foundation.plates` in the Phase 2 model** as a Foundation-owned, derived-only tile-space view for tile-based physics consumers (especially Morphology). This file is preserved as historical options analysis; treat the “Context anchors” bullets below as superseded where they contradict the canonical specs.

Canonical references:
- Contract: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` (`artifact:foundation.plates`)
- Pipeline posture: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`

---

## Context anchors (spec)

- Phase 2 posture is already explicit:
  - (Superseded) earlier drafts treated `artifact:foundation.plates` as forbidden / Phase 3 deletion.
  - (Current) `artifact:foundation.plates` is specified as a required derived physics view artifact.
- Canonical alternative is already specified:
  - Mesh-first Foundation truth (`artifact:foundation.mesh|crust|plateGraph|tectonics`) + a deterministic mesh→tile projection rule.
  - Evidence pointer for the projection rule is already anchored to `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`.

## Evidence targets (current code)

- Producer (published artifact):
  - Schema + tag wiring: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
  - Producer step: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`
  - Projection op: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/*`
- Current consumers that “learned” the convenience tensors:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
  - (Also Narrative steps: `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-*/steps/story*.ts`)

---

## Options on the table

### Option A — Keep `artifact:foundation.plates` published

Keep the current Foundation “plate-centric tile tensors” artifact as a first-class, published artifact (`FOUNDATION_PLATES_ARTIFACT_TAG`).

### Option B — Delete as published; keep a *local* “plates tensors bundle” (derive internally)

Remove `artifact:foundation.plates` from the published artifact store, but keep the same “plate tensors” concept as a computed convenience bundle inside downstream steps/stages (e.g., Morphology), derived from mesh-first truths.

### Option C — Delete as published; go mesh-first (derive *only what you need*, when you need it)

Remove `artifact:foundation.plates` and remove the “plate tensors bundle” concept as an implicit dependency surface. Make mesh-first truth canonical:
- Consumers operate on `artifact:foundation.mesh|plateGraph|tectonics` directly.
- Any tile-indexed signals are derived via a single deterministic projection rule + narrowly-scoped pure ops, with no republished convenience tensors.

---

## Decision matrix (criteria × options)

Scoring: 1 (worst) → 5 (best). Notes are “why” (not implementation detail).

| Criteria | Option A: keep published | Option B: delete + internal bundle | Option C: delete + mesh-first |
|---|---:|---:|---:|
| Architectural purity | 1 | 3 | 5 |
| Drift risk (canonical confusion / new consumers) | 1 | 3 | 5 |
| Implementation churn (near-term refactors) | 5 | 3 | 2 |
| Determinism clarity (what is canonical; tie-breakers) | 2 | 4 | 5 |
| Testing surface (contracts to validate; blast radius) | 2 | 3 | 4 |
| **Overall** (forcing convergence to Phase 2 target) | **1** | **3** | **5** |

Interpretation:
- Option A scores well only on “churn” because it preserves legacy wiring; it directly contradicts the Phase 2 target posture (mesh-first truth; no plate projection artifacts).
- Option B is a viable *transition technique* (keep the bundle concept but stop publishing it), but it risks becoming an unofficial “hidden contract” unless it is aggressively scoped and named as internal-only.
- Option C is the only option that cleanly converges with Phase 2 target semantics and reduces long-term drift.

---

## Recommendation (single crisp posture)

(Superseded) Choose **Option C: delete `artifact:foundation.plates` as a published artifact and go mesh-first**.

This is the only posture that (1) matches the already-locked Phase 2 spec language, (2) prevents plate-projection tensors from becoming canonical truth, and (3) forces downstream algorithms to declare their real needs against mesh-first truth artifacts.

---

## If deleting: how the necessary information carries forward (without reintroducing published convenience tensors)

### Canonical truth inputs (published; already Phase 2 contract)

Downstream steps/ops consume only:
- `artifact:foundation.mesh` (mesh sites + wrapWidth + neighbors)
- `artifact:foundation.plateGraph` (`cellToPlate` + plate kinematics list)
- `artifact:foundation.tectonics` (mesh-indexed driver fields)
- `artifact:foundation.crust` (when needed)

### Deterministic mesh→tile projection (pure; shared; not published)

Adopt a single, shared projection primitive (a pure op or pure library function) that produces:
- `tileToCellIndex[tileIndex]` with:
  - `projectOddqToHexSpace(x,y)` to mesh “hex space”
  - periodic distance in X only (`wrapAbsDeltaPeriodic` using `mesh.wrapWidth`)
  - tie-breaker = smallest `cellIndex`

This projection rule is already described in the Phase 2 contracts and already has a concrete implementation anchor (today it lives inside `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`).

### Derived tile signals (internal-only; computed inside steps via pure ops)

When a tile-indexed consumer needs “plate-like” signals, derive them internally from mesh-first truths:

- **Plate id per tile** (if needed at all): `plateIdByTile[t] = plateGraph.cellToPlate[tileToCellIndex[t]]`
- **Mesh driver fields per tile**: sample `tectonics.*[tileToCellIndex[t]]` (uplift/rift/shear/volcanism/etc.)
- **Boundary detection** (tile-space; wrapX on; wrapY off): a tile is boundary iff any hex neighbor has a different `plateIdByTile`.
- **Boundary type per tile**: boundary tiles take `tectonics.boundaryType[tileToCellIndex[t]]`, interior tiles are `none`.
- **Boundary closeness** (if required): compute a distance-to-boundary field in tile space (BFS over odd-q neighbors) and map to `[0..255]` deterministically; do not publish it.
- **Convenience mixes** (`tectonicStress`, `shieldStability`, movement components): derive on demand from sampled fields and plate kinematics; keep them internal to the step/stage that needs them.

The key constraint: these derived arrays/bundles may exist as **step-local values** or **stage-owned buffers**, but must not be published as `artifact:*` (no new “truth-shaped” convenience tensors).

---

## Convergence guardrails (to prevent Option B reappearing under a new name)

If we use any transitional “internal bundle” technique while migrating consumers:
- Name it explicitly as internal and stage-scoped (e.g., `buffer:morphology.tectonicDriversTile`), not `artifact:*`.
- Require that ops consume either:
  - mesh-first truth artifacts directly, or
  - an explicitly-scoped internal driver buffer owned by the calling step’s stage.
- Add a hard policy check: no contract/step/op may declare a dependency on `artifact:foundation.plates` (or any replacement “published plate tensors” artifact) in Phase 2 target recipes.

---

## Next actions (to force convergence)

1) Treat `artifact:foundation.plates` as **legacy-only** immediately (no new consumers); document this in the Phase 3 migration checklist for the standard recipe.
2) Introduce/standardize the single deterministic mesh→tile projection primitive (pure; shared) and route all tile sampling through it.
3) Migrate current consumers (Morphology + Narrative) off `foundationPlates` by sampling mesh-first truths + deriving only the needed tile signals internally.
4) Remove the Foundation “projection” publish step (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`) once no consumers depend on it, and then remove `FOUNDATION_PLATES_ARTIFACT_TAG` from `packages/mapgen-core/src/core/types.ts`.
