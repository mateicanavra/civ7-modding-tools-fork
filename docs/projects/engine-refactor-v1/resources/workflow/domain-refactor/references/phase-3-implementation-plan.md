# Phase 3 Implementation Plan (Template)

## Purpose

Convert the spikes into an executable slice plan and a single source-of-truth issue doc.

## Phase 3 issue doc skeleton (early milestone draft; copy/paste)

Use this as the required top-level structure for `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-<domain>-*.md`.
Keep it scannable: short sections, concrete checklists, and executable verification commands.

### 0) Header (required)

- Title: `<milestone>: <domain> — Phase 3 Implementation Plan`
- Effort estimate: `<complexity> × <parallelism>` (example: `Medium × Low`)

### 1) Objective (required)

- One paragraph: what changes in the system after Phase 4 is complete (current → target), in domain terms.

### 2) Scope (required)

- **In scope:** what this refactor migrates/deletes/cuts over.
- **Out of scope:** what it explicitly does not touch (and why).

### 3) Locked decisions + bans (required; copy verbatim)

- Copy the non-negotiable locks from this template (topology; boundary; no backfeeding; effects; bans; TerrainBuilder no-drift).
- For each lock, name the enforcement mechanism in this milestone (guardrail scan, contract-guard test, or explicit deletion/migration in a specific slice).

### 4) Workstreams (required)

- List the major parallelizable tracks (contracts/ops, steps/stages wiring, consumer migrations, docs/tests/guardrails, cleanup).

### 5) Slice plan (required)

For each slice (A/B/C…):
- **Scope:** steps/ops/contracts included (ids + paths).
- **Cutovers/deletions:** what legacy entrypoints/surfaces die in-slice (paths/exports).
- **Downstream:** consumer migration matrix entries completed in-slice.
- **Guardrails:** which lock checks/tests are added in-slice.
- **Exit criteria:** what “pipeline-green” means for that slice.

### 6) Acceptance criteria (required)

- Phase 3 completion checklist (plan quality gates).
- Phase 4 slice completion checklist summary (what every slice must satisfy).

### 7) Verification commands (required)

- List commands to run for Phase 3 review and Phase 4 slice verification.
- Commands must be executable (not prose) and scoped (fast gates vs full gates).

### 8) Risks + mitigations (required)

- Key risks that could cause drift (contracts/ownership violations, determinism drift, adapter coupling, TerrainBuilder ordering).
- Mitigation per risk (guardrail/test/slice ordering).

### 9) Open questions (optional; prefer zero)

- Only if a decision is truly blocked and cannot be resolved from Phase 2 canon + code evidence.

## Scope guardrails

- This is slice planning only. Do not change the model here.
- Topology is locked: `wrapX=true`, `wrapY=false`. No wrap knobs/env/config; wrap flags must not appear as contract inputs.
- Every slice must end in a pipeline-green state (no dual paths).
- The refactored domain must not retain compat surfaces; downstream adjustments are part of the plan.
- Do not preserve story/narrative/overlay surfaces in the refactor: replace any load-bearing ones with canonical, domain-anchored contracts and migrate consumers to those.
- Hard ban: no hidden multipliers/constants/defaults. Do not plan for (or accept) unnamed behavior-shaping numeric values in compile/normalize/run paths. Any multiplier/threshold/curve parameter MUST be either config/knobs or a named internal constant with explicit intent.
- Hard ban: no placeholders / dead bags. Do not plan for (or accept) empty directories, placeholder modules, empty config bags, or “future scaffolding” surviving any slice. If something is not used, it must not exist.
- No “later” buckets. Every slice is explicit with deliverables and a branch/subissue plan.
- Locked decisions must be test-backed in the same slice they are introduced.

## Global cutover requirement (map projections + materialization lane)

This Phase 3 plan MUST execute a full cutover to the canonical “truth vs map projection/materialization” posture in one continuous effort. No legacy paths survive.

