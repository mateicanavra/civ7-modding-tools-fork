---
name: plan-ecology-vertical-domain-refactor
description: |
  Draft Ecology domain implementation plan/spec.
  Ecology is the intended canonical exemplar for SDK architecture + DX, but may still contain modeling debt.
  This plan is explicitly adaptive: Phase 1 is expected to decide how much to redo vs reconcile.
---

# PLAN: Ecology (Vertical Domain Refactor)

This is the **Ecology-specific implementation plan/spec** for refactoring the Ecology domain end-to-end:
- **Domain modeling:** physically grounded, first-principles, authoritative (legacy behavior is not sacred).
- **SDK architecture:** contract-first ops + orchestration-only steps; stage-owned artifact contracts; `run(ctx, config, ops, deps)`.

This plan is expected to be “lighter” than other domains **if** Phase 1 confirms Ecology is already aligned. Do not guess: treat Phase 1 as the arbiter of scope.

**Backbone workflow:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

<!-- Path roots -->
 = mods/mod-swooper-maps
 = packages/mapgen-core

## Canonical posture (enforced): do not propagate legacy

Ecology is the canonical exemplar we expect other domains to copy. That means this refactor must be uncompromising about:
- deleting legacy authoring patterns, and
- expressing all work through the canonical architecture and authoring surfaces.

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

Prefer writing these as standalone resources under:
- `docs/projects/engine-refactor-v1/resources/domains/ecology/`

Then link from this plan as needed.

- Appendix A: **Domain Surface Inventory (outside view)**
- Appendix B: **Contract Matrix (requires/provides; artifacts vs buffers vs overlays)**
- Appendix C: **Decisions + Defaults**
- Appendix D: **Risk Register**
- Appendix E: **Golden Path Example (canonical authoring)**

## Ecology-specific framing (read once)

Ecology sits downstream of Foundation/Morphology/Hydrology and consumes both:
- **shared mutable buffers** (e.g., fields/layers), and
- **publish-once artifacts** (e.g., classifications, plans, overlays).

It typically publishes:
- classification artifacts (e.g., biomes/pedology),
- “intent/plan” artifacts consumed by later application steps,
- (optionally) overlays that describe motifs/patterns for downstream consumers (Placement, etc).

This means:
- Phase 1/2 must be **cross-pipeline aware** (expect downstream contract changes).
- Slice planning must preserve “pipeline coherence” at every boundary (avoid a big-bang rewrite unless explicitly justified).

**North-star inputs (modeling):**
- Canonical domain modeling: `docs/system/libs/mapgen/ecology.md`
- Pipeline posture + buffers/overlays: `docs/system/libs/mapgen/architecture.md`
- Upstream seed surfaces: `docs/system/libs/mapgen/hydrology.md`, `docs/system/libs/mapgen/morphology.md`
- Downstream consumers (contract stability): `docs/system/libs/mapgen/placement.md`, `docs/system/libs/mapgen/narrative.md`

**Ecology “special case” for this plan:**
- If Phase 1 confirms Ecology is already aligned with:
  - stage-owned artifact contracts,
  - `run(ctx, config, ops, deps)` authoring,
  - import discipline and module boundaries,
  - buffer-vs-artifact-vs-overlay semantics,
  then you should **compress** Phase 2/3/4 into the minimum necessary reconciliation work (and record that choice in Appendix C).

**Known current-state reality (to validate in Phase 1; do not assume beyond this list):**
- `/src/domain/ecology/ops/contracts.ts` is populated (Ecology already has a contract router).
- `/src/recipes/standard/stages/ecology/` exists and compiles a stage config surface.
- Some Ecology step modules still appear to use legacy dependency wiring patterns (validate and record).

<workflow>

<step name="phase-0-setup">

**Objective:** Establish a stable starting point and a work environment for Ecology refactor work.

**Inputs:**
- `<milestone>` (e.g. `M9` when formalized)

**Outputs:**
- Worktree + branch for Ecology refactor work.
- A “baseline is green” note (or a recorded list of known failures + links).

**Gate (do not proceed until):**
- [ ] You are operating in a worktree.
- [ ] Baseline checks are green, or failures are recorded with rationale.

