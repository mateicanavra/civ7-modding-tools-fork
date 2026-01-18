---
name: domain-refactor-operation-modules
description: |
  Entry point workflow for refactoring one MapGen domain to the canonical
  contract-first ops + orchestration-only steps architecture, grounded in
  authoritative, earth-physics-informed domain modeling.
---

# WORKFLOW: Vertical Domain Refactor (Operation Modules)

This is the **canonical, end-to-end workflow** for refactoring **one MapGen domain** so it conforms to:
- the target **contract-first ops + orchestration-only steps** architecture, and
- a **physically grounded, first-principles domain model** (earth-physics-informed; legacy behavior is not sacred).

This workflow is **orchestration and gating only**. Greenfield pre-work happens before current-state mapping and target-state modeling, modeling lives in Phase 2 spikes, and slice planning lives in Phase 3 issues.

## TL;DR (phase model)

Phases are **adaptive**: each phase produces concrete artifacts, then a required lookback updates the next phase’s plan based on what you learned.

1. **Phase 0: Setup** → worktree + baseline gates
2. **Phase 0.5: Greenfield pre-work spike** → `spike-<domain>-greenfield.md`
3. **Lookback 0.5** → append to Phase 0.5 spike
4. **Phase 1: Current-state spike** → `spike-<domain>-current-state.md`
5. **Lookback 1** → append to Phase 1 spike
6. **Phase 2: Modeling spike** → `spike-<domain>-modeling.md`
7. **Lookback 2** → append to Phase 2 spike
8. **Phase 3: Implementation plan + slice plan** → `LOCAL-TBD-<milestone>-<domain>-*.md`
9. **Lookback 3** → append to Phase 3 issue
10. **Phase 4: Implementation (slices)**
11. **Lookback 4** → append to Phase 3 issue
12. **Phase 5: Verification + cleanup + submit**

## Subject‑matter workflow + synthesis protocol (recommended)

When running a domain refactor with multiple draft variants per phase (e.g., multiple agents), use the synthesis protocol:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/WORKFLOW-SUBJECT-MATTER.md`

Recommended posture: treat the per‑domain package directory as the place reviewers go to understand the refactor end‑to‑end:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/<domain>/`

## Required artifacts (by phase)

| Phase | Required artifact | Template / Reference |
| --- | --- | --- |
| Phase 0.5 | `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-greenfield.md` | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md` |
| Phase 1 | `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-current-state.md` | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-1-current-state.md` |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-modeling.md` | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-2-modeling.md` |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-<domain>-*.md` | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md` |

## Domain resource directory (recommended for larger artifacts)

If any of the “living artifacts” become large, split them into standalone docs and link from the spikes/issues.

Recommended location:
- `docs/projects/engine-refactor-v1/resources/domains/<domain>/`

Recommended “outside view” doc set (create only what you need; keep it small):
- `docs/projects/engine-refactor-v1/resources/domains/<domain>/INDEX.md` (optional; links + navigation)
- `docs/projects/engine-refactor-v1/resources/domains/<domain>/inventory.md` (Domain Surface Inventory)
- `docs/projects/engine-refactor-v1/resources/domains/<domain>/contract-matrix.md` (Contract Matrix)
- `docs/projects/engine-refactor-v1/resources/domains/<domain>/decisions.md` (Decisions + Defaults)
- `docs/projects/engine-refactor-v1/resources/domains/<domain>/risks.md` (Risk Register)
- `docs/projects/engine-refactor-v1/resources/domains/<domain>/golden-path.md` (Golden Path Example)

## Hard rules (do not violate)

### Architecture rules

