---
name: plan-foundation-vertical-domain-refactor
description: |
  Draft Foundation domain implementation plan/spec.
  This plan instantiates the shared WORKFLOW for a Foundation refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Foundation (Vertical Domain Refactor)

This is the **Foundation-specific implementation plan/spec** for refactoring the Foundation domain end-to-end:
- **Domain modeling (model-first):** authoritative first-principles model, even if artifacts change (legacy behavior is not sacred).
- **SDK architecture:** contract-first ops + orchestration-only steps; stage-owned artifact contracts; `run(ctx, config, ops, deps)`.

This is a **draft plan** (not a milestone doc yet). The plan is expected to evolve via the built-in lookbacks.

**Backbone workflow:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

<!-- Path roots (convention used in this plan) -->
- `/src/...` = `mods/mod-swooper-maps/src/...`
- `/packages/mapgen-core/...` = `packages/mapgen-core/...`

## Canonical posture (enforced): do not propagate legacy

Foundation is the first “new canonical” vertical refactor plan we intend to reuse across domains. That means it must be explicit about the posture we want agents to take while implementing.

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
- `/src/recipes/standard/stages/foundation/` is partially aligned with canonical authoring posture:
  - stage-owned artifact contracts exist (`/src/recipes/standard/stages/foundation/artifacts.ts`),
  - the step uses `deps.artifacts.*` publishes,
  - but orchestration still routes through a monolithic producer (`/src/recipes/standard/stages/foundation/producer.ts`) instead of contract-first ops.
- Downstream domains (morphology/hydrology/narrative) read Foundation tensors via artifact tags (`artifact:foundation.*`), including indirect reads via `ctx.artifacts.get(...)` helper assertions in `packages/mapgen-core` (a coupling that ops-first refactor must eliminate).
- `env.directionality` is a required runtime input for Foundation + some downstream climate/story logic; current maps pass it in from the authored recipe config at runtime (config/env coupling).
- Some downstream domain code imports Foundation implementation constants directly (e.g. `BOUNDARY_TYPE`), creating module-layout coupling that must become a stable contract surface.

<workflow>

<step name="phase-0-setup">

**Objective:** Establish a stable starting point and a work environment for Foundation refactor work.

**Inputs:**
- `<milestone>` (e.g. `M9` when formalized)

**Outputs:**
- Worktree + branch for Foundation refactor work.
- A “baseline is green” note (or a recorded list of known failures + links).

**Steps (primary checkout; stop if dirty):**
```bash
git status
gt ls
git worktree list
```

Sync trunk metadata (do not restack as part of setup):
```bash
gt sync --no-restack
```

Create a new branch:
```bash
gt create refactor-<milestone>-foundation
```

**Steps (worktree):**
```bash
git worktree add ../wt-refactor-<milestone>-foundation refactor-<milestone>-foundation
cd ../wt-refactor-<milestone>-foundation
pwd -P
```

If any “living artifacts” exceed ~1 page, split them into a per-domain resources directory (optional):
```bash
mkdir -p docs/projects/engine-refactor-v1/resources/domains/foundation
```

Install deps (only if you will run checks in this worktree):
```bash
pnpm install
```

Baseline gates (mandatory; record failures with links + rationale if they’re environmental):
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

**Gate (do not proceed until):**
- [ ] You are operating in a worktree (`pwd -P` shows the worktree path).
- [ ] Baseline checks are green, or failures are recorded with links + rationale.

**References:**
- Shared workflow preflight: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

</step>

<step name="phase-1-current-state-spike">

**Objective:** Produce a Foundation-specific current-state spike: inventory everything Foundation touches, and everything that touches Foundation.

