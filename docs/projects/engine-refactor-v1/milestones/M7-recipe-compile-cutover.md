---
id: M7
title: "M7: Recipe Compile Cutover (composition-first compiler)"
status: planned
project: engine-refactor-v1
---

# M7: Recipe Compile Cutover (composition-first compiler)

Effort estimate (complexity × parallelism): medium-high complexity, medium parallelism.

Note: some M7 work already landed ad hoc and is not captured in this doc.

```yaml
prior_ad_hoc_work_note:
  review: docs/projects/engine-refactor-v1/reviews/REVIEW-M7.md
  local_issue_docs_glob: docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M7-*
  note: "This milestone doc does not attempt to reconcile that history; it focuses on the remaining path to the target state."
```

<!-- Path roots -->
ENGINE_REFACTOR = docs/projects/engine-refactor-v1
SPEC = docs/projects/engine-refactor-v1/resources/spec/recipe-compile
MAPGEN_CORE = packages/mapgen-core
SWOOPER_MAPS = mods/mod-swooper-maps

---

## Part I: Scope & Purpose

### Summary

Land the composition-first recipe compiler architecture as the single, canonical config path:

```yaml
summary:
  - "Stage config becomes a single author-facing surface (`knobs` + either public fields or internal step keys), compiled into internal step-id keyed configs."
  - "Config defaulting/cleaning/canonicalization moves fully into compilation."
  - "Engine planning and execution become validate-only with respect to configs (no normalization hooks, no runtime defaulting/cleaning)."
  - "Ecology becomes the canonical exemplar domain and stage family for the new authoring + compilation model."
```

### Inputs (target spec)

```yaml
spec_package:
  root: docs/projects/engine-refactor-v1/resources/spec/recipe-compile
  architecture:
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/01-config-model.md
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/02-compilation.md
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md
  ts_surfaces:
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/env.ts
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/ops.ts
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/steps.ts
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/stages.ts
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/recipes.ts
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/compiler.ts
  examples:
    - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/examples/EXAMPLES.md
```