- **Contract-first:** All domain logic is behind op contracts (`mods/mod-swooper-maps/src/domain/<domain>/ops/**`).
- **No op composition:** Ops are atomic; ops must not call other ops (composition happens in steps/stages).
- **Steps are orchestration:** step modules must not import op implementations; they call injected ops in `run(ctx, config, ops, deps)`.
- **Single-path deps access:** step runtime must not reach into alternate dependency paths (no `ctx.deps`); dependencies are accessed via the `deps` parameter only.
- **Artifacts are stage-owned (contracts) and contract-first:** each stage defines artifact contracts in `mods/mod-swooper-maps/src/recipes/standard/stages/<stage>/artifacts.ts`; step contracts declare `artifacts.requires` / `artifacts.provides` using those stage-owned contracts.
- **Stage ids are author contracts:** stage ids must be stable once published unless you are explicitly migrating consumers and references. Choose semantic stage names/ids; avoid generic labels like “pre/core/post.” If pipeline braiding/interleaving constrains stage count or ordering, document the constraints and downstream impact in Phase 3 planning.
- **No ad-hoc artifact imports in steps:** step implementations read/publish artifacts via `deps.artifacts.<artifactName>.*` (no direct imports from recipe-level `artifacts.*`, and no direct `ctx.artifacts` access in normal authoring).
- **Buffers are not artifacts (conceptual rule):** buffers are mutable, shared working layers (e.g., heightfield/elevation, climate field, routing indices) that multiple steps/stages refine over time.
  - **Today (intentional compromise):** some buffers are still routed through artifact contracts for gating/typing; publish the buffer artifact **once**, then mutate the underlying buffer in place (do **not** re-publish).
  - **Modeling posture:** always describe buffers as buffers in domain specs and refactor plans; treat any artifact wrapping as a temporary wiring strategy, not as a domain-model truth statement.
- **Narrative overlays are forbidden (this refactor phase):** treat “stories”, “narratives”, and “overlays” as legacy-only concepts and remove them as dependencies/surfaces.
  - If a narrative overlay/story artifact is load-bearing today, replace it with a canonical, domain-anchored representation (artifact/buffer/field) and migrate consumers to that contract.
  - Do not add “non-load-bearing” overlays: they create implicit dependencies and consumer confusion. Narrative/overlay systems can be re-introduced later on top of clean, canonical domain cores.
- **Compile-time normalization:** defaults + `step.normalize` + `op.normalize`; runtime does not “fix up” config.
- **Import discipline:** step `contract.ts` imports only `@mapgen/domain/<domain>` + stage-local contracts (e.g. `../artifacts.ts`); no deep imports under `@mapgen/domain/<domain>/**`, and no `@mapgen/domain/<domain>/ops`.

### Legacy + pipeline ownership rules

- **Do not propagate legacy patterns:** do not copy legacy authoring patterns forward. Implement changes only through the canonical architecture.
- **Explicit legacy audit required:** every existing config property, rule/policy, and domain function must be inventoried and explicitly classified as model-relevant or legacy. Unclassified surfaces are a gate failure.
- **Authoritative modeling (not “code cleanup”):** prefer the physically grounded target model over preserving legacy behavior; delete/replace broken or nonsensical behavior as needed.
- **Cross-pipeline consistency is required:** when the domain model changes contracts/artifacts, update downstream steps and stage-owned artifact contracts in the same refactor so the whole pipeline stays internally consistent (no “temporary mismatch”).
- **Upstream model intake (non-root):** review the prior domain’s Phase 2 modeling spike and pipeline delta list, then explicitly document which authoritative inputs this domain will adopt and which legacy inputs will be deleted. Also review any upstream refactor changes that touched this domain (compat shims, temporary adapters, legacy pathways) and explicitly plan their removal.
- **Downstream model intake (non-leaf):** review downstream domain docs and current consumer callsites, then explicitly document which downstream consumers must change to honor the authoritative model.
- **No upstream compat surfaces:** the domain being refactored must not publish legacy compat or projection surfaces. If downstream needs transitional compatibility, it must be implemented in the downstream domain with explicit `DEPRECATED` / `DEPRECATE ME` markers. Upstream refactors must update downstream consumers in the same change.
- **Compat cleanup ownership:** if any downstream deprecated compat surfaces remain, create a cleanup item in `docs/projects/engine-refactor-v1/triage.md`. If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns the cleanup and must have a dedicated issue; link it from triage.

### Documentation rules

- **Docs-as-code is enforced:** any touched exported function/op/step/schema gets contextual JSDoc and/or TypeBox `description` updates (trace references before writing docs).
- **Documentation pass is mandatory:** Phase 3 must include a dedicated documentation pass (slice or issue) that inventories every touched/created schema, function, op, step, stage, and contract, and updates JSDoc + schema descriptions with behavior, defaults, modes, and downstream impacts.