**References:**
- Shared workflow preflight: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

</step>

<step name="phase-1-current-state-spike">

**Objective:** Produce an Ecology current-state spike: inventory everything Ecology touches, and everything that touches Ecology.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-current-state.md`
- Update (at least a first draft) in the Ecology resource dir:
  - `docs/projects/engine-refactor-v1/resources/domains/ecology/inventory.md`
  - `docs/projects/engine-refactor-v1/resources/domains/ecology/contract-matrix.md`
- Update (at least a first draft) in this plan:
  - Appendix C (Decisions + Defaults; list discovered decision points)
  - Appendix D (Risk Register; list discovered risks)

**Scope (required inventory slices):**
- Domain entrypoint surface (`@mapgen/domain/ecology`): exports, types, re-exports, public contracts.
- Op catalog: ids, contracts, current callsites (who calls what).
- Stage + steps: stage public schema, compile mapping, step contracts, step runtime wiring.
- Artifacts vs buffers vs overlays:
  - what is treated as publish-once output,
  - what is shared mutable working state,
  - what “story overlays” exist today (or should exist).
- Cross-domain coupling: anything outside Ecology that imports Ecology shapes (config/types/contracts).

**Gate (do not proceed until):**
- [ ] Current-state spike exists and includes (at minimum): outside-view inventory + contract matrix + cross-domain coupling notes.
- [ ] Risks are recorded with severity + blocking flag (Appendix D).

**References:**
- Inventory structure: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`
- Contract posture: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`

</step>

<step name="phase-1-lookback-and-scope-decision">

**Objective:** Decide (with evidence) how much Ecology needs to change, and update downstream phases accordingly.

**Inputs:**
- The completed Phase 1 spike + inventories.

**Outputs:**
- Update `docs/projects/engine-refactor-v1/resources/domains/ecology/decisions.md` (or Appendix C) with:
  - a scope classification (`green | yellow | red`),
  - the chosen refactor track (reconciliation vs full vertical refactor),
  - explicit gates for what must change vs what can be left as-is.
- Update Phase 2/3/4 sections in this plan to reflect the chosen track (do not keep “placeholder work” if it is not needed).

**Scope classification rubric (use as a decision aid, not a scorecard):**
- **Green:** architecture posture is already canonical; only targeted modeling changes remain.
- **Yellow:** architecture posture is mixed; some stage/step wiring must be upgraded to canonical before modeling can proceed cleanly.
- **Red:** architecture posture is largely legacy; treat Ecology like other domains and run all phases fully.

**Gate (do not proceed until):**
- [ ] A scope classification is recorded, with evidence (file paths + brief notes).
- [ ] The plan has been adjusted so Phase 2/3/4 are realistic and not aspirational.

</step>

<step name="phase-2-modeling-spike">

**Objective:** Produce an Ecology modeling spike from first principles: what should the Ecology domain look like, grounded in Earth physics and pipeline needs?

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-modeling.md`
- Updated “target-state” versions of:
  - `docs/projects/engine-refactor-v1/resources/domains/ecology/inventory.md`
  - `docs/projects/engine-refactor-v1/resources/domains/ecology/contract-matrix.md`
- Updated decisions + defaults (Appendix C / `decisions.md`) for:
  - which behaviors are deleted vs preserved,
  - what becomes an op vs what becomes step composition,
  - which shared layers are buffers vs publish-once artifacts,
  - which overlays are published and where they live.

**Gate (do not proceed until):**
- [ ] Modeling spike contains a concrete target “op catalog” (atomic ops only; no composition inside ops).
- [ ] Modeling spike states which legacy behaviors are intentionally removed and why.
- [ ] Contract matrix has a target column (artifacts/buffers/overlays clearly separated).

**References:**
- Canonical Ecology spec: `docs/system/libs/mapgen/ecology.md`
- Cross-domain posture: `docs/system/libs/mapgen/architecture.md`

</step>

<step name="phase-2-lookback-and-plan-adjustment">

**Objective:** Convert Phase 2 modeling results into a stable Phase 3 slice plan posture.