Spec status note:
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md` currently records **no remaining open questions**; previously ambiguous O1/O2/O3 are explicitly marked closed with baseline code anchors.

### Off-limits references (non-target MapGen architecture/spec docs)

Do not consult any MapGen/MapGen-core "architecture/spec" docs outside `spec_package`. They are non-target for this milestone and will cause confusion (they diverge from the locked-in composition-first recipe compiler spec).

```yaml
non_target_arch_docs_off_limits:
  rule: "Do not consult these for M7 implementation work; use spec_package + baseline code only."
  categories:
    - id: system_mapgen_library_docs
      note: "System-level MapGen docs (not the recipe-compile target spec)."
      paths:
        - docs/system/libs/mapgen/architecture.md
        - docs/system/libs/mapgen/ecology.md
        - docs/system/libs/mapgen/foundation.md
        - docs/system/libs/mapgen/hydrology.md
        - docs/system/libs/mapgen/morphology.md
        - docs/system/libs/mapgen/narrative.md
        - docs/system/libs/mapgen/adrs/index.md
        - docs/system/libs/mapgen/adrs/adr-001-era-tagged-morphology.md
        - docs/system/libs/mapgen/adrs/adr-002-typebox-format-shim.md
        - docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md
        - docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md
        - docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md
        - docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-climate-story-tldr.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-design.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-design-hotspot-trails-and-rift-valleys.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-earth-forces-and-layer-contracts.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-layer-contracts.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-margins-narrative.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-overview.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-plan-crust-first-morphology.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-plan-landmass-plates-fix.md
        - docs/system/libs/mapgen/_archive/LEGACY-mapgen-roadmap-additional-motifs.md
        - docs/system/libs/mapgen/_archive/architecture-legacy.md
        - docs/system/libs/mapgen/_archive/ecology-architecture-legacy.md
        - docs/system/libs/mapgen/_archive/foundation-architecture-legacy.md
        - docs/system/libs/mapgen/_archive/hydrology-architecture-legacy.md
        - docs/system/libs/mapgen/_archive/morphology-architecture-legacy.md
        - docs/system/libs/mapgen/_archive/narrative-architecture-legacy.md
    - id: engine_refactor_v1_non_recipe_compile_specs
      note: "Engine refactor specs/ADRs outside recipe-compile (non-target for M7)."
      paths:
        - docs/projects/engine-refactor-v1/resources/spec/SPEC.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-architecture-overview.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-core-sdk.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-packaging-and-file-structure.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-standard-content-package.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-global-invariants.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-tag-registry.md
        - docs/projects/engine-refactor-v1/resources/spec/SPEC-appendix-target-trees.md
        - docs/projects/engine-refactor-v1/resources/spec/adr/ADR.md
        - docs/projects/engine-refactor-v1/resources/spec/adr/**/*.md
    - id: other_suspect_mapgen_arch_materials
      note: "Other repo docs that can look canonical but are non-target for M7 recipe-compile implementation."
      paths:
        - docs/SYSTEM.md
        - docs/system/ARCHITECTURE.md
        - docs/slides/config-resolution-flow.outline.md
        - docs/_archive/LEGACY-mapgen-architecture-audit.md
        - docs/_archive/LEGACY-mapgen-plan-plate-generation-refactor.md
        - docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md
        - docs/projects/engine-refactor-v1/resources/PRD-*.md
        - docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md
        - docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md
        - docs/projects/engine-refactor-v1/resources/slides/**/*
        - docs/projects/engine-refactor-v1/resources/_archive/**/*
        - docs/projects/engine-refactor-v1/resources/spike/**/*
        - docs/projects/engine-refactor-v1/resources/workflow/**/*
  allowed_references_rule_of_thumb:
    - "Allowed: spec_package paths + baseline code paths listed in this doc."
    - "Allowed: issue/review docs explicitly linked by this milestone (e.g., REVIEW-M7.md, LOCAL-TBD-M7-*)."
    - "Disallowed: anything in non_target_arch_docs_off_limits.categories[*].paths."
```

### Baseline (current state)

```yaml
baseline:
  engine:
    planner:
      file: packages/mapgen-core/src/engine/execution-plan.ts
      today:
        - "defaults/cleans step configs during plan compilation"
        - "calls step.resolveConfig(...) during plan compilation"
    executor:
      file: packages/mapgen-core/src/engine/PipelineExecutor.ts
      today:
        - "PipelineExecutor.execute*/executeAsync* synthesize config via Value.Default/Convert/Clean"
        - "PipelineExecutor.executePlan*/executePlanAsync* use node.config as provided"
  authoring:
    recipe:
      file: packages/mapgen-core/src/authoring/recipe.ts
      today:
        - "createRecipe composes stages/steps and directly feeds stageId/stepId keyed config into engine RunRequest"
        - "ExtendedMapContext.settings is populated from plan settings"
    stage:
      file: packages/mapgen-core/src/authoring/stage.ts
      today:
        - "createStage validates step.schema presence only"
    step:
      files:
        - packages/mapgen-core/src/authoring/step/contract.ts
        - packages/mapgen-core/src/authoring/step/create.ts
        - packages/mapgen-core/src/authoring/types.ts
      today:
        - "defineStepContract is schema-only"
        - "createStep supports step.resolveConfig(config, settings)"
    op:
      file: packages/mapgen-core/src/authoring/op/types.ts
      today:
        - "DomainOp has resolveConfig(config, settings) compile-time hook"
  ecology:
    domain_entrypoint:
      file: mods/mod-swooper-maps/src/domain/ecology/index.ts
      today:
        - "exports ops and various types/schemas; no contracts surface or by-id registries"
    steps:
      examples:
        - mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts
        - mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts
      today:
        - "step.resolveConfig often delegates into op.resolveConfig"
        - "runtime step.run uses ecology.ops directly (no by-id binding surface)"