### Implementation drift guardrails (locked decisions)

- **Ops stay pure; steps own runtime binding.** Runtime/adapter concerns do not cross the op boundary.
- **Trace is step-scoped by default.** Op-level trace requires explicit contract changes or step-wrapping.
- **RNG crosses boundaries as data (seed), never callbacks/functions.** Steps derive seeds; ops build local RNGs.
- **Defaults live in schemas; derived values live in normalize.** Avoid hidden runtime defaults or fallbacks.
- **Do not snapshot/freeze at publish boundaries.** Enforce write-once + readonly-by-type instead.
- **Derived knobs are not user-authored.** Expose semantic knobs; derive internal metrics in normalize.
- **Avoid monolithic steps.** Step boundaries are the architecture; do not collapse stages into a mega-step.
- **No silent compat.** Delete, or push compat downstream with explicit deprecation and a removal trigger.
- **Schemas are the single source of truth.** Derive types from schemas; do not duplicate shapes manually.
- **Entry layers do not rewrite domain policy.** Runtime entry supplies facts; domain owns policy knobs and invariants.

## Principles (authoritative surfaces)

Domains own their surfaces. The refactored domain must not retain legacy compat surfaces; update downstream consumers in the same refactor. If a downstream domain needs a transitional shim, it owns it and marks it as deprecated. Projections are presentation-only and must never shape the internal representation.

Config ownership is local and narrow. Op contracts must define op-owned strategy schemas; do not reuse a domain-wide config bag inside op contracts. If an external preset bag must be preserved temporarily, map it at step normalization into per-op envelopes or migrate presets outright.

## Modeling research discipline (required passes)

Phase 2 modeling is a research sprint. Treat it like a full-time investigation, not a cursory read-through. Record evidence in the modeling spike.

- **Architecture alignment pass:** re-read the target architecture SPEC/ADR set and reconcile any conflicts (do not invent new contracts that contradict specs).
- **Authority stack pass:** list which docs are canonical vs supporting; label PRDs as non-authoritative algorithmic inputs.
- **Earth-physics pass:** model from first principles using domain + earth-physics references; if gaps exist, use external research and cite sources in the spike.
- **Pipeline pass:** review upstream authoritative inputs and downstream consumers; document adopted inputs, deleted legacy reads, and required downstream changes.
- **Model articulation pass:** produce a concise conceptual narrative plus diagrams that explain the domain as a subsystem (architecture view, data-flow, and producer/consumer map with current vs target pipeline adjustments).
- **Codebase evidence pass:** use the code-intel MCP server and repo searches to validate current surfaces, callsites, and invariants; link evidence in decisions.

## Modeling loop (required; Phase 2)

Phase 2 is iterative. Do not lock the model after a single pass. Run at least two passes unless you can justify a single-pass exception in the iteration log.

Repeat this loop until the model stabilizes:
1. **Broad pipeline sweep:** what upstream stages produce today vs should produce; what downstream consumers need today vs should need. Identify legacy shims and compat reads.
2. **Domain deep dive:** use internal specs, earth-physics research, code evidence, and external sources to refine the model.
3. **Synthesis pass:** draft the canonical model, target contracts, pipeline deltas, and diagrams.
4. **Fractal refinement:** ask if the model can be decomposed further, if any entities/boundaries should change, and if downstream consumers need alternate shapes.
   - Explicitly distinguish conceptual decomposition (the full causality spine) from pipeline boundary count (stages/steps chosen for interop/hooks/contracts and durability).
   - Promote splits to boundaries only when they provide durable downstream value; otherwise keep internal clarity splits internal to avoid sprawl and coupling.
5. **Convergence:** record changes in the iteration log and explain why the model is now stable.

## Anti-patterns (avoid; common failure modes)