**Outputs:**
- Update Appendix C / `decisions.md`:
  - finalize decisions needed for slice planning,
  - mark anything unresolved as explicit open questions (with options).
- Update Appendix D / `risks.md`:
  - convert high-severity risks into slice-level mitigations.

**Gate (do not proceed until):**
- [ ] The target op catalog is stable enough to slice without “thrash”.
- [ ] Any unresolved decisions are explicitly logged (no silent assumptions).

</step>

<step name="phase-3-implementation-plan-and-slice-planning">

**Objective:** Turn the Phase 1/2 artifacts into a concrete, merge-safe implementation plan (sliced).

**Outputs:**
- A Phase 3 implementation issue doc (local issue) that enumerates slices, each with:
  - explicit acceptance criteria,
  - explicit verification commands,
  - explicit file touchpoints,
  - explicit contracts updated (artifacts vs buffers vs overlays).
- A “slice DAG” note (which slices block which).

**Gate (do not proceed until):**
- [ ] Every slice leaves the pipeline in a working state.
- [ ] Each slice has a verification runbook (commands, not prose).

**References:**
- Slice mechanics: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/subflows/IMPLEMENTATION.md`
- Guardrails: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`

</step>

<step name="phase-3-lookback-and-readiness-check">

**Objective:** Confirm the slice plan is executable without hidden ambiguity.

**Outputs:**
- Update `docs/projects/engine-refactor-v1/resources/domains/ecology/risks.md` with:
  - which risks are now “handled by slices” vs still open.
- Ensure the Phase 3 issue doc includes:
  - import discipline checks (lint),
  - docs-as-code requirements (JSDoc + schema descriptions),
  - cross-pipeline contract update guidance.

**Gate (do not proceed until):**
- [ ] No slice relies on an unstated invariant (“black ice”).
- [ ] Risk register has no blocking items without owners/slices.

</step>

<step name="phase-4-implementation-slices">

**Objective:** Implement the refactor in small, reviewable slices.

**Per-slice requirements (do not skip):**
- Update the domain/stage/steps to the canonical authoring posture:
  - stage-owned artifact contracts (`/src/recipes/standard/stages/ecology/artifacts.ts`),
  - step contract `artifacts.requires` / `artifacts.provides`,
  - step runtime uses `run(ctx, config, ops, deps)` and `deps.artifacts.*`.
- Enforce import discipline (lint) and keep tests canonical by default:
  - tests should prefer domain entrypoints + stage-owned contracts,
  - deeper imports are allowed only when necessary and should be intentional.
- Docs-as-code: any touched exported function/op/step/schema gets contextual JSDoc/`description` updates after tracing callsites.

**Outputs:**
- A sequence of slices merged/stacked with:
  - updated code,
  - updated contracts,
  - updated docs artifacts (inventory/contract-matrix/decisions/risks),
  - updated tests (as needed).

**Gate (per slice):**
- [ ] Slice-specific verification runbook is executed and recorded.
- [ ] No slice introduces a second “temporary path” (single canonical path only).

</step>

<step name="phase-4-lookback-and-consolidation">

**Objective:** Consolidate decisions, docs, and surfaces so Ecology remains the canonical exemplar after implementation.

**Outputs:**
- Update `docs/projects/engine-refactor-v1/resources/domains/ecology/INDEX.md` (if used) with:
  - links to inventories, decisions, risks, spikes, and the final implementation issue.
- Ensure any “temporary compromises” are recorded as explicit deferrals with triggers.

**Gate (do not proceed until):**
- [ ] Ecology can be pointed to as the canonical exemplar without caveats.

</step>

<step name="phase-5-verify-cleanup-extras">

**Objective:** Verify correctness, remove leftovers, and ship a clean domain surface.

**Outputs:**
- An execution log (or short checklist) recording verification steps and results.
- If needed: follow-up issue(s) for deferred work with explicit triggers.

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

This appendix is the “outside view” of the Ecology domain and its stage boundary. It should be a compact map of **what exists**, **what is public**, and **who depends on what**. Prefer lists over prose.

