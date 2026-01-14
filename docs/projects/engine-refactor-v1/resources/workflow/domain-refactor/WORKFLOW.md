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

This workflow is **orchestration and gating only**. Modeling lives in Phase 2 spikes. Slice planning lives in Phase 3 issues.

## TL;DR (phase model)

Phases are **adaptive**: each phase produces concrete artifacts, then a required lookback updates the next phase’s plan based on what you learned.

1. **Phase 0: Setup** → worktree + baseline gates
2. **Phase 1: Current-state spike** → `spike-<domain>-current-state.md`
3. **Lookback 1** → append to Phase 1 spike
4. **Phase 2: Modeling spike** → `spike-<domain>-modeling.md`
5. **Lookback 2** → append to Phase 2 spike
6. **Phase 3: Implementation plan + slice plan** → `LOCAL-TBD-<milestone>-<domain>-*.md`
7. **Lookback 3** → append to Phase 3 issue
8. **Phase 4: Implementation (slices)**
9. **Lookback 4** → append to Phase 3 issue
10. **Phase 5: Verification + cleanup + submit**

## Required artifacts (by phase)

| Phase | Required artifact | Template / Reference |
| --- | --- | --- |
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

- **Contract-first:** All domain logic is behind op contracts (`mods/mod-swooper-maps/src/domain/<domain>/ops/**`).
- **No op composition:** Ops are atomic; ops must not call other ops (composition happens in steps/stages).
- **Steps are orchestration:** step modules must not import op implementations; they call injected ops in `run(ctx, config, ops, deps)`.
- **Single-path deps access:** step runtime must not reach into alternate dependency paths (no `ctx.deps`); dependencies are accessed via the `deps` parameter only.
- **Artifacts are stage-owned (contracts) and contract-first:** each stage defines artifact contracts in `mods/mod-swooper-maps/src/recipes/standard/stages/<stage>/artifacts.ts`; step contracts declare `artifacts.requires` / `artifacts.provides` using those stage-owned contracts.
- **No ad-hoc artifact imports in steps:** step implementations read/publish artifacts via `deps.artifacts.<artifactName>.*` (no direct imports from recipe-level `artifacts.*`, and no direct `ctx.artifacts` access in normal authoring).
- **Buffers are not artifacts (conceptual rule):** buffers are mutable, shared working layers (e.g., heightfield/elevation, climate field, routing indices) that multiple steps/stages refine over time.
  - **Today (intentional compromise):** some buffers are still routed through artifact contracts for gating/typing; publish the buffer artifact **once**, then mutate the underlying buffer in place (do **not** re-publish).
  - **Modeling posture:** always describe buffers as buffers in domain specs and refactor plans; treat any artifact wrapping as a temporary wiring strategy, not as a domain-model truth statement.
- **Overlays are not artifacts (conceptual rule):** overlays are append-preferred, structured “stories of formation” (e.g., corridors, swatches) that downstream domains can read and act on.
  - **Canonical shape:** a single `overlays` container with per-type collections (`overlays.corridors`, `overlays.swatches`, ...). Avoid many top-level overlay artifacts.
  - **Today (intentional compromise):** overlays are routed through artifact contracts for gating/typing; publish the overlays artifact **once**, then accumulate overlays via `ctx.overlays.*` (append-preferred; mutation is rare and intentional).
- **Compile-time normalization:** defaults + `step.normalize` + `op.normalize`; runtime does not “fix up” config.
- **Import discipline:** step `contract.ts` imports only `@mapgen/domain/<domain>` + stage-local contracts (e.g. `../artifacts.ts`); no deep imports under `@mapgen/domain/<domain>/**`, and no `@mapgen/domain/<domain>/ops`.
- **Do not propagate legacy patterns:** do not copy legacy authoring patterns forward. Implement changes only through the canonical architecture.
- **Explicit legacy audit required:** every existing config property, rule/policy, and domain function must be inventoried and explicitly classified as model-relevant or legacy. Unclassified surfaces are a gate failure.
- **Docs-as-code is enforced:** any touched exported function/op/step/schema gets contextual JSDoc and/or TypeBox `description` updates (trace references before writing docs).
- **Authoritative modeling (not “code cleanup”):** prefer the physically grounded target model over preserving legacy behavior; delete/replace broken or nonsensical behavior as needed.
- **Cross-pipeline consistency is required:** when the domain model changes contracts/artifacts, update downstream steps and stage-owned artifact contracts in the same refactor so the whole pipeline stays internally consistent (no “temporary mismatch”).
- **Upstream model intake (non-root):** review the prior domain’s Phase 2 modeling spike and pipeline delta list, then explicitly document which authoritative inputs this domain will adopt and which legacy inputs will be deleted. Also review any upstream refactor changes that touched this domain (compat shims, temporary adapters, legacy pathways) and explicitly plan their removal.
- **Downstream model intake (non-leaf):** review downstream domain docs and current consumer callsites, then explicitly document which downstream consumers must change to honor the authoritative model.
- **No upstream compat surfaces:** the domain being refactored must not publish legacy compat or projection surfaces. If downstream needs transitional compatibility, it must be implemented in the downstream domain with explicit `DEPRECATED` / `DEPRECATE ME` markers. Upstream refactors must update downstream consumers in the same change.
- **Compat cleanup ownership:** if any downstream deprecated compat surfaces remain, create a cleanup item in `docs/projects/engine-refactor-v1/triage.md`. If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns the cleanup and must have a dedicated issue; link it from triage.