```

### Target state (definition of done)

```yaml
target_state:
  compilation:
    - "Compilation is the only place where schema defaulting/cleaning/canonicalization occurs"
    - "Compiler enforces: stage surface normalization -> toInternal -> unknown-step-id errors -> per-step canonicalization"
  stage:
    - "Option A only: stage has optional public + compile; createStage computes surfaceSchema and provides toInternal"
    - "Internal-as-public stages validate surface only (step fields unknown at Phase A)"
  steps:
    - "Step ids are kebab-case"
    - "Step contracts may declare ops and derive op refs + op envelope schemas"
    - "Compiler prefills missing op envelopes before strict schema validation"
  ops:
    - "op.normalize is the renamed op.resolveConfig and dispatches by envelope.strategy"
    - "Runtime op surface is structurally stripped (no normalize/defaultConfig/strategies)"
  engine:
    - "Engine planner validates only; no default/clean/mutation; no step.resolveConfig calls"
    - "Executor consumes plans only; execute* config synthesis path removed or internal-only"
  ecology_exemplar:
    - "Ecology domain exports contracts + compileOpsById + runtimeOpsById"
    - "Ecology steps/stages follow canonical authoring patterns and compilation model"
  cleanup:
    - "No lingering legacy surfaces: resolveConfig, runtime defaulting, or dual-path compilation"
```

### Acceptance criteria

```yaml
acceptance_criteria:
  - "A recipe run has exactly one config path: compileRecipeConfig -> compileExecutionPlan (validate-only) -> executePlan"
  - "Engine code does not call any step/op normalization hook"
  - "Runtime does not default/clean configs (no Value.Default/Convert/Clean in runtime authoring/engine/steps)"
  - "Compiler produces deterministic, fully canonical internal configs (total by stage+step id)"
  - "Compiler throws explicit errors for unknown step ids returned by stage.toInternal (excluding \"knobs\")"
  - "All step ids are kebab-case and enforced at authoring time"
  - "Ecology is fully migrated and serves as the reference implementation"
  - "No compatibility shims were introduced"
```

---

## Part II: Implementation Plan (Workstreams A-F)

### DX-first framing

This milestone intentionally starts with DX improvements that do not require engine/runtime churn:

```yaml
dx_first_wins:
  - "Compiler helpers and a compileRecipeConfig entrypoint with unit tests (safe to land without wiring)"
  - "Clear, structurally enforced authoring surfaces (kebab-case ids, reserved key enforcement, Stage Option A factory)"
  - "Explicit ops registry ownership + binding helpers (reduces ad-hoc deep imports and ad-hoc wiring)"
```

```yaml
compat_policy:
  rule: "No compatibility shims."
  intent:
    - "This milestone plans to go all the way through to the target state, so it does not budget for dual APIs or transitional exported surfaces."
    - "If you feel you need a compatibility shim, treat that as a design error: re-slice the work so the repo stays runnable without adding a second architecture."