- **Phase bleed:** mixing Phase 2 modeling with Phase 3 slice planning or implementation detail.
- **Missing living artifacts:** a narrative spike without the inventory/contract matrix/decisions/risks/golden path spine.
- **Model/projection confusion:** treating downstream-compat projections as canonical outputs or letting them shape the model.
- **Upstream compat retention:** leaving legacy compat or projection surfaces inside the refactored domain.
- **Decisions buried in prose:** critical choices not recorded as explicit decisions with rationale and triggers.
- **Boundary drift:** silent deep imports or `ctx.artifacts` reads that reintroduce coupling during refactor.
- **Boundary over-splitting:** creating many tiny boundaries that force config/artifact sprawl, shared-config threading, or boundary-breaking imports/exports.
- **Untracked deltas:** changing contracts without updating the contract matrix or cross-pipeline inventory.
- **Config bag reuse inside ops:** using a domain-wide config bag in op strategy schemas instead of op-owned config.
- **Silent legacy carry-through:** retaining legacy properties/rules/functions without an explicit model-relevance decision.
- **Skipping upstream intake:** continuing to consume legacy upstream surfaces without evaluating new authoritative inputs.
- **Diagramless model:** locking a model without a conceptual narrative or current/target pipeline diagrams.
- **Single-pass modeling:** locking the model without an iteration log and a refinement pass.
- **Implementation drift:** “making it work” by preserving legacy nesting, collapsing steps, smuggling runtime concerns, or adding hidden defaults.
- **Authority confusion:** treating PRDs or outdated references as canonical without an explicit authority stack.

Example anti-pattern (do not copy):
```ts
import { Type } from "@swooper/mapgen-core/authoring";
import { FoundationConfigSchema } from "../config.js";

export const ComputePlatesContract = defineOp({
  id: "foundation/compute-plates",
  kind: "compute",
  input: Type.Object({ /* ... */ }),
  output: Type.Object({ /* ... */ }),
  strategies: {
    default: Type.Partial(FoundationConfigSchema), // grab-bag config
  },
} as const);
```

Preferred posture: define a minimal op-owned schema and map any external bag at step normalization.

## Drift response protocol (when you notice drift)

If you detect drift or a locked decision gets violated, stop and do the following before continuing:

1. **Hard stop + status report:** document what changed, what is in-flight, and what is next.
2. **Rebuild the slice plan gates:** update the Phase 3 issue to insert the locked decision as a gate.
3. **Split vague slices:** replace “later” buckets with explicit subissues + per-subissue branches.
4. **Add guardrails:** add string/surface guard tests or checks so the violation cannot reappear (same slice).

## Phase gates (no phase bleed)

Phase 0.5 gate:
- Greenfield pre-work spike exists and is earth-physics-grounded (unconstrained by legacy code).
- Upstream current vs ideal lists exist and a gap/diff is written (change candidates).
- Downstream ideal outputs are described and downstream implications are listed (change candidates).

Phase 1 gate:
- Current-state spike exists and includes all “living artifacts.”
- Boundary violations and deletions are explicit.
- Legacy surface inventory exists (all config properties, rules/policies, functions; no “TBD” placeholders).
- Upstream authoritative input review is documented (if the domain is not the pipeline root).
- Upstream handoff review is documented (prior refactor changes to this domain; removal plan is explicit).
- Downstream consumer inventory is documented (current-state callsites + contract usage).

Phase 2 gate:
- Modeling spike exists and includes the canonical model + target contract matrix.
- No slice plan content is present.
- Config semantics are locked for semantic knobs: meaning, missing/empty/null behavior, and determinism expectations (with tests that lock non-trivial behavior).
- “Default vs explicit” policy is explicit for authorable config: whether missing inherits evolving defaults vs explicit freezes behavior (with compatibility intent).
- Legacy disposition ledger is complete (every property/rule/function is keep/kill/migrate with rationale).
- Upstream authoritative inputs are selected and legacy upstream reads are marked for removal.
- Upstream handoff cleanup is explicit; no upstream-introduced compat surfaces remain in this domain.
- Downstream consumer impact scan is explicit; required downstream changes are listed.
- Conceptual narrative and diagrams exist (architecture view, data-flow, producer/consumer mapping with current vs target adjustments).
- Architecture alignment note exists; conflicts are recorded and reconciled.
- Authority stack is explicit; PRDs are labeled non-authoritative.
- Research sources are cited when external research is used.
- Iteration log exists; at least two modeling passes (or a justified single-pass exception) and diagrams/pipeline delta list reflect the final pass.
- Decision points are explicit: compat vs delete, normalize vs runtime validation, trace/RNG boundary choices, derived knobs vs authored config.

