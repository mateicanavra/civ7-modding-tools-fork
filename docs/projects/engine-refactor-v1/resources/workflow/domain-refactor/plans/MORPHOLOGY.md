---
name: plan-morphology-vertical-domain-refactor
description: |
  Draft Morphology domain implementation plan/spec.
  This plan instantiates the shared WORKFLOW for a Morphology refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Morphology (Vertical Domain Refactor)

This is the **Morphology-specific implementation plan/spec** for refactoring the Morphology domain end-to-end:
- **Domain modeling:** physically grounded, first-principles, authoritative (legacy behavior is not sacred).
- **SDK architecture:** contract-first ops + orchestration-only steps; stage-owned artifact contracts; `run(ctx, config, ops, deps)`.

This is a **draft plan** (not a milestone doc yet). The plan is expected to evolve via the built-in lookbacks.

**Backbone workflow:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

<!-- Path roots -->
 = mods/mod-swooper-maps
 = packages/mapgen-core

## Canonical posture (enforced): do not propagate legacy

Morphology is a high-churn domain in the current codebase; it is easy to accidentally “refactor by preserving the past” rather than moving toward the canonical posture.

**Hard principle:**
- **Legacy behavior and legacy authoring patterns should not be propagated.**
- **All new work must be expressed through the canonical architecture and authoring surfaces**, not by copying old patterns “because that’s how this file already does it”.

**Concrete example (what not to repeat):**
- In several existing Ecology steps, the step module imports a config type and then annotates the `run(...)` handler parameter as `config: <SomeConfigType>`, even though the step contract schema already defines and provides the config shape.
- This is a legacy smell because it:
  - adds unnecessary imports and coupling,
  - encourages redundant type plumbing,
  - worsens DX without improving correctness.

**Default rule for this refactor (unless Phase 1/2 prove otherwise):**
- Do not import config types purely to annotate the `run(ctx, config, ops, deps)` parameter list.
- Prefer inferred types from the step contract schema + canonical authoring helpers.

**DX posture checklist (apply before writing or “improving” code):**
- [ ] Am I about to add a new import? If yes, is it truly required by canonical layering (or is it a legacy habit)?
- [ ] Am I about to add explicit types that inference already provides? If yes, justify why.
- [ ] Am I about to introduce a second way to do something (compat paths, alt deps access, legacy helpers)? If yes, stop—prefer one canonical way.
- [ ] Did I inspect callsites/references (code-intel) before writing JSDoc/TypeBox `description` text?
- [ ] Is this the minimal, highest-DX expression that still respects boundaries and contracts?

## Living plan artifacts (required; keep updated)

This plan stays “live” by keeping a small set of structured artifacts continuously updated. These are used directly when cutting the Phase 3 implementation issue and when validating slice completeness.

- Appendix A: **Domain Surface Inventory (outside view)**
- Appendix B: **Contract Matrix (requires/provides; artifacts vs buffers vs overlays)**
- Appendix C: **Decisions + Defaults**
- Appendix D: **Risk Register**
- Appendix E: **Golden Path Example (canonical authoring)**

## Morphology-specific framing (read once)

Morphology sits immediately downstream of Foundation and seeds most of the physical world layers that everything else depends on.

- It is **buffer-heavy** (shared, mutable, iterative layers like elevation/heightfield).
- It is also a key **overlay producer** (formation motifs like corridors) that downstream domains can “read” as story signals.

This means:
- Phase 1/2 must be **cross-pipeline aware** (expect contract changes downstream).
- Slice planning must preserve “pipeline coherence” at every boundary (avoid a big-bang rewrite unless explicitly justified).

**North-star inputs (modeling):**
- Canonical domain modeling: `docs/system/libs/mapgen/morphology.md`
- Pipeline posture + buffers/overlays: `docs/system/libs/mapgen/architecture.md`
- Upstream seed: `docs/system/libs/mapgen/foundation.md` (Morphology consumes Foundation structure)
- Non-authoritative implementation north star (plate-graph direction): `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`

**Known current-state reality (to validate in Phase 1; do not assume beyond this list):**
- Morphology is currently split across multiple recipe stages:
  - `/src/recipes/standard/stages/morphology-pre/`
  - `/src/recipes/standard/stages/morphology-mid/`
  - `/src/recipes/standard/stages/morphology-post/`
- These stages appear to still use the legacy stage/step authoring posture (no stage-owned `artifacts.ts`, legacy `run(ctx, config)` signature).
- `/src/domain/morphology/ops/contracts.ts` is currently empty (Morphology is not yet contract-first in practice).

<workflow>

<step name="phase-0-setup">

**Objective:** Establish a stable starting point and a work environment for Morphology refactor work.