**Phase 1 requirement:** fill this with current-state reality (callers, deep imports, stage wiring).
**Phase 2 requirement:** revise this to reflect the target model (what should exist after refactor).

```yaml
files:
  - path: /src/domain/ecology/index.ts
    notes: Domain contract entrypoint; validate exports + intended public surface.
  - path: /src/domain/ecology/ops/contracts.ts
    notes: Op contract router; validate op catalog + contract shapes.
  - path: /src/recipes/standard/stages/ecology/index.ts
    notes: Stage entry; validate compile surface + step list.
  - path: /src/recipes/standard/stages/ecology/artifacts.ts
    notes: Stage-owned artifact contracts (target); current status to be discovered in Phase 1.
  - path: /src/recipes/standard/stages/ecology/steps
    notes: Step modules + contracts (current + target); enumerate.
  - path: /src/recipes/standard/recipe.ts
    notes: Recipe wiring; verify where Ecology ops/stage is registered.
```

## Appendix B: Contract Matrix (living)

This is the contract spine for refactoring safely: **who provides what, who requires what**, and whether each dependency is an **artifact**, a **buffer**, or an **overlay**.

For each step:
- record its **current** contract (Phase 1) and its **target** contract (Phase 2),
- then Phase 3 slices will map the transition without breaking the pipeline.

```yaml
steps:
  - id: ecology/<step-id>
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
- **Trigger to revisit:** Only if Phase 1/2 show a concrete typing gap that cannot be solved via canonical authoring helpers.

### Decision: Ecology phase structure (single vs split stage)
- **Context:** Ecology is currently authored as a single recipe stage with multiple steps.
- **Options:** (A) keep as one stage, (B) split into multiple ecology-* stages aligned to model boundaries.
- **Choice:** TBD in Phase 1 lookback (must be evidence-based).
- **Risk:** Split stages can increase churn across recipe wiring; keeping one stage can force overly broad artifact contracts.

### Decision: Overlays published by Ecology (if any)
- **Context:** Ecology consumes story overlays (e.g., corridors) and may publish additional overlays for downstream consumers.
- **Choice:** TBD in Phase 2 (define overlay types and publish posture under `overlays.<type>`).
- **Trigger to revisit:** If Placement needs additional motif surfaces that cannot be expressed via existing artifacts/buffers.

## Appendix D: Risk Register (living)

Record whether a risk is **blocking** (must be resolved before implementation proceeds) vs **nice-to-resolve** (ideally resolved, but can be left as an explicit decision/deferral).

```yaml
risks:
  - id: R1
    title: "Cross-domain coupling to Ecology config/types"
    severity: high
    blocking: true
    notes: "Phase 1 must enumerate cross-domain imports (e.g., Narrative depending on Ecology shapes); Phase 3 must slice contract changes to keep pipeline coherent."
  - id: R2
    title: "Buffers/artifacts/overlays confusion causes accidental republish or mutation"
    severity: high
    blocking: true
    notes: "Phase 1 must inventory publish sites; Phase 4 must enforce publish-once for artifacts and buffer/overlay policies."
  - id: R3
    title: "Ecology ops contain hidden composition (non-atomic ops)"
    severity: medium
    blocking: false
    notes: "Phase 2 decides op catalog; Phase 4 may need to split ops into atomic contracts and move composition into steps."
  - id: R4
    title: "Engine-binding side effects make behavior changes hard to validate"
    severity: medium
    blocking: false
    notes: "Phase 3 must define verification strategy; Phase 4 slices should keep an end-to-end smoke check."
```

## Appendix E: Golden Path Example (canonical authoring)

Use this as the “one representative step” reference when authoring new Ecology steps. This is intentionally minimal and focuses on boundaries and DX.

**Targets to demonstrate:**
- `contract.ts` imports only the domain entrypoint + stage-local contracts (e.g. `../artifacts.ts`).
- Step runtime uses `run(ctx, config, ops, deps)` and reads/writes via `deps.artifacts.*`.
- No redundant config typing imports when inference already provides it.
- Docs-as-code: JSDoc and schema `description` updates after tracing callsites.

**Reference for contract style (existing exemplar):**
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`