```

### Workstream Index

This milestone is organized into 6 workstreams (A-F), each with detailed issue docs. Parent issue docs act as indexes for their children. Full implementation details live in the issue docs linked below.

| Workstream | Title | Estimate | Child Issues |
|---|---|---|---|
| [A](../issues/LOCAL-TBD-M7-A-compiler-foundation.md) | Compiler foundation | high complexity, medium parallelism | [A1](../issues/LOCAL-TBD-M7-A1-compiler-module-skeleton.md), [A2](../issues/LOCAL-TBD-M7-A2-compile-recipe-config-wiring.md) |
| [B](../issues/LOCAL-TBD-M7-B-authoring-surface-upgrades.md) | Authoring surface upgrades | medium complexity, medium-high parallelism | [B1](../issues/LOCAL-TBD-M7-B1-step-id-kebab-case.md), [B2](../issues/LOCAL-TBD-M7-B2-stage-option-a.md), [B3](../issues/LOCAL-TBD-M7-B3-domain-ops-registries.md), [B4](../issues/LOCAL-TBD-M7-B4-op-normalize-semantics.md) |
| [C](../issues/LOCAL-TBD-M7-C-recipe-boundary-config-model-cutover.md) | Recipe boundary + config model cutover | high complexity, low-medium parallelism | [C1](../issues/LOCAL-TBD-M7-C1-recipe-boundary-compilation.md), [C2](../issues/LOCAL-TBD-M7-C2-stage-step-config-shape.md), [C3](../issues/LOCAL-TBD-M7-C3-remove-runtime-fallbacks.md) |
| [D](../issues/LOCAL-TBD-M7-D-engine-validate-only.md) | Engine becomes validate-only | high complexity, medium parallelism | [D1](../issues/LOCAL-TBD-M7-D1-executor-plan-only.md), [D2](../issues/LOCAL-TBD-M7-D2-planner-validate-only.md) |
| [E](../issues/LOCAL-TBD-M7-E-ecology-canonical-exemplar.md) | Ecology as canonical exemplar | high complexity, low-medium parallelism | [E1](../issues/LOCAL-TBD-M7-E1-ecology-domain-entrypoint.md), [E2](../issues/LOCAL-TBD-M7-E2-ecology-steps-migration.md), [E3](../issues/LOCAL-TBD-M7-E3-ecology-stage-public-compile.md) |
| [F](../issues/LOCAL-TBD-M7-F-cleanup-pass.md) | Cleanup pass (no legacy left) | medium complexity, high parallelism | [F1](../issues/LOCAL-TBD-M7-F1-verify-no-shims.md), [F2](../issues/LOCAL-TBD-M7-F2-final-hygiene.md) |

### Issue Index (with dependencies)

| ID | Title | blocked_by | Issue Doc | Status | Notes |
|---|---|---|---|---|---|
| A1 | Compiler module skeleton + strict normalization | [] | [LOCAL-TBD-M7-A1](../issues/LOCAL-TBD-M7-A1-compiler-module-skeleton.md) | [x] | branch `m7-t01-compiler-module-skeleton-strict-normalization` |
| A2 | compileRecipeConfig end-to-end wiring | [A1] | [LOCAL-TBD-M7-A2](../issues/LOCAL-TBD-M7-A2-compile-recipe-config-wiring.md) | [x] | branch `m7-t02-compile-recipe-config-wiring` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/396) |
| B1 | Step id convention: kebab-case enforced | [] | [LOCAL-TBD-M7-B1](../issues/LOCAL-TBD-M7-B1-step-id-kebab-case.md) | [x] | branch `m7-t03-step-id-kebab-case` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/397) |
| B2 | Stage Option A: public+compile with computed surfaceSchema | [] | [LOCAL-TBD-M7-B2](../issues/LOCAL-TBD-M7-B2-stage-option-a.md) | [x] | branch `m7-t04-stage-option-a` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/398) |
| B3 | Domain ops registries + binding helpers | [] | [LOCAL-TBD-M7-B3](../issues/LOCAL-TBD-M7-B3-domain-ops-registries.md) | [x] | branch `m7-t05-domain-ops-registries` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/399) |
| B4 | Op normalization hook semantics: resolveConfig -> normalize | [] | [LOCAL-TBD-M7-B4](../issues/LOCAL-TBD-M7-B4-op-normalize-semantics.md) | [x] | branch `m7-t06-op-normalize-semantics` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/400) |
| C1 | Introduce recipe boundary compilation | [A2, B2, B3, B4] | [LOCAL-TBD-M7-C1](../issues/LOCAL-TBD-M7-C1-recipe-boundary-compilation.md) | [x] | branch `m7-t07-recipe-boundary-compilation` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/401) |
| C2 | Update stage+step authoring to new config shape | [C1, B1, B2] | [LOCAL-TBD-M7-C2](../issues/LOCAL-TBD-M7-C2-stage-step-config-shape.md) | [x] | branch `m7-t08-stage-step-config-shape` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/402) |
| C3 | Remove runtime compilation fallbacks | [C2] | [LOCAL-TBD-M7-C3](../issues/LOCAL-TBD-M7-C3-remove-runtime-fallbacks.md) | [x] | branch `m7-t09-remove-runtime-fallbacks` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/403) |
| D1 | Executor plan-only: remove runtime config synthesis | [C3] | [LOCAL-TBD-M7-D1](../issues/LOCAL-TBD-M7-D1-executor-plan-only.md) | [x] | branch `m7-t10-executor-plan-only` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/404) |
| D2 | Planner validate-only: remove default/clean and step.resolveConfig | [C3] | [LOCAL-TBD-M7-D2](../issues/LOCAL-TBD-M7-D2-planner-validate-only.md) | [x] | branch `m7-t11-planner-validate-only` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/405) |
| E1 | Ecology domain entrypoint refactor | [B3, B4] | [LOCAL-TBD-M7-E1](../issues/LOCAL-TBD-M7-E1-ecology-domain-entrypoint.md) | [x] | branch `m7-t12-ecology-domain-entrypoint` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/406) |
| E2 | Ecology steps migration | [E1, C2] | [LOCAL-TBD-M7-E2](../issues/LOCAL-TBD-M7-E2-ecology-steps-migration.md) | [x] | branch `m7-t13-ecology-steps-migration` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/407) |
| E3 | Ecology stage public view + compile | [E2] | [LOCAL-TBD-M7-E3](../issues/LOCAL-TBD-M7-E3-ecology-stage-public-compile.md) | [x] | branch `m7-t14-ecology-stage-public-compile` (PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/408) |
| F1 | Verify no shims + remove dead paths | [A2, B4, C3, D2, E2] | [LOCAL-TBD-M7-F1](../issues/LOCAL-TBD-M7-F1-verify-no-shims.md) | [x] | branch `m7-t15-verify-no-shims` (PR: https://app.graphite.dev/submit/mateicanavra/civ7-modding-tools-fork/409) |
| F2 | Final hygiene + enforcement tightening | [F1] | [LOCAL-TBD-M7-F2](../issues/LOCAL-TBD-M7-F2-final-hygiene.md) | [ ] | |

### Workstream Summaries

#### A) Compiler foundation (A1-A2)

Make the compiler pipeline a repo-real module with tests before any consuming code is rewritten. Phase ordering and helper behavior are pinned by the target spec (`02-compilation.md`) and mirrored by the spec's TypeScript reference implementation (`architecture/ts/compiler.ts`).

See: [LOCAL-TBD-M7-A](../issues/LOCAL-TBD-M7-A-compiler-foundation.md)

#### B) Authoring surface upgrades (B1-B4)

Upgrade the public authoring surface so the target architecture can be adopted without ad-hoc conventions. This includes kebab-case step IDs, Stage Option A (public+compile with computed surfaceSchema), domain ops registries, and renaming resolveConfig to normalize.

See: [LOCAL-TBD-M7-B](../issues/LOCAL-TBD-M7-B-authoring-surface-upgrades.md)

#### C) Recipe boundary + config model cutover (C1-C3)

Land compilation at the recipe boundary first, then migrate stages incrementally, then remove the bypass. This is where compilation becomes mandatory for any real runtime callsite.

See: [LOCAL-TBD-M7-C](../issues/LOCAL-TBD-M7-C-recipe-boundary-config-model-cutover.md)

#### D) Engine becomes validate-only (D1-D2)

Deferred until after compilation is mandatory at the recipe boundary. The engine then becomes a pure consumer of canonical configs with no defaulting, cleaning, or normalization.

See: [LOCAL-TBD-M7-D](../issues/LOCAL-TBD-M7-D-engine-validate-only.md)

#### E) Ecology as canonical exemplar (E1-E3)

Ecology is the reference implementation for domain exports, ops registries, step authoring patterns, and (optionally) a stage public view. This refactor is intentionally late so ecology can be migrated cleanly without introducing a second architecture.

See: [LOCAL-TBD-M7-E](../issues/LOCAL-TBD-M7-E-ecology-canonical-exemplar.md)

#### F) Cleanup pass (F1-F2)

This milestone is complete only when there is one architecture and no lingering legacy scaffolding. Verify no shims remain, remove dead paths, and tighten enforcement.

See: [LOCAL-TBD-M7-F](../issues/LOCAL-TBD-M7-F-cleanup-pass.md)

---

## Part III: Sequencing (Slices 1-5: DX-first, risk-later)

```yaml
slices:
  - id: 1
    name: "Slice 1: A + B scaffolding (DX-first, low risk)"
    includes: [A1, A2, B1, B2, B3, B4]
    gates:
      - "Compiler entrypoint compiles a small synthetic recipe in unit tests"
      - "Authoring factories enforce kebab-case and reserved key rules"
      - "No engine behavior changes yet"

  - id: 2
    name: "Slice 2: Standard recipe + domains/steps migration (incremental, keep runnable)"
    includes: [C1, C2, C3]
    approach:
      - "Adopt compileRecipeConfig at recipe boundary, then migrate stages one by one"
      - "Treat unmigrated stages as internal-as-public surfaces (step-id keyed map); add `public`+`compile` only where it buys meaningful DX (ecology exemplar in Slice 4)"
      - "Keep engine planner/executor behavior unchanged until compilation adoption is in place"
    gates:
      - "At least one migrated stage runs end-to-end through compiler -> plan -> executePlan"
      - "No runtime resolveConfig required for migrated stages/steps"

  - id: 3
    name: "Slice 3: Engine validate-only flip (higher risk, later)"
    includes: [D1, D2]
    gates:
      - "All actively used recipes run through compiler (no bypass path)"
      - "PipelineExecutor.execute* no longer synthesizes configs"
      - "compileExecutionPlan does not mutate configs and does not call step.resolveConfig"

  - id: 4
    name: "Slice 4: Ecology exemplar + polish (late, but within milestone)"
    includes: [E1, E2, E3]
    gates:
      - "Ecology domain exports contract-only surface + registries"
      - "Ecology steps no longer deep-import domain internals from recipes"
      - "At least one ecology stage demonstrates stage public+compile end-to-end"

  - id: 5
    name: "Slice 5: Cleanup (no legacy left gate)"
    includes: [F1, F2]
    gates:
      - "No resolveConfig naming remains on authoring step/op surfaces"
      - "No runtime default/clean code path remains in executor or steps"
      - "Spec and enforcement docs match the final code reality"