**Inputs:**
- `<milestone>` (e.g. `M9` when formalized)

**Outputs:**
- Worktree + branch for Morphology refactor work.
- A “baseline is green” note (or a recorded list of known failures + links).

**Gate (do not proceed until):**
- [ ] You are operating in a worktree.
- [ ] Baseline checks are green, or failures are recorded with rationale.

**References:**
- Shared workflow preflight: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

</step>

<step name="phase-1-current-state-spike">

**Objective:** Produce a Morphology-specific current-state spike: inventory everything Morphology touches, and everything that touches Morphology.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-current-state.md`
- Update (at least a first draft) in this plan:
  - Appendix A (Domain Surface Inventory)
  - Appendix B (Contract Matrix; current-state mapping)

**Phase 1 focus (Morphology-specific):**
- Stage + recipe wiring:
  - Identify how the three morphology stages are wired today (steps, ordering, and any inter-stage coupling).
  - Identify where the Standard recipe expects Morphology outputs (buffers/artifacts/overlays) and how those are referenced today (contracts vs deep imports).
- Domain touchpoints:
  - Catalog the current Morphology “domain logic” surfaces that are consumed directly (deep imports) from steps and/or other domains.
  - Identify which of these touchpoints should become curated, stable op contracts versus which should be internal-only (step-local composition).
- Buffer candidates:
  - List the shared mutable layers Morphology initializes and/or mutates (elevation/heightfield, landmask, flow routing arrays, sediment depth, etc.) and where downstream steps read/mutate them.
  - Explicitly separate “buffer identity” from “artifact publish-once handle” (temporary wiring).
- Overlay candidates:
  - Catalog where Morphology produces story-relevant motifs (corridors, swatches, margins, rifts, etc.).
  - Classify each motif as an overlay candidate (append-preferred under `overlays.*`) vs a domain artifact vs a buffer-derived product.
- Downstream consumers:
  - Ecology: which Morphology products does it depend on (buffers + overlays)?
  - Placement: which Morphology overlays/buffers does it read?

**Gate (do not proceed until):**
- [ ] The spike includes an explicit list of downstream stages/steps that depend on Morphology products.
- [ ] Any “hidden coupling” is written down with file paths and consumers.
- [ ] Appendix A and Appendix B have at least a “current state” draft (even if incomplete).

**References:**
- Shared inventory guide: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`

</step>

<step name="lookback-1-phase-1-to-phase-2">

**Objective:** Update the modeling plan based on Phase 1 discoveries.

**Outputs (append to Phase 1 spike):**
- `## Lookback (Phase 1 → Phase 2): Adjust modeling plan`
  - Include explicit “plan deltas”:
    - what changed in Appendix A/B (inventory + contract matrix),
    - what new decisions/defaults are now required (Appendix C),
    - what new risks were discovered (Appendix D).

**Gate (do not proceed until):**
- [ ] The Phase 2 modeling work is explicitly re-scoped based on evidence (not assumptions).
- [ ] Appendix C and Appendix D have at least first-pass entries (even if provisional).

</step>

<step name="phase-2-modeling-spike">

**Objective:** Define the “correct” Morphology model from first principles + canonical MapGen architecture posture.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-modeling.md`
- Update (or confirm) the canonical Morphology spec:
  - `docs/system/libs/mapgen/morphology.md`
- Update in this plan:
  - Appendix B (Contract Matrix; target-state mapping)
  - Appendix C (Decisions + Defaults; record provisional defaults and triggers)
  - Appendix D (Risk Register; revise based on target model)

**Phase 2 focus (Morphology-specific):**
- “Correct” morphology pipeline shape (domain-only):
  - Uplift integration → erosion/diffusion/deposition → sea level → landmask.
  - Ensure the spec clearly communicates which products are buffers vs artifacts vs overlays.
- Op catalog design:
  - Define an atomic op catalog (no op-calls-op), separating:
    - “compute derived fields” (compute ops),
    - “plan discrete motifs/overlays” (plan ops),
    - and any “apply-to-engine/runtime” side effects (step-owned, not ops).
- Buffers vs artifacts:
  - Identify which products must be canonical mutable buffers (evolving layers) and which must be publish-once artifacts (stable, immutable-by-convention contracts).
  - When a buffer must be surfaced for gating/typing today, specify the publish-once handle semantics explicitly (no re-publish).
- Overlays:
  - Specify which overlays Morphology owns and publishes under the single `overlays.*` container (append-preferred).
  - Ensure corridor/swatches shape is consistent with the cross-pipeline overlay policy in `docs/system/libs/mapgen/architecture.md`.
- Stage split posture (pre/mid/post):
  - Decide whether the stage split is purely a recipe sequencing choice (same domain contracts) vs it encodes a modeling boundary.
  - If unclear, treat it as a Phase 2 decision with options and tradeoffs (Appendix C).

**Gate (do not proceed until):**
- [ ] Op catalog is deterministic and complete (no “optional” alternate models).
- [ ] Buffer/artifact/overlay distinctions are explicit and consistent with `docs/system/libs/mapgen/architecture.md`.
- [ ] The pipeline delta list includes downstream consumers that must be updated to stay coherent.
- [ ] Appendix B reflects the target `requires/provides` model (even if slice sequencing is not finalized yet).

**References:**
- Modeling guidelines: `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- Pipeline posture: `docs/system/libs/mapgen/architecture.md`
- Morphology domain spec: `docs/system/libs/mapgen/morphology.md`
- Foundation domain spec: `docs/system/libs/mapgen/foundation.md`