This phase is about **evidence**:
- what exists today,
- what violates canonical boundaries,
- what must be deleted vs migrated vs exposed via contracts.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-current-state.md`
- Ensure the spike links to (or embeds) the “living artifacts” spine:
  - Appendix A (Domain Surface Inventory; current-state)
  - Appendix B (Contract Matrix; current-state)
  - Appendix C (Decisions + Defaults; initial)
  - Appendix D (Risk Register; initial)
  - Appendix E (Golden Path Example; initial candidate)
- A “where it stands” inventory that includes:
  - complete step map (all sites that touch Foundation products),
  - dependency gating inventory (`requires/provides` and `artifacts.requires/provides` per step, with file paths),
  - stage-owned artifact contract catalog (`/src/recipes/standard/stages/**/artifacts.ts` entries that name Foundation products),
  - config surface map (schemas/defaults/normalizers + runtime fixups to delete),
  - typed-array inventory (constructors/lengths/validators) where relevant to Foundation (plates/graphs/fields),
  - deletion list (symbols + file paths that must go to zero to avoid legacy propagation).

**Scope (required inventory slices):**
- Domain entrypoint surface: `/src/domain/foundation/index.ts` exports and re-exports.
- Op catalog posture:
  - contract router: `/src/domain/foundation/ops/contracts.ts`,
  - implementations router: `/src/domain/foundation/ops/index.ts`,
  - current legacy/mixed surfaces (e.g., `/src/domain/foundation/ops.ts`, `plates.ts`, `plate-seed.ts`).
- Stage boundary (Standard recipe):
  - stage config: `/src/recipes/standard/stages/foundation/index.ts`,
  - stage-owned artifacts: `/src/recipes/standard/stages/foundation/artifacts.ts`,
  - producer/orchestration: `/src/recipes/standard/stages/foundation/producer.ts`,
  - step contract + runtime: `/src/recipes/standard/stages/foundation/steps/**`.
- Cross-domain coupling:
  - downstream stages/steps that read Foundation products (artifacts/buffers/overlays),
  - any deep imports into Foundation internals (to eliminate or convert into contracts).

**Phase 1 focus (Foundation-specific):**
- Stage + recipe wiring:
  - Identify how `/src/recipes/standard/stages/foundation/` is wired today (steps, contracts, producer/orchestration).
  - Identify where the Standard recipe expects Foundation outputs (artifacts/buffers/overlays; tags if any remain).
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
- [ ] Appendix A/B have at least a “current state” draft (even if incomplete).
- [ ] Appendix C/D have initial entries (decisions + risks) so Phase 2 doesn’t re-introduce silent assumptions.

**References:**
- Shared inventory guide: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`
- Contract posture + config design: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`

</step>

<step name="lookback-1-phase-1-to-phase-2">

**Objective:** Update the modeling plan based on Phase 1 discoveries.

**Inputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-current-state.md` (Phase 1 output)

**Outputs (append to Phase 1 spike):**
- `## Lookback (Phase 1 → Phase 2): Adjust modeling plan`
  - Include explicit “plan deltas” (not just a recap):
    - what surprised you (top 3),
    - updated boundary map (what is “in Foundation domain” vs “pipeline glue” vs “legacy to delete”),
    - what changed in Appendix A/B (inventory + contract matrix),
    - updated model hypotheses (what Phase 2 must validate/decide),
    - updated cross-pipeline touchpoints (upstream/downstream contracts Phase 2 must consider),
    - what new decisions/defaults are now required (Appendix C),
    - what new risks were discovered (Appendix D),
    - updated deletion list (anything discovered late).

**Gate (do not proceed until):**
- [ ] The Phase 2 modeling work is explicitly re-scoped based on evidence (not assumptions).
- [ ] Appendix C and Appendix D have at least first-pass entries (even if provisional).

</step>

<step name="phase-2-modeling-spike">

**Objective:** Define the “correct” Foundation model from first principles + canonical MapGen architecture posture.

Model-first principle (locked):
- **Authoritative first-principles model, even if artifacts change.** We do not preserve today’s artifact set/shape as an end in itself; we preserve only what the model requires and what the pipeline can coherently consume.

Modeling posture (enforced):
- ops are **atomic** (no op-calls-op composition),
- composition happens in steps/stages,
- rules are **policy units** imported into ops/strategies (avoid generic helper drift).

Earth-physics grounding (required):
- Discard legacy behavior that is incoherent or physically nonsensical unless there is a concrete gameplay/engine constraint.
- If preserving a legacy behavior is intentional, record it as a “kept legacy invariant” with rationale.

Cross-pipeline posture (required):
- Foundation is “upstream of everything”; its products are pipeline-wide contracts.
- If the modeled Foundation needs different inputs/outputs, plan the pipeline updates via stage-owned artifact contracts and the contract matrix (no ad-hoc deep imports, no “compat forever” shadows).

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-modeling.md`
  - target op catalog (ids + kinds + IO/config schemas + defaults + normalization ownership),
  - policy/rules map (what decisions exist and where they should live),
  - step/stage composition plan (which steps orchestrate which ops, and in what order),
  - explicit non-goals (what modeling work is deferred, if any),
  - pipeline delta list (downstream consumers that must adapt; staged contract changes if required).
- Update (or confirm) the canonical Foundation spec:
  - `docs/system/libs/mapgen/foundation.md`
- Update in this plan:
  - Appendix A (Domain Surface Inventory; target-state)
  - Appendix B (Contract Matrix; target-state mapping)
  - Appendix C (Decisions + Defaults; record provisional defaults and triggers)
  - Appendix D (Risk Register; revise based on target model)
  - Appendix E (Golden Path Example; update if Phase 2 changes the canonical step shape)

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
- [ ] Appendix B reflects the target `requires/provides` model (even if slice sequencing is not finalized yet).

**References:**
- Modeling guidelines: `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- ADRs:
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`
- Earth physics + domain spec index: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md`
- Pipeline posture: `docs/system/libs/mapgen/architecture.md`
- Foundation domain spec: `docs/system/libs/mapgen/foundation.md`
- Plate-graph seed: `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`

</step>

<step name="lookback-2-phase-2-to-phase-3">

**Objective:** Convert the target Foundation model into a slice-able implementation plan.

**Inputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-modeling.md` (Phase 2 output)

**Outputs (append to Phase 2 spike):**
- `## Lookback (Phase 2 → Phase 3): Adjust implementation plan`
  - Include explicit “plan deltas” (not just a recap):
    - finalized invariants (what must not change during implementation),
    - risks (top 3) + how slice ordering mitigates them (Appendix D),
    - pipeline delta slicing strategy (how contract changes land without breaking the pipeline),
    - contract matrix delta (what `requires/provides` changes, by slice),
    - draft slice boundaries (a first cut; Phase 3 hardens this into an executable checklist),
    - test strategy notes (what needs deterministic harnessing vs thin integration).

**Gate (do not proceed until):**
- [ ] The plan includes a slicing strategy for any cross-pipeline contract changes.
- [ ] Appendix D identifies which risks are “blocking” vs “nice to resolve”.

</step>

<step name="phase-3-implementation-plan-and-slice-plan">

**Objective:** Write a deterministic implementation issue + slice plan for Foundation (derived from the spikes).

**Outputs:**
- A local implementation issue doc (domain-local “source of truth”):
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-foundation-*.md`
- A slice plan in that issue doc, including for each slice:
  - steps included (ids + file paths),
  - ops introduced/changed (ids + kinds + module paths),
  - legacy entrypoints to delete (file paths / exports),
  - tests to add/update (op contract tests + any thin integration edge),
  - guardrail scope (`REFRACTOR_DOMAINS=foundation`),
  - pipeline deltas included (which upstream/downstream stages/contracts are updated in this slice, if any).
- Copy (or link) the plan spine into the issue doc so it remains executable:
  - Appendix B (Contract Matrix; target-state + slice deltas)
  - Appendix C (Decisions + Defaults)
  - Appendix D (Risk Register)
  - (Optional) Appendix A/E if they’re not embedded in the spike docs.

**Phase 3 focus (Foundation-specific):**
- Convert the op catalog into contract files + module surfaces.
- Convert the Foundation stage to the U21 authoring posture:
  - stage-owned artifact contracts,
  - step contracts using `artifacts.requires` / `artifacts.provides`,
  - step runtime using `deps.artifacts.*`,
  - step signature `run(ctx, config, ops, deps)`.
- Define a slice plan that keeps downstream stages working while Foundation contracts evolve.

**Gate (do not proceed until):**
- [ ] Slice plan is written and reviewable.
- [ ] Slice 1 is fully scoped and independently shippable (docs + tests + deletions included).
- [ ] Every planned slice can end in a working state (no “we’ll delete later”).
- [ ] Slice plan is explicitly ordered to mitigate the top “blocking” risks (Appendix D).

**References:**
- Shared workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Op + config design: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
- Verification + guardrails: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`

</step>

<step name="lookback-3-phase-3-to-phase-4">

**Objective:** Confirm the slice plan is executable before writing code.

**Inputs:**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-foundation-*.md` (Phase 3 output)

**Outputs (append to Phase 3 issue doc):**
- `## Lookback (Phase 3 → Phase 4): Finalize slices + sequencing`
  - Confirmed slice DAG (what blocks what; where pipeline deltas land)
  - Any prework findings completed during planning (code-intel checks, boundary confirmation)
  - Any remaining open decisions (should be rare; record options + default; update Appendix C)
  - “First slice is safe” checklist:
    - slice 1 deletes legacy paths (no dual implementation),
    - slice 1 updates docs-as-code for touched contracts,
    - slice 1 has deterministic tests or explicit test gaps recorded.

**Gate (do not proceed until):**
- [ ] Slice 1 is independently shippable (tests + docs + deletions included).
- [ ] Remaining open decisions are explicit, scoped, and non-surprising.
- [ ] No “silent backdoors” exist (e.g., tests or steps relying on deep imports that the target posture forbids without documenting why).

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
- [ ] Slice does not introduce new legacy authoring patterns (use the DX posture checklist).

</step>

<step name="lookback-4-phase-4-to-phase-5">

**Objective:** Reconcile plan vs implementation reality before final verification.

**Outputs (append to Phase 3 issue doc):**
- `## Lookback (Phase 4 → Phase 5): Stabilize and reconcile`
  - Any plan drift (what changed and why)
  - Any newly discovered cross-pipeline coupling (and how it was resolved)
  - Any follow-up work explicitly deferred (with triggers)
  - Final verification runbook adjustments (what is now the true “done” gate)

**Gate (do not proceed until):**
- [ ] The issue doc reflects the actual implementation outcome (no “paper plan” left behind).
- [ ] All intentional deferrals are explicit (no silent TODOs).

</step>

<step name="phase-5-verification-cleanup">

**Objective:** Verify, cleanup, and submit the Foundation refactor branch.

**Verification gates (must be green):**
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

**Submit:**
```bash
gt ss --draft
```

Include in PR notes:
- what was deleted (deletion list),
- what contracts changed (`requires/provides`, `artifacts.requires/provides`, stage-owned artifact contracts, config keys),
- what tests were added and how to run them.

**Worktree cleanup (after submission):**
```bash
git worktree list
```

Remove only the worktrees you created for this refactor.

**Gate (done when):**
- [ ] Full verification gates are green.
- [ ] PR/stack is submitted.
- [ ] Worktrees are cleaned up and `git worktree list` is sane.

**References:**
- Verification + guardrails: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`

</step>

</workflow>

## Notes (intentionally non-binding)

This plan intentionally avoids locking down:
- exact op ids/names,
- exact buffer/artifact/overlay identifiers,
- exact file/module paths for slices,

until Phase 1/2 discoveries are complete. Treat those phases as the “plan-shaping” engine.

## Appendix A: Domain Surface Inventory (living)

This appendix is the “outside view” of the Foundation domain and its stage boundary. It should be a compact map of **what exists**, **what is public**, and **who depends on what**. Prefer lists over prose.

**Phase 1 requirement:** fill this with current-state reality (callers, deep imports, stage wiring).
**Phase 2 requirement:** revise this to reflect the target model (what should exist after refactor).

```yaml
files:
  - path: /src/recipes/standard/recipe.ts
    notes: Standard recipe ordering; Foundation runs first.

  # Foundation stage boundary (source of truth for publish-once artifact contracts + step wiring)
  - path: /src/recipes/standard/stages/foundation/index.ts
    notes: Stage module; currently contains one step (`foundation`).
  - path: /src/recipes/standard/stages/foundation/artifacts.ts
    notes: Stage-owned artifact contracts for foundation outputs (plates/dynamics/seed/diagnostics/config).
  - path: /src/recipes/standard/stages/foundation/producer.ts
    notes: Monolithic producer/orchestration; calls Foundation implementation modules directly.
  - path: /src/recipes/standard/stages/foundation/steps/foundation.contract.ts
    notes: Step contract; provides all foundation artifacts; schema includes FoundationConfigSchema.
  - path: /src/recipes/standard/stages/foundation/steps/foundation.ts
    notes: Step runtime; publishes artifacts via deps.artifacts.* and calls runFoundationStage (producer).

  # Foundation domain module (current state is not ops-first)
  - path: /src/domain/foundation/index.ts
    notes: Domain entrypoint (`defineDomain({ id: \"foundation\", ops })`); exports types; ops router currently empty.
  - path: /src/domain/foundation/ops/contracts.ts
    notes: Empty op contract router (no declared ops).
  - path: /src/domain/foundation/ops/index.ts
    notes: Empty op implementations router (no implementations).
  - path: /src/domain/foundation/ops.ts
    notes: createDomain(domain, implementations) wrapper; runtime ops surface exists but is empty.
  - path: /src/domain/foundation/plates.ts
    notes: Voronoi plate generation implementation (typed arrays) used by the Foundation stage producer.
  - path: /src/domain/foundation/plate-seed.ts
    notes: PlateSeedManager capture/finalize; used by producer and tests.
  - path: /src/domain/foundation/constants.ts
    notes: Re-exports `BOUNDARY_TYPE`; imported by downstream domain implementations (coupling).

callers:
  # Downstream steps that explicitly require foundation artifacts via step contracts
  - path: /src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts
    notes: Requires foundationPlates.
  - path: /src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts
    notes: Requires foundationPlates (and storyOverlays).
  - path: /src/recipes/standard/stages/morphology-post/steps/mountains.contract.ts
    notes: Requires foundationPlates.
  - path: /src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts
    notes: Requires foundationPlates.
  - path: /src/recipes/standard/stages/narrative-pre/steps/storyRifts.contract.ts
    notes: Requires foundationPlates (and storyOverlays).
  - path: /src/recipes/standard/stages/narrative-mid/steps/storyOrogeny.contract.ts
    notes: Requires foundationPlates + foundationDynamics (and storyOverlays).
  - path: /src/recipes/standard/stages/narrative-swatches/steps/storySwatches.contract.ts
    notes: Requires foundationDynamics (and heightfield/climateField/overlays).
  - path: /src/recipes/standard/stages/hydrology-post/steps/climateRefine.contract.ts
    notes: Requires foundationDynamics (and heightfield/climateField/overlays/riverAdjacency).

  # Downstream domain logic that reads foundation artifacts indirectly via ctx.artifacts.get (legacy coupling)
  - path: packages/mapgen-core/src/core/assertions.ts
    notes: assertFoundationPlates/assertFoundationDynamics fetch from ctx.artifacts.get(artifact:foundation.*).
  - path: /src/domain/morphology/landmass/index.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/morphology/mountains/apply.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/morphology/volcanoes/apply.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/morphology/coastlines/rugged-coasts.ts
    notes: Reads plates via assertFoundationPlates(ctx, ...).
  - path: /src/domain/hydrology/climate/refine/index.ts
    notes: Reads dynamics via assertFoundationDynamics(ctx, ...).
  - path: /src/domain/hydrology/climate/swatches/monsoon-bias.ts
    notes: Reads dynamics via assertFoundationDynamics(ctx, ...).

tests:
  - path: /test/foundation/voronoi.test.ts
  - path: /test/foundation/plates.test.ts
  - path: /test/foundation/plate-seed.test.ts
```

## Appendix B: Contract Matrix (living)

This is the contract spine for refactoring safely: **who provides what, who requires what**, and whether each dependency is an **artifact**, a **buffer**, or an **overlay**.

For each step:
- record its **current** contract (Phase 1) and its **target** contract (Phase 2),
- then Phase 3 slices will map the transition without breaking the pipeline.

```yaml
steps:
  - id: foundation/foundation
    title: "Publish Foundation tensors (plates/dynamics) + snapshots"
    current:
      requires:
        artifacts: []
        buffers: []
        overlays: []
      provides:
        artifacts:
          - artifact:foundation.plates
          - artifact:foundation.dynamics
          - artifact:foundation.seed
          - artifact:foundation.diagnostics
          - artifact:foundation.config
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
      - morphology-pre/landmass-plates
      - morphology-mid/rugged-coasts
      - narrative-pre/story-rifts
      - narrative-mid/story-orogeny
      - morphology-post/mountains
      - morphology-post/volcanoes
      - narrative-swatches/story-swatches (dynamics)
      - hydrology-post/climate-refine (dynamics)
    notes: "Current orchestration is monolithic producer (not contract-first ops)."

  - id: morphology-pre/landmass-plates
    title: "Landmass generation (plate-driven)"
    current:
      requires:
        artifacts: [artifact:foundation.plates]
        buffers: []
        overlays: []
      provides:
        artifacts: []
        buffers: []
        overlays: []
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Domain logic reads plates via assertFoundationPlates(ctx, ...); also uses engine-effect tags (non-artifact gating)."

  - id: morphology-mid/rugged-coasts
    title: "Rugged coasts (margin/corridor-aware)"
    current:
      requires:
        artifacts: [artifact:foundation.plates]
        buffers: []
        overlays: [artifact:storyOverlays]
      provides:
        artifacts: []
        buffers: []
        overlays: []
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Requires story overlays; domain logic reads plates via assertFoundationPlates(ctx, ...)."

  - id: narrative-pre/story-rifts
    title: "Story motifs: rift valleys"
    current:
      requires:
        artifacts: [artifact:foundation.plates]
        buffers: []
        overlays: [artifact:storyOverlays]
      provides:
        artifacts: []
        buffers: []
        overlays: [artifact:storyOverlays]
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Consumes plates; appends rift motifs into overlays."

  - id: narrative-mid/story-orogeny
    title: "Story motifs: orogeny belts"
    current:
      requires:
        artifacts: [artifact:foundation.plates, artifact:foundation.dynamics]
        buffers: []
        overlays: [artifact:storyOverlays]
      provides:
        artifacts: []
        buffers: []
        overlays: [artifact:storyOverlays]
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Consumes plates+dynamics; appends orogeny motifs into overlays."

  - id: narrative-swatches/story-swatches
    title: "Story overlays: climate swatches (hydrology-facing)"
    current:
      requires:
        artifacts: [artifact:foundation.dynamics]
        buffers: [artifact:heightfield, artifact:climateField]
        overlays: [artifact:storyOverlays]
      provides:
        artifacts: []
        buffers: []
        overlays: [artifact:storyOverlays]
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Swatches/monsoon logic reads dynamics via assertFoundationDynamics(ctx, ...); step code also requires env.directionality."

  - id: hydrology-post/climate-refine
    title: "Post-rivers climate refinement (earthlike)"
    current:
      requires:
        artifacts: [artifact:foundation.dynamics, artifact:riverAdjacency]
        buffers: [artifact:heightfield, artifact:climateField]
        overlays: [artifact:storyOverlays]
      provides:
        artifacts: []
        buffers: []
        overlays: []
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Refinement logic reads dynamics via assertFoundationDynamics(ctx, ...); step code also requires env.directionality."

  - id: morphology-post/mountains
    title: "Mountains placement (plate-aware physics)"
    current:
      requires:
        artifacts: [artifact:foundation.plates]
        buffers: []
        overlays: []
      provides:
        artifacts: []
        buffers: []
        overlays: []
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Domain logic reads plates via assertFoundationPlates(ctx, ...)."

  - id: morphology-post/volcanoes
    title: "Volcano placement (plate-aware)"
    current:
      requires:
        artifacts: [artifact:foundation.plates]
        buffers: []
        overlays: []
      provides:
        artifacts: []
        buffers: []
        overlays: []
    target:
      requires: { artifacts: [], buffers: [], overlays: [] }
      provides: { artifacts: [], buffers: [], overlays: [] }
    consumers: []
    notes: "Domain logic reads plates via assertFoundationPlates(ctx, ...)."
```

## Appendix C: Decisions + Defaults (living)

This list prevents “silent assumptions” from becoming accidental architecture.

### Default: Do not propagate legacy authoring
- **Context:** Legacy patterns are common in existing steps; they should be deleted, not re-encoded.
- **Choice:** Prefer inferred types from contracts; avoid redundant config-type imports/annotations in `run(...)` handlers.
- **Trigger to revisit:** Only if Phase 1/2 show a concrete typing gap that cannot be solved via canonical authoring helpers.

### Decision: Foundation posture is plate-graph-first
- **Context:** PRD direction is plate graph (Delaunay/Voronoi) rather than legacy tile-first foundation.
- **Choice:** (TBD in Phase 2) Confirm the canonical domain-only model assumes graph/mesh-first.
- **Trigger to revisit:** If an engine constraint makes graph/mesh-first infeasible without a staged migration.

### Decision (Phase 2): Directionality ownership posture
- **Context:** Current runtime expects `env.directionality` (wired from authored recipe config); some downstream steps assume it exists.
- **Choice:** (TBD in Phase 2) Decide whether directionality is env-only, config-only, or hybrid (env override + config defaults).
- **Trigger to revisit:** Only if we introduce a new runtime host that cannot supply env directionality (or if directionality becomes fully derived from Foundation modeling).

### Decision (Phase 2): Stable boundary semantics surface
- **Context:** Downstream domain code imports boundary enums/constants (`BOUNDARY_TYPE`) from Foundation implementation modules today.
- **Choice:** (TBD in Phase 2) Define a stable “contract surface” export for boundary semantics so downstream can depend on it without module-layout coupling.
- **Trigger to revisit:** Only when Morphology refactor lands and no longer needs boundary constants from Foundation.

## Appendix D: Risk Register (living)

Record whether a risk is **blocking** (must be resolved before implementation proceeds) vs **nice-to-resolve** (ideally resolved, but can be left as an explicit decision/deferral).

```yaml
risks:
  - id: R1
    title: "Downstream domains read Foundation artifacts via ctx.artifacts"
    severity: high
    blocking: true
    notes: "Legacy coupling via `packages/mapgen-core/src/core/assertions.ts` and downstream domain implementations; slice ordering must avoid introducing new ctx.artifacts dependencies."
  - id: R2
    title: "Downstream imports depend on Foundation implementation module layout"
    severity: high
    blocking: true
    notes: "BOUNDARY_TYPE imports from Foundation implementation modules require a stable contract surface."
  - id: R3
    title: "Directionality is env-owned but authored in config"
    severity: medium
    blocking: false
    notes: "Phase 2 must define a single canonical posture for env vs config vs override."
  - id: R4
    title: "Typed array schema posture is split between Type.Any and runtime validators"
    severity: medium
    blocking: false
    notes: "Phase 2 should decide whether artifact schemas remain permissive (validation in runtimes) or become explicit TypeBox schemas/helpers."
```

## Appendix E: Golden Path Example (canonical authoring)

Use this as the “one representative step” reference when authoring new Foundation steps. This is intentionally minimal and focuses on boundaries and DX.

**Targets to demonstrate:**
- `contract.ts` imports only the domain entrypoint + stage-owned artifact contracts.
- Step runtime uses `run(ctx, config, ops, deps)` and reads/writes via `deps.artifacts.*`.
- No redundant config typing imports when inference already provides it.
- Docs-as-code: JSDoc and schema `description` updates after tracing callsites.

**Reference for style (existing exemplar):**
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`