## Principles (authoritative surfaces)

Domains own their surfaces. The refactored domain must not retain legacy compat surfaces; update downstream consumers in the same refactor. If a downstream domain needs a transitional shim, it owns it and marks it as deprecated. Projections are presentation-only and must never shape the internal representation.

Config ownership is local and narrow. Op contracts must define op-owned strategy schemas; do not reuse a domain-wide config bag inside op contracts. If an external preset bag must be preserved temporarily, map it at step normalization into per-op envelopes or migrate presets outright.

## Modeling research discipline (required passes)

Phase 2 modeling is a research sprint. Treat it like a full-time investigation, not a cursory read-through. Record evidence in the modeling spike.

- **Architecture alignment pass:** re-read the target architecture SPEC/ADR set and reconcile any conflicts (do not invent new contracts that contradict specs).
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
4. **Fractal refinement:** ask if the model can be decomposed further, if any entities/boundaries should change, and if downstream consumers need alternate shapes. Update the model and diagrams.
5. **Convergence:** record changes in the iteration log and explain why the model is now stable.

## Anti-patterns (avoid; common failure modes)

- **Phase bleed:** mixing Phase 2 modeling with Phase 3 slice planning or implementation detail.
- **Missing living artifacts:** a narrative spike without the inventory/contract matrix/decisions/risks/golden path spine.
- **Model/projection confusion:** treating downstream-compat projections as canonical outputs or letting them shape the model.
- **Upstream compat retention:** leaving legacy compat or projection surfaces inside the refactored domain.
- **Decisions buried in prose:** critical choices not recorded as explicit decisions with rationale and triggers.
- **Boundary drift:** silent deep imports or `ctx.artifacts` reads that reintroduce coupling during refactor.
- **Untracked deltas:** changing contracts without updating the contract matrix or cross-pipeline inventory.
- **Config bag reuse inside ops:** using a domain-wide config bag in op strategy schemas instead of op-owned config.
- **Silent legacy carry-through:** retaining legacy properties/rules/functions without an explicit model-relevance decision.
- **Skipping upstream intake:** continuing to consume legacy upstream surfaces without evaluating new authoritative inputs.
- **Diagramless model:** locking a model without a conceptual narrative or current/target pipeline diagrams.
- **Single-pass modeling:** locking the model without an iteration log and a refinement pass.

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

## Phase gates (no phase bleed)

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
- Legacy disposition ledger is complete (every property/rule/function is keep/kill/migrate with rationale).
- Upstream authoritative inputs are selected and legacy upstream reads are marked for removal.
- Upstream handoff cleanup is explicit; no upstream-introduced compat surfaces remain in this domain.
- Downstream consumer impact scan is explicit; required downstream changes are listed.
- Conceptual narrative and diagrams exist (architecture view, data-flow, producer/consumer mapping with current vs target adjustments).
- Architecture alignment note exists; conflicts are recorded and reconciled.
- Research sources are cited when external research is used.
- Iteration log exists; at least two modeling passes (or a justified single-pass exception) and diagrams/pipeline delta list reflect the final pass.

Phase 3 gate:
- Implementation issue exists and includes an executable slice plan.
- No model changes appear in the issue doc.

Phase 4 gate:
- Each slice ends in a pipeline-green state (tests + guardrails + deletions complete).

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

## Phase 5 verification + cleanup

Verification gates (must be green):
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

Submit:
```bash
gt ss --draft
```

Worktree cleanup (after submission):
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

Read once before Phase 1:
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
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-1-current-state.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-2-modeling.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-reference.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/subflows/IMPLEMENTATION.md`

Prior art / sequencing helpers:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md`
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-refactor-sequencing.md`
- Domain plan drafts:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/FOUNDATION.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/MORPHOLOGY.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/HYDROLOGY.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/ECOLOGY.md`
- Standard recipe stage order: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