</step>

<step name="lookback-2-phase-2-to-phase-3">

**Objective:** Convert the target Morphology model into a slice-able implementation plan.

**Outputs (append to Phase 2 spike):**
- `## Lookback (Phase 2 → Phase 3): Adjust implementation plan`
  - Include explicit “plan deltas”:
    - contract matrix changes that require slices (Appendix B),
    - updated risks + mitigations via slice ordering (Appendix D),
    - any defaults/assumptions that must become explicit implementation decisions (Appendix C).

**Gate (do not proceed until):**
- [ ] The plan includes a slicing strategy for any cross-pipeline contract changes.
- [ ] Appendix D identifies which risks are “blocking” vs “nice to resolve”.

</step>

<step name="phase-3-implementation-plan-and-slice-plan">

**Objective:** Write a deterministic implementation issue + slice plan for Morphology (derived from the spikes).

**Outputs:**
- A local implementation issue doc (domain-local “source of truth”):
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-morphology-*.md`
- Copy (or link) the plan spine into the issue doc so it remains actionable:
  - Appendix B (Contract Matrix; target-state + slice deltas)
  - Appendix C (Decisions + Defaults)
  - Appendix D (Risk Register)

**Phase 3 focus (Morphology-specific):**
- Convert the op catalog into contract files + module surfaces.
- Convert the morphology stages to the U21 authoring posture:
  - stage-owned artifact contracts (`artifacts.ts`) for each stage (or an intentional consolidated contract surface, if Phase 2 decides so),
  - step contracts using `artifacts.requires` / `artifacts.provides`,
  - step runtime using `deps.artifacts.*` (and buffer mutation via `ctx.buffers.*` where applicable),
  - step signature `run(ctx, config, ops, deps)`.
- Define a slice plan that keeps downstream stages working while Morphology contracts evolve.
- Decide and encode the policy for tests:
  - default to canonical imports/surfaces,
  - allow deep imports only when necessary, and document each exception.

**Gate (do not proceed until):**
- [ ] Slice 1 is fully scoped and independently shippable (docs + tests + deletions included).
- [ ] Slice plan is explicitly ordered to mitigate the top “blocking” risks (Appendix D).

**References:**
- Shared workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

</step>

<step name="lookback-3-phase-3-to-phase-4">

**Objective:** Confirm the slice plan is executable before writing code.

**Outputs (append to Phase 3 issue doc):**
- `## Lookback (Phase 3 → Phase 4): Finalize slices + sequencing`
  - Explicitly confirm:
    - that the Decisions + Defaults list is current (Appendix C),
    - that the Risk Register is current and mapped to slice ordering (Appendix D),
    - that slice 1 does not propagate legacy authoring patterns (posture checklist above).

**Gate (do not proceed until):**
- [ ] Remaining open decisions are explicit, scoped, and non-surprising.
- [ ] No “silent backdoors” exist (e.g., tests or steps relying on deep imports that the target posture forbids without documenting why).

</step>

<step name="phase-4-implementation-slices">

**Objective:** Implement Morphology refactor slices end-to-end (no dual paths).

**Phase 4 focus (Morphology-specific):**
- Prioritize early establishment of:
  - the Morphology op contract surface (so downstream code can stop deep-importing internals),
  - the stage-owned artifact contracts and `deps` wiring posture (so producers/consumers are consistent),
  - and the buffer/overlay publish-once semantics (so the pipeline does not regress into “re-publish” behavior).

**Gate (per-slice):**
- [ ] Slice leaves the pipeline working end-to-end (tests + build + deploy gate as required).
- [ ] Slice leaves touched contracts and schemas documented (docs-as-code enforcement).
- [ ] Slice does not introduce new legacy authoring patterns (use the DX posture checklist).

</step>

