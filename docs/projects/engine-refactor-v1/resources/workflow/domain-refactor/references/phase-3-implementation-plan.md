# Phase 3 Implementation Plan (Template)

## Purpose

Convert the spikes into an executable slice plan and a single source-of-truth issue doc.

## Scope guardrails

- This is slice planning only. Do not change the model here.
- Every slice must end in a pipeline-green state (no dual paths).
- The refactored domain must not retain compat surfaces; downstream adjustments are part of the plan.
- Do not preserve story/narrative/overlay surfaces in the refactor: replace any load-bearing ones with canonical, domain-anchored contracts and migrate consumers to those.
- Hard ban: no hidden multipliers/constants/defaults. Do not plan for (or accept) unnamed behavior-shaping numeric values in compile/normalize/run paths. Any multiplier/threshold/curve parameter MUST be either config/knobs or a named internal constant with explicit intent.
- Hard ban: no placeholders / dead bags. Do not plan for (or accept) empty directories, placeholder modules, empty config bags, or “future scaffolding” surviving any slice. If something is not used, it must not exist.
- No “later” buckets. Every slice is explicit with deliverables and a branch/subissue plan.
- Locked decisions must be test-backed in the same slice they are introduced.

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
  - Include an explicit removal ledger (required): every shim/compat adapter/temp bag/legacy entrypoint that will be removed, which slice removes it, and what the verification proof is (tests/guardrails/search).
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

Re-checked downstream deltas against the new order and verified each slice ends green. No model changes introduced; any transitional shims live downstream and are explicitly marked deprecated.

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
  - If the slice introduces a temporary shim/adapter to keep the pipeline green, it MUST also include the plan to remove it (same slice when feasible; otherwise a later slice in this plan). It must not be left implicit.
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
- No compat surfaces remain in the refactored domain; any deprecated shims live in downstream domains and are explicitly marked.
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
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/subflows/IMPLEMENTATION.md`
