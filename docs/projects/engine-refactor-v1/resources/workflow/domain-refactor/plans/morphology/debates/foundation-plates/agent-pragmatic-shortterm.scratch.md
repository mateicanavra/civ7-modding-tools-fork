# Debate — should we eliminate `artifact:foundation.plates` *now*? (Agent 2: short-term risk/churn)

## UPDATE (decision locked)

We are **keeping `artifact:foundation.plates` in the Phase 2 model** as a Foundation-owned, derived-only tile-space view for tile-based physics consumers (especially Morphology). This file is preserved for historical risk analysis; treat the “Spec posture” bullets below as superseded where they contradict the canonical specs.

Canonical references:
- Contract: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` (`artifact:foundation.plates`)
- Pipeline posture: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`

---

## Conclusion (short-term)

Do **not** try to delete `artifact:foundation.plates` “globally” right now while Morphology is actively being remodeled; it is too central to today’s standard recipe and would create high churn across multiple stages (Foundation + Morphology-* + Narrative-*), with a high probability of accidental behavior drift and/or performance regressions.

Instead, converge in a **cutover-friendly** way: migrate *consumers* off `foundationPlates` first using mesh-first inputs (Phase 2 posture), then delete the artifact + producer step as a mechanical cleanup once it has **zero** runtime dependencies. This avoids the “we’ll delete later” trap by making deletion the final, low-risk step of a bounded migration slice.

## Spec posture (anchoring)

Verified in spec:
- (Superseded) earlier drafts forbade `artifact:foundation.plates` and treated it as Phase 3 deletion work.
- (Current) `PHASE-2-CONTRACTS.md` now specifies `artifact:foundation.plates` as a required derived physics view artifact.

Interpretation for short-term delivery: **the spec already anticipates that current code still uses it**, and that deletion is a bounded migration task (not an incidental side effect of Morphology remodeling).

## Current code reality (what breaks immediately)

Verified via `rg` + file reads:
- Producer (Foundation): `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts` publishes `deps.artifacts.foundationPlates` via `foundation.ops.computePlatesTensors` (which calls `projectPlatesFromModel`).
- Artifact schema/tag: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts` defines `foundationArtifacts.plates` with id `FOUNDATION_PLATES_ARTIFACT_TAG` (`artifact:foundation.plates`), and `packages/mapgen-core/src/core/types.ts` defines `FoundationPlateFields` + `FOUNDATION_PLATES_ARTIFACT_TAG`.
- Direct consumers in the standard recipe:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` (critical early step; feeds most downstream behavior)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyRifts.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.ts`
- Narrative functions take `FoundationPlateFields` directly:
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts` uses `riftPotential`, `boundaryType`, `boundaryCloseness`
  - `mods/mod-swooper-maps/src/domain/narrative/orogeny/belts.ts` uses `upliftPotential`, `tectonicStress`, `boundaryType`, `boundaryCloseness`

So “delete it now” is not a single producer deletion: it is a cross-stage rewrite touching multiple independent domains and their config/tuning.

## Why deleting now is high churn / high risk

1) **It’s on the critical path of the existing morphology pipeline.**
   - `landmassPlates.ts` currently uses `foundationPlates` tensors to drive substrate, base topography, sea level, and landmask decisions, *and* performs adapter side effects (`validateAndFixTerrain`, `recalculateAreas`, `stampContinents`). Any change here cascades into everything downstream.

2) **It creates double-work while Morphology contracts are in flux.**
   - The Phase 2 contract work is already changing Morphology truth surfaces (e.g., removing engine-coupled `terrain` from morphology truth, adding explicit sea level/bathymetry semantics). If we delete `foundation.plates` now, we’ll likely refactor the same steps twice: once to remove the dependency, again to match the remodeled Phase 2 contracts/effects boundaries.

3) **Hidden performance/regression risk (today’s “single compute” becomes N computes).**
   - The current projection (`projectPlatesFromModel` in `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`) builds a tile→cell mapping and then emits multiple tile-indexed fields. If consumers start recomputing equivalent fields independently, runtime cost can blow up quickly (especially if done per-step).

4) **Large surface area of tuning semantics.**
   - Map configs currently tune `foundation.projection.computePlates.*` (e.g., `boundaryInfluenceDistance`, `boundaryDecay`, movement/rotation scales), and downstream ops implicitly rely on the statistical properties of those tensors. If we remove the artifact, we must decide where those knobs live and how they map into replacement computations.

## Highest-risk unknowns (things likely to bite mid-cutover)

- **Replacement contract location:** which domain “owns” the tile-space boundary signals used by Morphology/Narrative-like logic? Phase 2 posture says consumers derive tile-space signals from mesh-first truth inside their own ops; that’s fine, and we should enforce a single shared pure Morphology derivation op (called from steps) so all call sites share one canonical implementation.
- **Determinism edge cases:** wrapX periodic distance + tie-break rules for mesh→tile projection are spec’d; current code’s exact behavior becomes the de-facto baseline. Any drift will change maps.
- **Interaction with the locked “no shims outside steps” rule:** caching computed projections across steps is tempting for perf, but must be done without inventing hidden cross-step state outside the artifact/buffer/step model.

## Convergence-friendly path (bounded, delete-for-real)

Goal: get to Phase 2 posture (mesh-first truth) without chaotic cross-domain edits.

### Slice A — stop the bleeding (guardrails, bounded behavior change)
- Add a hard rule (CI check or local lint rule) that disallows *new* references to `deps.artifacts.foundationPlates` (string match is enough initially).
- Ensure any new Phase 2-target Morphology work does **not** add new consumers.

### Slice B — migrate the critical consumer first (the one we’re remodeling anyway)
- During the Morphology remodel of `landmass-plates`, replace inputs:
  - from tile tensors (`foundationPlates.*`)
  - to mesh-first truth (`artifact:foundation.mesh`, `artifact:foundation.plateGraph`, `artifact:foundation.tectonics`) plus deterministic projection inside a **pure op** (per `PHASE-2-CONTRACTS.md` projection rule).
- Keep the computation in one place (single op) so downstream steps can reuse the exact semantics without reimplementing it.
  - Concretely: a pure helper/op that yields the tile-space signals needed (e.g., `boundaryCloseness`, `boundaryType`, `upliftPotential`, `riftPotential`, `tectonicStress`, `shieldStability`), without creating a new cross-domain “plates” artifact.
  - This is not a “duplication risk” we accept — it’s a centralization requirement: one op, one rule, many call sites.

Acceptance: existing standard maps still run; changes are localized to the step already being rewritten.

### Slice C — migrate remaining consumers, then delete the artifact + producer
- Convert the other direct consumers (`ruggedCoasts`, `mountains`, `volcanoes`, `storyRifts`, `storyOrogeny`) to use the same mesh-first projection op (or to use remodeled Phase 2 Morphology truth artifacts where appropriate).
- Only once `rg "foundationPlates.read"` returns **zero** in active recipe code:
  - delete `foundationArtifacts.plates`
  - delete the Foundation `projection` step (or repurpose it to publish only mesh-first artifacts if still needed)
  - delete `FOUNDATION_PLATES_ARTIFACT_TAG` and `FoundationPlateFields` surfaces if nothing else depends on them

This ordering makes the final deletion mostly mechanical (low risk) and prevents the long-lived “legacy forever” outcome because deletion is the final acceptance criterion of the migration slice (not a follow-up wish).