Phase 3 gate:
- Implementation issue exists and includes an executable slice plan.
- No model changes appear in the issue doc.
- Stable fix anchors are identified (preferred “config → normalized internal form” / domain boundary locations for durable fixes during implementation).
- Sequencing refinement pass exists: slices are drafted, re-ordered for pipeline safety, and re-checked against downstream deltas before locking.
- Documentation pass is explicitly scoped (dedicated slice or issue) and includes a doc inventory of all touched/created surfaces.
- No “later” buckets: every slice is explicit and has a branch/subissue plan.
- Guardrails are planned: contract-guard tests or string/surface checks for forbidden surfaces.
- Locked decisions/bans are test-backed in the same slice they are introduced.
- Step decomposition plan exists (causality spine → step boundaries).
- Stage ids are treated as author contracts: stage naming is semantic (avoid ambiguous “pre/core/post”), and any braid/interleaving constraints are documented (why the stage exists, ordering constraints, and downstream impact).
- Consumer inventory + migration matrix exists (break/fix per slice).

## Phase 3 sequencing refinement (required)

Phase 3 is planning-only, but it is not single-pass. Run one explicit sequencing refinement:
1. Draft the slice list from Phase 2 deltas.
2. Re-order slices for pipeline safety (each slice ends green).
3. Re-check downstream deltas and compat ownership against the re-ordered plan.
4. Lock the plan and record the sequencing rationale.

Phase 4 gate:
- Each slice ends in a pipeline-green state (tests + guardrails + deletions complete).
- No dual-path compute persists unless an explicit deferral trigger is recorded.

Phase 5 gate:
- Full verification gates are green.
- All deferrals are explicit and tracked.

## Phase 0 setup (worktree + baseline)

Preflight (primary checkout; stop if dirty):
```bash
git status
gt ls
git worktree list
```

Sync trunk metadata without restacking:
```bash
gt sync --no-restack
```

Create a new branch:
```bash
gt create refactor-<milestone>-<domain>
```

Create and enter a worktree:
```bash
git worktree add ../wt-refactor-<milestone>-<domain> refactor-<milestone>-<domain>
cd ../wt-refactor-<milestone>-<domain>
pwd -P
```

Patch-path guard (mandatory):
- Only edit files inside the worktree path.

Install deps (only if you will run checks in this worktree):
```bash
pnpm install
```

Baseline gates (mandatory; record failures with links + rationale if environmental):
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

Commit rules (Graphite-only):
```bash
gt add -A
gt modify --commit -am "refactor(<domain>): <slice or doc summary>"
```

## Phase 0.5 greenfield pre-work (unconstrained domain sketch)

Do this **before** Phase 1 current-state mapping to avoid inheriting legacy shapes as “the model”.