Hard requirements:
- Topology lock: Civ7 is `wrapX=true`, `wrapY=false`. No wrap knobs/env/config.
- Physics steps MUST NOT `require`/consume `artifact:map.*` as inputs.
- Physics steps MUST NOT `require`/consume `effect:map.*` as inputs.
- Physics truth MAY be tile-indexed and MAY include `tileIndex`; the ban is on engine/game-facing ids, adapter coupling, and consuming map-layer projections/materialization.
- `artifact:map.*` is Gameplay-owned and exists for projection/annotation/observability and future gameplay reads.
- Hard ban: do not introduce any `artifact:map.realized.*` namespace. Use `effect:map.*` for execution guarantees; use narrowly scoped `artifact:map.*` observation layers only when needed (e.g., engine-derived elevation/cliff masks after `effect:map.elevationBuilt`).
- Adapter/engine reads/writes happen only in Gameplay-owned steps and must provide the corresponding `effect:map.<thing><Verb>` (use a semantically correct, short, consolidated verb; e.g. `effect:map.mountainsPlotted`, `effect:map.elevationBuilt`).
- Any existing engine-coupled work currently living in “physics stages” must be reclassified into the Gameplay/materialization lane as part of the cutover (even if braided in the same phase ordering).

Additional hard requirement (TerrainBuilder / engine-derived fields):
- Any use of engine-derived elevation/cliffs (`TerrainBuilder.buildElevation()`; `GameplayMap.getElevation(...)`; `GameplayMap.isCliffCrossing(...)`) MUST be confined to Gameplay steps (build/plot) and gated by `effect:map.elevationBuilt`.
- Phase 3 must delete all Physics-stage “engine sync” patterns (example: `syncHeightfield(...)`) and any Physics-step reads from the adapter/engine surfaces. Physics must consume Physics truth artifacts only.
- Closure rule (avoid “two truths” bugs): if a rule/strategy needs the *actual Civ7* elevation bands or cliff crossings to be correct, that rule/strategy is Gameplay/map logic and must run after `build-elevation` (never inside Physics).
- Gameplay plotting/stamping steps MAY (and often should) combine:
  - Physics truths + complementary Physics signals (e.g., slope/roughness/plateau-ness), and
  - engine-derived elevation/cliffs after `effect:map.elevationBuilt`,
  to ensure downstream decisions match the stamped map without backfeeding engine state into Physics truth.
- Ordering guardrail (no implicit re-builds): Phase 3 must structure the pipeline so all elevation-affecting terrain/feature writes occur before `build-elevation`. After `effect:map.elevationBuilt`, steps must not perform terrain edits that would require re-running `buildElevation()` to remain correct.

Non-negotiable:
- No shims. No compat layers. No “we’ll delete it later”. If the pipeline cannot be kept green without a shim, the slice design is wrong and must be redesigned.

## Required output

- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-<domain>-*.md`

## Required sections (minimum)

- Locked decisions + bans (and how each becomes a guardrail)
  - Include “no hidden multipliers/constants/defaults” as an explicit ban with enforcement: where constants live, how they are named, and which tests/docs lock the semantics.
  - Include “no placeholders / dead bags” as an explicit ban with enforcement: how you’ll prevent placeholders from being merged and how you’ll prove dead bags are removed.
- Narrative overlay removal + replacement plan (required)
  - State explicitly that story/narrative/overlay surfaces are being deleted (not preserved).
  - Identify any load-bearing overlay/story surfaces in current consumers and name the canonical domain-anchored replacement contracts (and the slice that performs the migration).
- Config semantics (link to the Phase 2 table; include default vs explicit policy, missing/empty/null interpretation rules, and determinism expectations for any probabilistic knobs)
  - Restate the locked **knobs + advanced config composition contract** in the issue doc (do not assume reviewers remember it):
    - Advanced config is the typed/defaulted baseline.
    - Knobs apply **after** as deterministic transforms over that baseline (“knobs last”).
    - Ban “presence”/“compare-to-default” gating and any “fill missing” precedence system.
- Determinism boundary policy (seed-only across boundaries; no RNG objects/functions crossing op boundaries)
- Stable fix anchors (preferred “config → normalized internal form” / boundary locations where implementation fixes should land to survive later slices)
- Stage ids + braid/interleaving constraints (locked contract; required)
  - Treat stage ids as author-facing contracts: once published, stage ids must be stable unless you are explicitly migrating consumers and references.
  - If pipeline braiding/interleaving constrains stage count or ordering, document those constraints explicitly (what forces the boundary, what must run before/after, and which domains/consumers are affected).
  - Stage naming must be semantic and unambiguous. Avoid generic labels like “pre/core/post” that do not communicate the causal work owned by the stage.
- Step decomposition plan (causality spine → step boundaries → artifacts/buffers)
- Conceptual decomposition vs pipeline boundary count (locked note; required)
  - Record the full causality spine decomposition (conceptual model layers) separately from the chosen pipeline boundary count.
  - Identify which splits are promoted to pipeline boundaries (interop/hooks/contracts/observability) vs which are internal clarity splits (internal-only decomposition).
  - For any intentional collapses/expansions (spine ↔ boundaries mismatch), record why the benefits outweigh the costs (or vice versa).
  - Include a sprawl risk check: config/artifact proliferation, shared-config threading, and boundary-breaking imports/exports.
- Consumer inventory + migration matrix (break/fix by slice)
  - Migration must be contract-driven: consumers move to the canonical domain-anchored contracts (not to story/narrative/overlay shims).
- Public surface vs internal-only posture (required)
  - Restate the public surface ledger from Phase 2 (which contracts/artifacts downstream should consume).
  - For any consumer currently using internal-only intermediates, assign a plan: promote explicitly (schema/docs/tests + migration) or migrate the consumer to an existing public artifact.
- Slice list with deliverables
- Contract deltas per slice
- Acceptance + verification gates per slice
- Migration checklist per slice
- Cleanup ownership + triage links
  - Include an explicit removal ledger (required): every legacy entrypoint/export/helper/temp bag/dead surface that will be removed, which slice removes it, and what the verification proof is (tests/guardrails/search).
  - If a legacy surface cannot be removed in this refactor, it MUST become a concrete tracking item (issue/sub-issue) with owner + trigger, and it MUST be linked here. (Placeholders/dead bags are not deferrable.)
- Sequencing refinement note (how the slice order was re-checked for pipeline safety)
- Documentation pass plan (dedicated slice or issue)

## Sequencing refinement pass (required; single pass)

1. Draft the slice list from Phase 2 pipeline deltas.
2. Re-order for pipeline safety (every slice ends green).
3. Re-check downstream deltas and compat ownership against the new order.
4. Lock and record the rationale.

Example sequencing refinement note (illustrative only):

Drafted slices from Phase 2 pipeline deltas as A) contract surface updates, B) op/step migrations, C) downstream consumer adjustments, D) legacy removals.

After re-ordering for pipeline safety, downstream consumer updates moved earlier so no slice leaves a contract mismatch. Final order is A) update stage-owned contracts + artifacts, B) update downstream consumers to the new contracts, C) migrate domain ops/steps, D) remove legacy paths and confirm guardrails.

Re-checked downstream deltas against the new order and verified each slice ends green. No model changes introduced; no shims/compat layers were introduced.

## Slice plan requirements (per slice)

- Stage(s) touched (ids + purpose + contract changes + migration notes)
- Step(s) included (ids + file paths)
- Narrative overlay removal (required when applicable)
  - If the slice touches any story/narrative/overlay surface or consumer, include explicit deletions and consumer migrations to canonical domain-anchored contracts.
- Public surface impact (required when changing outputs)
  - If the slice changes/introduces a downstream-consumable output, classify it explicitly as public surface vs internal-only.
  - For public surface changes: include consumer migration steps and add docs/tests for the contract in the same slice.
  - Guardrail: do not “accidentally publish” internal intermediates via convenient exports; keep internal-only values unimportable across domain boundaries unless intentionally promoted.
- Boundary/split rationale (required when changing boundaries or adding fine-grained splits)
  - If the slice introduces a new step/stage boundary (or re-slices an existing boundary), state why: downstream contract/hook value, observability/debugging value, interop requirements.
  - If the slice introduces an internal clarity split (without changing the boundary count), state where it lives (internal-only) and what it clarifies.
  - Guardrail: reject splits that force awkward shared config/artifact placement, boundary-breaking imports/exports, or “grab-bag” contract surfaces.
- Ops introduced/changed (ids + kinds + module paths)
- Any semantic knobs touched (and where their semantics are locked: Phase 2 table + test names)
- If a slice touches knob behavior, include at least one concrete “knobs + advanced config compose” example case and name the test(s) that lock it:
  - knobs-only authoring (baseline schema defaults + knobs last),
  - advanced-config + knobs authoring (baseline overrides + knobs last),
  - explicitly set-to-default edge case (a config value equal to its default still composes correctly; no compare-to-default gating).
- No hidden multipliers/constants/defaults (required when touching normalize/knobs/run)
  - Any behavior-shaping multiplier/threshold/curve parameter MUST be either config/knobs or a named internal constant.
  - Forbidden: introducing or retaining unnamed numeric literals that encode semantics (e.g., `x * 0.7`, `if (x > 0.15)`) inside compile/normalize/run paths.
  - Required: name constants, state intent in docs/JSDoc/schema descriptions where the value affects semantics, and ensure tests cover the normalized/compiled behavior.
- No placeholders / dead bags (required in every slice)
  - The slice must not introduce or leave behind empty directories, placeholder modules, empty config bags, or unused “future scaffolding”.
  - Do not introduce temporary shims/adapters to keep the pipeline green. Redesign the slice to migrate and delete instead.
- Legacy entrypoints to delete (file paths / exports)
- Tests to add/update (op contract test + thin integration edge)
- Guardrail tests (string/surface checks or contract-guard tests for forbidden surfaces)
- Guardrail scope (`REFRACTOR_DOMAINS=...`)
- Pipeline deltas included (upstream/downstream contracts updated in that slice)
- Documentation scope (what schemas/functions/ops/steps/stages/contracts are documented in this slice)
- Locked decision guardrails added in this slice (test/scan)

## Documentation pass requirements (dedicated slice or issue)

- Inventory all touched/created schemas, functions, ops, steps, stages, and contracts.
- Add/expand JSDoc for functions/ops/steps with behavior, defaults, modes, and downstream effects.
- Add/expand schema `description` metadata with the same behavioral context and expectations.
- Confirm documentation reflects any downstream changes implied by the model.

## Gate checklist (Phase 3 completion)

- Slice plan is written and reviewable.
- Every planned slice can end in a working state (no “we’ll delete later”).
- Any pipeline delta from Phase 2 is fully assigned to slices.
- No model changes appear in the issue doc (modeling lives in Phase 2).
- No compat surfaces remain anywhere in-scope; do not introduce deprecated shims as a refactor technique.
- Stage ids are treated as author contracts: stage id changes (if any) have explicit migration steps, and stage naming is semantic (avoid ambiguous “pre/core/post” labels).
- Any pipeline braiding/interleaving constraints are documented (why stages exist, ordering constraints, and downstream impact).
- Sequencing refinement pass is documented and reflects the final order.
- Documentation pass is present and scoped with inventory + JSDoc/schema updates.
- Locked decisions/bans are test-backed in the same slice they are introduced.
- No hidden multipliers/constants/defaults are explicitly banned in the plan and have an enforcement posture (named constants vs config/knobs + docs/tests where semantics are affected).
- No placeholders / dead bags are allowed by the plan: the issue explicitly lists everything that will be removed, and it does not contain “future scaffolding” or empty bags/directories as planned artifacts.
- Public surface vs internal-only posture is enforced: downstream consumers are assigned to public contracts (no internal-only imports), and any promotions are explicit with docs/tests + migration steps.
- Config semantics are referenced (Phase 2 table) and any semantic knob touched by the plan has a test that locks its non-trivial behavior.
- Knobs + advanced config composition is explicitly restated as a locked contract (“knobs last”) and the plan names tests that cover the explicitly-set-to-default edge case.
- Story/narrative/overlay surfaces are deleted/replaced as part of the plan, and any load-bearing consumers are migrated to canonical domain-anchored contracts.
- Step decomposition plan exists (spine → steps → artifacts/buffers).
- Conceptual decomposition vs pipeline boundary count is explicitly recorded (spine vs boundaries vs internal clarity splits; sprawl/coupling risks are addressed).
- Consumer inventory + migration matrix exists and assigns changes per slice.

## References

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
