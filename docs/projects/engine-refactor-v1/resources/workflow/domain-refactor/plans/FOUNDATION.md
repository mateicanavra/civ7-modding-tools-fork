---
name: plan-foundation-vertical-domain-refactor
description: |
  Draft Foundation domain implementation plan/spec.
  This plan instantiates the shared WORKFLOW for a Foundation refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Foundation (Vertical Domain Refactor)

This is the **Foundation-specific implementation plan/spec** for refactoring the Foundation domain end-to-end:
- **Domain modeling:** physically grounded, first-principles, authoritative (legacy behavior is not sacred).
- **SDK architecture:** contract-first ops + orchestration-only steps; stage-owned artifact contracts; `run(ctx, config, ops, deps)`.

This is a **draft plan** (not a milestone doc yet). The plan is expected to evolve via the built-in lookbacks.

**Backbone workflow:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

<!-- Path roots -->
 = mods/mod-swooper-maps
 = packages/mapgen-core

## Foundation-specific framing (read once)

Foundation is **upstream of everything**: it seeds core, physics-adjacent pipeline layers (buffers) and the first publish-once contracts (artifacts) that downstream domains consume.

This means:
- Phase 1/2 must be **cross-pipeline aware** (expect downstream contract changes).
- Plan slices to keep the pipeline coherent at every boundary (no “big bang” unless explicitly justified).

**North-star inputs (modeling):**
- Canonical domain modeling: `docs/system/libs/mapgen/foundation.md`
- Pipeline posture + buffers/overlays: `docs/system/libs/mapgen/architecture.md`
- Seed/non-authoritative implementation north star: `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`

**Known current-state reality (to validate in Phase 1; do not assume beyond this list):**
- `/src/domain/foundation/ops/contracts.ts` is currently empty (Foundation is not yet contract-first in practice).
- `/src/recipes/standard/stages/foundation/` uses the legacy step signature (`run(ctx, config)`), legacy tag-based dependency wiring, and a monolithic producer.

<workflow>

<step name="phase-0-setup">

**Objective:** Establish a stable starting point and a work environment for Foundation refactor work.

**Inputs:**
- `<milestone>` (e.g. `M9` when formalized)

**Outputs:**
- Worktree + branch for Foundation refactor work.
- A “baseline is green” note (or a recorded list of known failures + links).

**Gate (do not proceed until):**
- [ ] You are operating in a worktree.
- [ ] Baseline checks are green, or failures are recorded with rationale.

**References:**
- Shared workflow preflight: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

</step>

<step name="phase-1-current-state-spike">

**Objective:** Produce a Foundation-specific current-state spike: inventory everything Foundation touches, and everything that touches Foundation.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-current-state.md`

**Phase 1 focus (Foundation-specific):**
- Stage + recipe wiring:
  - Identify how `/src/recipes/standard/stages/foundation/` is wired today (steps, tags, producers).
  - Identify where the Standard recipe expects Foundation outputs (dependency tags/artifacts/buffers).
- Domain touchpoints:
  - Catalog the current Foundation “domain logic” surfaces that are consumed directly (deep imports).
  - Identify any cross-domain coupling that should become a curated, stable contract surface.
- Buffer candidates:
  - List the shared mutable layers Foundation initializes and/or mutates, and where downstream steps read/mutate them.
  - Explicitly separate “buffer identity” from “artifact publish-once handle” (temporary wiring).
- Overlay candidates:
  - If Foundation produces story-relevant motifs (e.g., plate boundary corridors), catalog whether those exist today and whether they are treated as overlays or as ad-hoc fields.

**Gate (do not proceed until):**
- [ ] The spike includes an explicit list of downstream stages/steps that depend on Foundation outputs.
- [ ] Any “hidden coupling” discovered is written down with file paths and consumers.

**References:**
- Shared inventory guide: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`

</step>

<step name="lookback-1-phase-1-to-phase-2">

**Objective:** Update the modeling plan based on Phase 1 discoveries.

**Outputs (append to Phase 1 spike):**
- `## Lookback (Phase 1 → Phase 2): Adjust modeling plan`

**Gate (do not proceed until):**
- [ ] The Phase 2 modeling work is explicitly re-scoped based on evidence (not assumptions).

</step>

<step name="phase-2-modeling-spike">