Use the template:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md`

Required focus:
- Earth-physics-first domain model sketch (what the domain should own and why).
- Upstream/downstream **greenfield diff** (current available vs ideal needed; ideal outputs vs downstream enablement).

## Phase 5 verification + cleanup

Phase 5 is where we make the refactor **ruthless and pure**:
- prove the architecture invariants (no silent coupling, no dual-path compute, no hidden defaults),
- remove any remaining refactor scaffolding or legacy shadows, and
- leave a clean, reviewable stack that can merge without follow-up “cleanup PRs”.

### Phase 5 scope (hard rules)

- No Phase 2 model changes. If you discover a model problem, stop and open a modeling follow-up; do not “patch the model” opportunistically during cleanup.
- No dual-path compute. If something still depends on an old path, either migrate it now or record an explicit deferral with a trigger.
- No domain-local compatibility. Temporary compatibility lives downstream (explicit shims), not inside the refactored domain.

### Verification gates (must be green)

Run the **domain guardrails first** (fast feedback), then the full repo gates (slow feedback).

Domain guardrails (domain-scoped; mandatory):
```bash
REFRACTOR_DOMAINS="<domain>" ./scripts/lint/lint-domain-refactor-guardrails.sh
```

Repo-level check (fast-ish; catches type drift + guardrails):
```bash
pnpm check
```

Full verification gates (must be green before “done”):
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

If a gate is not runnable due to environment constraints (e.g., deploy requires Civ7), record:
- which gate failed to run,
- why it is environmental (not code-related),
- and what surrogate evidence exists (CI job, narrower check, etc.).

### Ruthlessness pass (cleanup checklist)

Do a final pass that is explicitly biased toward deletion and purity:

- Delete any now-unused legacy helpers, compat exports, and unused re-exports that bypass the op boundary.
- Confirm steps are orchestration-only:
  - no imports of op implementations,
  - no alternate dependency access paths (no `ctx.deps`),
  - no ad-hoc artifact imports in steps (read/publish via `deps.artifacts.*` only).
- Confirm ops are contract-first and atomic:
  - no op composition (ops do not call other ops),
  - no runtime callbacks/adapters/RNG crossing the op boundary,
  - normalized config only (no hidden defaulting inside `run(...)`).
- Confirm “non-canonical vs canonical” is explicit:
  - narrative overlay/story surfaces are not produced/consumed as part of this refactor phase (any remaining ones are planned for deletion and have consumer migrations),
  - any engine/adapter outputs consumed for compatibility are labeled as projections,
  - canonical truth is owned by the domain model and published as typed artifacts/buffers,
  - any unavoidable projection-only posture has an explicit removal trigger in `docs/projects/engine-refactor-v1/deferrals.md`.

### Traceability (required)

- Update the Phase 3 issue’s **Lookback 4** section (plan vs actual; why; what changed).
- Ensure deferrals and triggers are recorded (only true deferrals; no “unfinished planned work”).
- Ensure cross-cutting decisions are captured in `docs/projects/engine-refactor-v1/triage.md` when they affect other domains.

Submit:
```bash
gt ss --draft
```

Worktree cleanup (after the stack is merged):
```bash
git worktree list
```

Remove only the worktrees you created for this refactor.

## Decision logging

- Domain-local: append to the domain’s local issue doc under `## Implementation Decisions` (`docs/projects/engine-refactor-v1/issues/**`).
- Cross-cutting: `docs/projects/engine-refactor-v1/triage.md`.

## Golden reference (Ecology exemplar)

- Domain contract entrypoint: `mods/mod-swooper-maps/src/domain/ecology/index.ts`
- Op contracts router: `mods/mod-swooper-maps/src/domain/ecology/ops/contracts.ts`
- Op implementations router: `mods/mod-swooper-maps/src/domain/ecology/ops/index.ts`
- Stage-owned artifact contracts: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/artifacts.ts`
- Representative step contract: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`

## Reference index

Read once before Phase 0.5:
- `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/DX-ARTIFACTS-PROPOSAL.md`
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U21-artifacts-step-owned-deps.md`

Consult while modeling (Phase 2):
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-global-invariants.md`
- `docs/projects/engine-refactor-v1/triage.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/morphology.md`
- `docs/system/libs/mapgen/hydrology.md`
- `docs/system/libs/mapgen/ecology.md`
- `docs/system/libs/mapgen/narrative.md`
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md` (Foundation seed; not authoritative for contracts)
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md`

Truth of behavior (consult as needed while implementing):
- `packages/mapgen-core/src/compiler/recipe-compile.ts`
- `packages/mapgen-core/src/compiler/normalize.ts`
- `packages/mapgen-core/src/authoring/recipe.ts`
- `packages/mapgen-core/src/authoring/step/contract.ts`
- `packages/mapgen-core/src/authoring/op/contract.ts`
- `packages/mapgen-core/src/authoring/op/create.ts`
- `packages/mapgen-core/src/authoring/op/strategy.ts`
- `packages/mapgen-core/src/authoring/bindings.ts`
- `packages/mapgen-core/src/authoring/artifact/contract.ts`
- `packages/mapgen-core/src/authoring/artifact/runtime.ts`
- `mods/mod-swooper-maps/test/support/compiler-helpers.ts`

Workflow package references:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/structure-and-module-shape.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-1-current-state.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-2-modeling.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-reference.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`

Prior art / sequencing helpers:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md`
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-refactor-sequencing.md`
- Domain plan drafts:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/FOUNDATION.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/MORPHOLOGY.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/HYDROLOGY.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/ECOLOGY.md`
- Standard recipe stage order: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