```

---

## Part IV: Risks, Constraints, and Verification

### Risks

```yaml
risks:
  - id: R1
    name: "Config-path duality during transition"
    mitigation:
      - "Adopt compiler at the recipe boundary early (Slice 2) before engine validate-only flip"
      - "Do coordinated changes per slice and remove bypasses in C3 (enforce via tests)"
  - id: R2
    name: "Large churn in mods/steps when resolveConfig is removed"
    mitigation:
      - "Provide binding helpers + compiler pipeline first (Slice 1)"
      - "Migrate stages incrementally with a runnable gate after each stage"
  - id: R3
    name: "Domain entrypoint reshapes might cascade"
    mitigation:
      - "Do ecology first as exemplar (Slice 4), then apply the pattern to other domains as follow-ups"
      - "Enforce import boundaries (06-enforcement) to keep the dependency graph stable"
  - id: R4
    name: "Engine validate-only removes implicit cleaning relied on by runtime"
    mitigation:
      - "Only flip validate-only after compiler adoption is complete (Slice 3 gate)"
      - "Add targeted tests for compiled configs and engine validation behavior"
```

### Verification strategy

```yaml
verification:
  - "Compiler unit tests: normalization + prefill + op normalize dispatch + error aggregation"
  - "Golden-path runtime smoke for standard recipe (at least one migrated stage early, ecology late)"
  - "Engine validation tests: unknown keys, schema errors, unknown step id errors"
  - "Repo hygiene scans: ripgrep for resolveConfig usage and runtime Value.Default/Convert/Clean usage"
```

### Testing / Verification (commands)

- `pnpm -C packages/mapgen-core check`
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm check`
- `pnpm lint`
- `pnpm test`

---

## Part V: Notes

### Where migration ordering lives (spec)

```yaml
migration_ordering_source:
  file: docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md
```