<step name="lookback-4-phase-4-to-phase-5">

**Objective:** Reconcile plan vs implementation reality before final verification.

**Outputs (append to Phase 3 issue doc):**
- `## Lookback (Phase 4 → Phase 5): Stabilize and reconcile`

</step>

<step name="phase-5-verification-cleanup">

**Objective:** Verify, cleanup, and submit the Morphology refactor branch.

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

## Appendix A: Domain Surface Inventory (living)

This appendix is the “outside view” of the Morphology domain and its stage boundary. It should be a compact map of **what exists**, **what is public**, and **who depends on what**. Prefer lists over prose.

**Phase 1 requirement:** fill this with current-state reality (callers, deep imports, stage wiring).
**Phase 2 requirement:** revise this to reflect the target model (what should exist after refactor).

```yaml
files:
  - path: /src/domain/morphology/index.ts
    notes: Domain contract entrypoint (target); current status to be discovered in Phase 1.
  - path: /src/domain/morphology/ops/contracts.ts
    notes: Op contract router (target); current status known-empty, validate.
  - path: /src/domain/morphology/ops
    notes: Op implementation modules (current); enumerate and map to target atomic ops.
  - path: /src/recipes/standard/stages/morphology-pre
    notes: Stage boundary (current); convert to U21 posture, or collapse if Phase 2 decides.
  - path: /src/recipes/standard/stages/morphology-mid
    notes: Stage boundary (current); convert to U21 posture, or collapse if Phase 2 decides.
  - path: /src/recipes/standard/stages/morphology-post
    notes: Stage boundary (current); convert to U21 posture, or collapse if Phase 2 decides.
```

## Appendix B: Contract Matrix (living)

This is the contract spine for refactoring safely: **who provides what, who requires what**, and whether each dependency is an **artifact**, a **buffer**, or an **overlay**.

For each step:
- record its **current** contract (Phase 1) and its **target** contract (Phase 2),
- then Phase 3 slices will map the transition without breaking the pipeline.

```yaml
steps:
  - id: morphology/<stage>/<step-id>
    title: "<human-readable step name>"
    current:
      requires:
        artifacts: []
        buffers: []
        overlays: []
      provides:
        artifacts: []
        buffers: []
        overlays: []
    target:
      requires:
        artifacts: []
        buffers: []
        overlays: []
      provides:
        artifacts: []
        buffers: []
        overlays: []
    consumers:
      - "<stage-or-step that reads this output>"
    notes: ""
```

## Appendix C: Decisions + Defaults (living)

This list prevents “silent assumptions” from becoming accidental architecture.

### Default: Do not propagate legacy authoring
- **Context:** Legacy patterns are common in existing steps; they should be deleted, not re-encoded.
- **Choice:** Prefer inferred types from contracts; avoid redundant config-type imports/annotations in `run(...)` handlers.

### Decision: Keep `morphology-pre/mid/post` vs consolidate
- **Context:** Morphology is currently split into three recipe stages.
- **Options:**
  - (A) Keep three stages as explicit recipe sequencing boundaries.
  - (B) Collapse to a single `morphology` stage and express sequencing purely via steps.
  - (C) Keep split, but redefine boundaries to match the target domain-only model (e.g., pre = uplift + coarse shaping; mid = erosion cycle; post = sea level + finalization).
- **Choice:** TBD in Phase 2 (must be made explicit before Phase 3 slice planning).
- **Risk:** Re-slicing stage boundaries can cause cross-pipeline churn; mitigate by keeping contracts stable per-slice.

## Appendix D: Risk Register (living)

This is the “what could hurt us?” spine for the slice plan. Keep it honest, and keep it mapped to slice ordering.

```yaml
risks:
  - id: MORPH-001
    title: "Morphology buffers are mutated across multiple stages/steps"
    blocking: true
    severity: high
    mitigation: "Specify publish-once handle semantics; validate no re-publish; lock buffer identity early."
  - id: MORPH-002
    title: "Downstream domains deep-import Morphology internals"
    blocking: true
    severity: high
    mitigation: "Ship contract-first op surface early; migrate consumers to domain entrypoints."
```

## Appendix E: Golden Path Example (living)

This is the “how to write new Morphology code” exemplar: minimal, canonical, boundary-respecting authoring.

**Goal:** one small, representative op + step that demonstrates:
- contract-first op shape,
- step-local composition,
- buffer mutation via `ctx.buffers.*`,
- artifact access via `deps.artifacts.*`,
- overlay publication under `deps.artifacts.overlays.*` (or `ctx.overlays.*` if/when that becomes first-class).

**Reference:** Use the Ecology canonical patterns as the exemplar for wiring/authoring; Morphology should match that posture.