**Objective:** Define the “correct” Foundation model from first principles + canonical MapGen architecture posture.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-modeling.md`
- Update (or confirm) the canonical Foundation spec:
  - `docs/system/libs/mapgen/foundation.md`

**Phase 2 focus (Foundation-specific):**
- Plate-graph posture (Delaunay/Voronoi) vs legacy tile-first approaches:
  - Ensure the domain-only model assumes a graph/mesh-first foundation and describes how downstream domains consume it.
- Op catalog design:
  - Define an atomic op catalog (no op-calls-op), separating:
    - “compute derived fields” (compute ops),
    - “plan discrete features/motifs” (plan ops),
    - and any “apply-to-engine/runtime” side effects (step-owned, not ops).
- Buffers vs artifacts:
  - Identify which Foundation products are canonical mutable buffers (shared layers) vs publish-once artifacts (immutable contracts).
  - When a buffer must be surfaced for gating/typing today, specify the publish-once handle semantics explicitly (no re-publish).
- Overlays:
  - If Foundation is a producer of story structure (corridors/swatches), specify overlays under the single `overlays.*` container shape.

**Gate (do not proceed until):**
- [ ] Op catalog is deterministic and complete (no “optional” alternate models).
- [ ] Buffer/artifact/overlay distinctions are explicit and consistent with `docs/system/libs/mapgen/architecture.md`.
- [ ] The pipeline delta list includes downstream consumers that must be updated to stay coherent.

**References:**
- Modeling guidelines: `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- Pipeline posture: `docs/system/libs/mapgen/architecture.md`
- Foundation domain spec: `docs/system/libs/mapgen/foundation.md`
- Plate-graph seed: `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`

</step>

<step name="lookback-2-phase-2-to-phase-3">

**Objective:** Convert the target Foundation model into a slice-able implementation plan.

**Outputs (append to Phase 2 spike):**
- `## Lookback (Phase 2 → Phase 3): Adjust implementation plan`

**Gate (do not proceed until):**
- [ ] The plan includes a slicing strategy for any cross-pipeline contract changes.

</step>

<step name="phase-3-implementation-plan-and-slice-plan">

**Objective:** Write a deterministic implementation issue + slice plan for Foundation (derived from the spikes).

**Outputs:**
- A local implementation issue doc (domain-local “source of truth”):
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-foundation-*.md`

**Phase 3 focus (Foundation-specific):**
- Convert the op catalog into contract files + module surfaces.
- Convert the Foundation stage to the U21 authoring posture:
  - stage-owned artifact contracts,
  - step contracts using `artifacts.requires` / `artifacts.provides`,
  - step runtime using `deps.artifacts.*`,
  - step signature `run(ctx, config, ops, deps)`.
- Define a slice plan that keeps downstream stages working while Foundation contracts evolve.

**Gate (do not proceed until):**
- [ ] Slice 1 is fully scoped and independently shippable (docs + tests + deletions included).

**References:**
- Shared workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

</step>

<step name="lookback-3-phase-3-to-phase-4">

**Objective:** Confirm the slice plan is executable before writing code.

**Outputs (append to Phase 3 issue doc):**
- `## Lookback (Phase 3 → Phase 4): Finalize slices + sequencing`

**Gate (do not proceed until):**
- [ ] Remaining open decisions are explicit, scoped, and non-surprising.

</step>

<step name="phase-4-implementation-slices">

**Objective:** Implement Foundation refactor slices end-to-end (no dual paths).

**Phase 4 focus (Foundation-specific):**
- Prioritize early establishment of:
  - the Foundation op contract surface (so downstream code can stop deep-importing internals),
  - the stage-owned artifact contracts and `deps` wiring posture (so producers/consumers are consistent),
  - and the buffer/overlay publish-once semantics (so the pipeline does not regress into “re-publish” behavior).

**Gate (per-slice):**
- [ ] Slice leaves the pipeline working end-to-end (tests + build + deploy gate as required).
- [ ] Slice leaves touched contracts and schemas documented (docs-as-code enforcement).

</step>

<step name="lookback-4-phase-4-to-phase-5">

**Objective:** Reconcile plan vs implementation reality before final verification.

**Outputs (append to Phase 3 issue doc):**
- `## Lookback (Phase 4 → Phase 5): Stabilize and reconcile`

</step>

<step name="phase-5-verification-cleanup">

**Objective:** Verify, cleanup, and submit the Foundation refactor branch.

**Gate (do not proceed until):**
- [ ] Verification runbook in the Phase 3 issue doc is executed and recorded.
- [ ] Any intentional deferrals are explicit (with triggers).

</step>

</workflow>

## Notes (intentionally non-binding)

This plan intentionally avoids locking down:
- exact op ids/names,
- exact buffer/artifact/overlay identifiers,
- exact file/module paths for slices,

until Phase 1/2 discoveries are complete. Treat those phases as the “plan-shaping” engine.

