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

Do not consult any MapGen/MapGen-core “architecture/spec” docs outside `spec_package`. They are non-target for this milestone and will cause confusion (they diverge from the locked-in composition-first recipe compiler spec).

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

## Part II: Implementation Plan (Workstreams A–F)

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

### Workstreams (hierarchy and estimates)

```yaml
workstreams:
  - id: A
    name: Compiler foundation
    estimate: { complexity: high, parallelism: medium }
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    units:
      - id: A1
        name: "Compiler module skeleton + strict normalization"
        goal: "Make the compiler pipeline implementable and testable before any engine/runtime churn."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        new_files_planned:
          - packages/mapgen-core/src/compiler/normalize.ts
          - packages/mapgen-core/src/compiler/recipe-compile.ts
        deliverables:
          - "normalizeStrict(schema, raw, path) and its error surface"
          - "prefillOpDefaults(step, rawStepConfig, path) driven by step.contract.ops"
          - "normalizeOpsTopLevel(step, stepConfig, ctx, compileOpsById, path) contract-driven"
          - "RecipeCompileError with structured CompileErrorItem[]"
        tests:
          - "unit tests for normalizeStrict unknown-key errors + Value.Errors formatting"
          - "unit tests for prefillOpDefaults default envelope installation"
          - "unit tests for normalizeOpsTopLevel missing-op errors and op.normalize dispatch"
      - id: A2
        name: "compileRecipeConfig end-to-end wiring"
        goal: "Wire Phase A + Phase B into a single entrypoint that produces CompiledRecipeConfigOf."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        pinned_behavior:
          - "Phase A validates stage surfaceSchema then stage.toInternal"
          - "Compiler rejects unknown rawSteps keys (excluding \"knobs\")"
          - "Phase B iterates steps in stage.steps array order"
          - "Step canonicalization: prefill -> strict -> step.normalize -> strict -> op normalize -> strict"
        deliverables:
          - "compileRecipeConfig({ env, recipe, config, compileOpsById })"
          - "Deterministic path/stepId/stageId attribution in CompileErrorItem"

  - id: B
    name: Authoring surface upgrades
    estimate: { complexity: medium, parallelism: medium-high }
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    units:
      - id: B1
        name: "Step id convention: kebab-case enforced"
        goal: "Make step ids unambiguous and uniform across authoring, compiler, errors, and tests."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        enforcement_points:
          - "step contract factory throws on non-kebab ids"
          - "stage factory throws if any step id is non-kebab"
        migration_note:
          - "Baseline includes camelCase ids in standard recipe stages (e.g. derivePlacementInputs, storyCorridorsPre). These must be renamed to kebab-case and all references updated."
        repo_touchpoints:
          - packages/mapgen-core/src/authoring/step/contract.ts
          - packages/mapgen-core/src/authoring/types.ts
      - id: B2
        name: "Stage Option A: public+compile with computed surfaceSchema"
        goal: "Make createStage compute surfaceSchema and provide standard toInternal wrapper."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "knobsSchema and reserved key enforcement (\"knobs\")"
          - "internal-as-public stage surface schema uses optional unknown per-step keys"
          - "public stages require compile and compile receives only non-knob portion"
        repo_touchpoints:
          - packages/mapgen-core/src/authoring/stage.ts
          - packages/mapgen-core/src/authoring/types.ts
      - id: B3
        name: "Domain ops registries + binding helpers (compile vs runtime)"
        goal: "Make opsById ownership and flow explicit and structurally enforced."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "authoring/bindings.ts: bindCompileOps + bindRuntimeOps"
          - "domain entrypoint exports compileOpsById + runtimeOpsById"
          - "compiler receives recipe-owned compileOpsById assembled by merging domain registries"
        repo_touchpoints:
          - packages/mapgen-core/src/authoring (new bindings module)
          - mods/mod-swooper-maps/src/domain/*/index.ts (ecology first; others later)
      - id: B4
        name: "Op normalization hook semantics: resolveConfig -> normalize"
        goal: "Rename op.resolveConfig to op.normalize; normalize dispatches by envelope.strategy."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "authoring op types: op.normalize(envelope, ctx) dispatches to strategy.normalize"
          - "compiler uses op.normalize (not step or engine runtime)"
        repo_touchpoints:
          - packages/mapgen-core/src/authoring/op/types.ts
          - packages/mapgen-core/src/authoring/op/create.ts (if dispatcher exists)

  - id: C
    name: Recipe boundary + config model cutover
    estimate: { complexity: high, parallelism: low-medium }
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    units:
      - id: C1
        name: "Introduce recipe boundary compilation (before engine plan compilation)"
        goal: "Make compilation mandatory at the recipe boundary with explicit compileOpsById."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "createRecipe runs compileRecipeConfig before compileExecutionPlan"
          - "createRecipe assembles compileOpsById from domains used by the recipe/stages"
          - "RecipeConfigInputOf and CompiledRecipeConfigOf reflect stage surface typing"
        repo_touchpoints:
          - packages/mapgen-core/src/authoring/recipe.ts
          - packages/mapgen-core/src/authoring/types.ts
      - id: C2
        name: "Update stage+step authoring to the new config shape"
        goal: "Make stage config a single object (`knobs` + either public fields or internal step keys), compiled to an internal step map."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "stage surface accepts knobs and either public fields or internal step keys"
          - "compiled output is stageId -> stepId -> canonical step config"
        repo_touchpoints:
          - mods/mod-swooper-maps/src/recipes/standard/stages/* (incremental)
      - id: C3
        name: "Remove runtime compilation fallbacks at the recipe boundary"
        goal: "No lingering \"compile optional\" mode or parallel config path."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "remove/forbid passing raw configs into engine plan without compilation"
          - "ensure error surfaces point to compiler errors, not engine resolveConfig failures"

  - id: D
    name: Engine becomes validate-only
    estimate: { complexity: high, parallelism: medium }
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    units:
      - id: D1
        name: "Executor plan-only: remove runtime config synthesis"
        goal: "Make PipelineExecutor consume only compiled plan configs."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "PipelineExecutor.execute/executeAsync removed or made internal-only"
          - "executePlan/executePlanAsync remain the supported entrypoints"
        repo_touchpoints:
          - packages/mapgen-core/src/engine/PipelineExecutor.ts
      - id: D2
        name: "Planner validate-only: remove default/clean and step.resolveConfig"
        goal: "Make compileExecutionPlan validate configs but never mutate or normalize."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "remove Value.Default/Convert/Clean from plan compilation path"
          - "remove step.resolveConfig calls and the corresponding error code"
          - "retain unknown-key errors and schema error reporting"
        repo_touchpoints:
          - packages/mapgen-core/src/engine/execution-plan.ts

  - id: E
    name: Ecology as canonical exemplar
    estimate: { complexity: high, parallelism: low-medium }
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    units:
      - id: E1
        name: "Ecology domain entrypoint refactor (contracts + registries)"
        goal: "Make ecology the reference domain for contracts/registries and import boundaries."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "export contracts from @mapgen/domain/ecology/contracts (contract-only)"
          - "export compileOpsById and runtimeOpsById from @mapgen/domain/ecology"
          - "avoid deep imports from steps/recipes/tests"
        repo_touchpoints:
          - mods/mod-swooper-maps/src/domain/ecology/**
      - id: E2
        name: "Ecology steps migration (compiler-first, no runtime resolveConfig)"
        goal: "Move all normalization/defaulting out of step.resolveConfig into compilation."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "steps declare ops contracts and bind runtime ops by id"
          - "step.normalize (compile-time) replaces resolveConfig patterns where needed"
          - "runtime step.run uses runtimeOpsById surface, not ecology.ops direct impls"
        repo_touchpoints:
          - mods/mod-swooper-maps/src/recipes/standard/stages/ecology/**
      - id: E3
        name: "Ecology stage public view + compile (Option A) where beneficial"
        goal: "Use ecology to demonstrate the optional stage public surface in a complete, copyable pattern."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "ecology stage defines knobsSchema and optional public schema"
          - "stage.compile maps public fields to internal step configs"
          - "compiler error examples and validation behavior exercised end-to-end"

  - id: F
    name: Cleanup pass (no legacy left)
    estimate: { complexity: medium, parallelism: high }
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    units:
      - id: F1
        name: "Verify no shims + remove dead paths"
        goal: "End the milestone with one architecture, not two."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
          - "confirm no compatibility shims were introduced"
          - "delete any now-obsolete error codes and docs"
      - id: F2
        name: "Final hygiene + enforcement tightening"
        goal: "Make drift difficult after the cutover."
        reference_disclaimer:
          - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
          - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
        deliverables:
      - "lint boundaries updated to forbid compiler-only imports from runtime paths"
      - "docs/spec references updated to match the final code reality"
      - "spot-check: no remaining resolveConfig naming or runtime Value.Default usage"
      - "rename settings -> env and move Env schema/type to core (delete legacy naming; no long-lived alias)"
```

## Canonical units of work (issue doc index)

This milestone is intended to be executed as leaf issues (one per unit below). Existing `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M7-U*` docs are prior/ad-hoc work notes unless explicitly referenced by a unit here.

```yaml
issues:
  - id: A1
    title: "Compiler module skeleton + strict normalization"
    status: planned
    blocked_by: []
  - id: A2
    title: "compileRecipeConfig end-to-end wiring"
    status: planned
    blocked_by: [A1]

  - id: B1
    title: "Step id convention: kebab-case enforced"
    status: planned
    blocked_by: []
  - id: B2
    title: "Stage Option A: public+compile with computed surfaceSchema"
    status: planned
    blocked_by: []
  - id: B3
    title: "Domain ops registries + binding helpers (compile vs runtime)"
    status: planned
    blocked_by: []
  - id: B4
    title: "Op normalization hook semantics: resolveConfig -> normalize"
    status: planned
    blocked_by: []

  - id: C1
    title: "Introduce recipe boundary compilation (before engine plan compilation)"
    status: planned
    blocked_by: [A2, B2, B3, B4]
  - id: C2
    title: "Update stage+step authoring to the new config shape"
    status: planned
    blocked_by: [C1, B1, B2]
  - id: C3
    title: "Remove runtime compilation fallbacks at the recipe boundary"
    status: planned
    blocked_by: [C2]

  - id: D1
    title: "Executor plan-only: remove runtime config synthesis"
    status: planned
    blocked_by: [C3]
  - id: D2
    title: "Planner validate-only: remove default/clean and step.resolveConfig"
    status: planned
    blocked_by: [C3]

  - id: E1
    title: "Ecology domain entrypoint refactor (contracts + registries)"
    status: planned
    blocked_by: [B3, B4]
  - id: E2
    title: "Ecology steps migration (compiler-first, no runtime resolveConfig)"
    status: planned
    blocked_by: [E1, C2]
  - id: E3
    title: "Ecology stage public view + compile (Option A) where beneficial"
    status: planned
    blocked_by: [E2]

  - id: F1
    title: "Verify no shims + remove dead paths"
    status: planned
    blocked_by: [A2, B4, C3, D2, E2]
  - id: F2
    title: "Final hygiene + enforcement tightening"
    status: planned
    blocked_by: [F1]
```

### A) Compiler foundation (A1–A2)

Phase ordering and helper behavior are pinned by the target spec (`02-compilation.md`) and mirrored by the spec’s TypeScript reference implementation (`architecture/ts/compiler.ts`). The goal of A is to make the compiler pipeline a repo-real module with tests before any consuming code is rewritten.

```yaml
A:
  reference_disclaimer:
    - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
    - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
  A1:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    implementation_notes:
      - "Normalize strictly using TypeBox Value.Default + Value.Clean, and report unknown keys separately (additionalProperties:false)."
      - "Prefill op defaults by reading step.contract.ops (contract-driven discovery) and installing default envelope values built from op contract strategies."
      - "Normalize op envelopes top-level only by iterating contract-declared op keys; never scan nested config."
    test_notes:
      - "Include tests for unknown-key errors, null/undefined behavior, and error path formatting."
  A2:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    implementation_notes:
      - "Implement compileRecipeConfig as: stage surface normalize -> stage.toInternal -> unknown step id validation -> step canonicalization loop."
      - "Iterate steps in stage.steps array order; this is pinned for stable error ordering."
      - "Explicitly error on stage.toInternal producing unknown step ids (excluding knobs)."
```

#### A1 — Compiler module skeleton + strict normalization

This is the “DX-first win” slice: land compiler primitives (strict schema normalization + op envelope prefill + error aggregation) behind a compiler module boundary. This should be landable before any recipe/engine wiring changes.

**Complexity × parallelism:** high complexity, medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] New compiler helpers exist as modules under `/packages/mapgen-core/src/compiler/**` and are exported for tests to import.
- [ ] `normalizeStrict(schema, raw, path)` (or equivalent) reports unknown-key errors deterministically and in a stable path format.
- [ ] `prefillOpDefaults(stepContract, rawStepConfig, path)` installs missing op envelopes **only** based on contract-declared ops (no nested scanning).
- [ ] Unit tests cover: unknown keys, null/undefined behavior, and error path formatting; tests are deterministic.

**Scope Boundaries**
In scope:
- Strict normalization helpers and error surface for the compiler.
- Default envelope construction for ops based on contracts/strategies.
- Unit tests for the helpers (no runtime wiring).
Out of scope:
- Any changes to `/packages/mapgen-core/src/authoring/recipe.ts` or mod runtime wiring.
- Any changes to engine planner/executor behavior (that is D1/D2).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/compiler/normalize.ts
    notes: "New: strict normalization utilities + unknown key error surface + stable error path formatting."
  - path: /packages/mapgen-core/src/compiler/recipe-compile.ts
    notes: "New: compiler entrypoints will live here; for A1 focus on helper exports, not full wiring."
  - path: /packages/mapgen-core/src/engine/execution-plan.ts
    notes: "Baseline prior art for unknown-key detection + Value.Errors formatting (findUnknownKeyErrors + formatErrors)."
  - path: /packages/mapgen-core/src/authoring/op/defaults.ts
    notes: "Baseline prior art for defaulting/convert/clean pipeline when constructing default envelope configs."
```

**Paper Trail**
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/02-compilation.md` (§1.10, §1.20)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md` (I2, I6, I7)

#### A2 — compileRecipeConfig end-to-end wiring

This unit builds the authoritative compile entrypoint (Phase A + Phase B) but still keeps it decoupled from runtime wiring. The output should be deterministic, fully canonical internal configs keyed by stageId → stepId.

**Complexity × parallelism:** high complexity, medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `compileRecipeConfig({ env, recipe, config, compileOpsById })` exists and follows the spec’s ordering (Phase A then Phase B).
- [ ] Compiler rejects unknown keys in per-stage rawSteps (excluding the reserved `"knobs"` key).
- [ ] Compiler errors include deterministic attribution: stageId + stepId + path (stable ordering across runs).
- [ ] Unit tests compile a minimal synthetic recipe/stage/steps and assert: (a) canonicalization ordering, (b) unknown-step-id errors, (c) op envelope prefill behavior.

**Scope Boundaries**
In scope:
- The end-to-end compiler call chain and error surface shape.
- Test coverage of compiler ordering and error aggregation.
Out of scope:
- Wiring `compileRecipeConfig` into `createRecipe` (that is C1).
- Removing engine/runtime normalization hooks (that is D2).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/compiler/recipe-compile.ts
    notes: "Define compileRecipeConfig entrypoint; ensure ordering matches spec Phase A/B."
  - path: /docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/compiler.ts
    notes: "Reference ordering and types; do not treat as runtime code."
```

**Paper Trail**
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/02-compilation.md` (§1.9, §1.20)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md` (Recipe compiler + types)

### B) Authoring surface upgrades (B1–B4)

This workstream upgrades the public authoring surface so the target architecture can be adopted without ad-hoc conventions.

```yaml
B:
  reference_disclaimer:
    - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
    - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
  B1:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Enforce kebab-case at step contract creation time (throw on violation)."
      - "Rename existing non-kebab step ids in mods/recipes and update all references."
  B2:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Adopt Stage Option A only (public+compile optional; internal-as-public otherwise)."
      - "createStage computes surfaceSchema and provides a deterministic toInternal wrapper."
      - "Internal-as-public stages validate stage surface only; step configs remain unknown until Phase B."
  B3:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Introduce canonical bindCompileOps/bindRuntimeOps helpers in core authoring."
      - "Domains export compileOpsById/runtimeOpsById registries keyed by op.id; runtime surface is structurally stripped."
      - "Recipe boundary explicitly merges domain registries into a recipe-owned compileOpsById."
  B4:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Rename op.resolveConfig to op.normalize."
      - "Implement normalize dispatch by envelope.strategy (strategy-specific normalize hook)."
```

#### B1 — Step id convention: kebab-case enforced

Step IDs become user-facing: they appear in compiler errors, config objects, and file layout. The spec pins kebab-case for readability and consistent config keys. This unit makes that a **hard rule** at authoring time.

**Complexity × parallelism:** medium complexity, high parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `defineStepContract(...)` throws on non-kebab step IDs with a message that includes the invalid id.
- [ ] `createStage(...)` throws if any child step id is non-kebab, including stage id + step id in the error message.
- [ ] All step IDs in `mods/mod-swooper-maps/src/recipes/**` are kebab-case and all call sites are updated accordingly.

**Scope Boundaries**
In scope:
- Enforcing kebab-case IDs at the authoring factory boundary.
- Renaming existing non-kebab step ids in the standard recipe (and updating references).
Out of scope:
- Renaming stage IDs (already kebab-case in standard recipe).
- Renaming other `"id"` fields that are not step IDs (e.g., Civ7 modifier IDs).

**Prework Findings (Complete)**

### 1) Current non-kebab step IDs (standard recipe)

These step contract IDs contain uppercase letters today and must be migrated:
- `storyCorridorsPost`
- `climateRefine`
- `storySwatches`
- `derivePlacementInputs`
- `landmassPlates`
- `storyHotspots`
- `storySeed`
- `storyCorridorsPre`
- `storyRifts`
- `storyOrogeny`
- `climateBaseline`
- `ruggedCoasts`
- `plotEffects`

### 2) Known non-mod touchpoints (will break until updated)
- `packages/mapgen-core/test/pipeline/placement-gating.test.ts` references `derivePlacementInputs`.

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `rg -n 'id: \"[^\"]*[A-Z][^\"]*\"' mods/mod-swooper-maps/src/recipes` (expect zero hits)

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/authoring/step/contract.ts
    notes: "Add kebab-case assertion in defineStepContract."
  - path: /packages/mapgen-core/src/authoring/stage.ts
    notes: "Add kebab-case assertion for stage.steps[*].id (include stage id in error)."
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/*.contract.ts
    notes: "Rename non-kebab step contract ids; update any stage composition and test string references."
  - path: /packages/mapgen-core/test/pipeline/placement-gating.test.ts
    notes: "Update hard-coded step id strings to kebab-case after migration."
```

**Paper Trail**
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md` (step id enforcement)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` (ordering + kebab-case callout)

#### B2 — Stage Option A: public+compile with computed surfaceSchema

This unit makes stages the authoritative “author-facing config surface” owner. Stage config becomes a single object per stage: either `{ knobs, ...publicFields }` (when `public` is present) or `{ knobs, ...stepKeys }` (for internal-as-public stages). The compiler is the only place where the stage surface is normalized and compiled into per-step configs.

**Complexity × parallelism:** high complexity, medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `createStage(...)` computes and attaches `surfaceSchema` for the stage (including `"knobs"` reserved key handling).
- [ ] Stage Option A exists: stages may declare optional `public` schema and a `compile` mapping; internal-as-public stages remain valid.
- [ ] Reserved key enforcement: authors cannot declare a step id/key named `"knobs"` and `"knobs"` must not appear inside step configs post-compilation.

**Scope Boundaries**
In scope:
- Stage factory + types to support Option A (public+compile optional; internal-as-public otherwise).
- Reserved key enforcement for `"knobs"`.
Out of scope:
- The compiler implementation that consumes these surfaces (A2 owns compileRecipeConfig; this unit owns stage shapes).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/authoring/stage.ts
    notes: "Upgrade createStage to compute surfaceSchema + standard toInternal wrapper per spec."
  - path: /packages/mapgen-core/src/authoring/types.ts
    notes: "Introduce stage surface/public typing as pinned by spec; ensure RecipeConfigInputOf/CompiledRecipeConfigOf can evolve accordingly."
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/**/index.ts
    notes: "Stage module call sites will need updates once createStage signature/type changes."
```

**Paper Trail**
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/01-config-model.md` (§1.6 knobs model; reserved key rule)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md` (Stage definition; Stage Option A)

#### B3 — Domain ops registries + binding helpers (compile vs runtime)

This unit makes op registry ownership explicit and enforces “domain entrypoint only” imports. Steps should bind runtime ops by id (not deep-import implementations), and the compiler should receive a recipe-owned `compileOpsById` assembled by the recipe boundary.

**Complexity × parallelism:** medium complexity, medium-high parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] Canonical binding helpers exist in authoring core (bind compile-time ops vs runtime ops distinctly).
- [ ] Domains expose `compileOpsById` and `runtimeOpsById` registries keyed by `op.id`.
- [ ] Recipe boundary merges domain registries into a recipe-owned `compileOpsById` (no implicit globals).

**Scope Boundaries**
In scope:
- Binding helper surfaces and expected domain registry shape.
Out of scope:
- Full domain-by-domain adoption (ecology exemplar is E1/E2; other domains can follow later).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/authoring/bindings.ts
    notes: "New: canonical bindCompileOps/bindRuntimeOps helpers (location pinned by spec)."
  - path: /docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md
    notes: "Binding helpers canonical location + API shapes (§1.14)."
  - path: /docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md
    notes: "Import boundaries: domain entrypoints only; steps must not deep import ops/strategies."
```

#### B4 — Op normalization hook semantics: resolveConfig -> normalize

The compiler architecture renames and narrows “config normalization hooks”:
- **Old/baseline:** `resolveConfig(config, settings)` exists on steps and ops and can influence engine planning.
- **Target:** `normalize(envelope, ctx)` exists only as a **compile-time** hook and is dispatched by `envelope.strategy`. Runtime surfaces are stripped and never normalize/default/clean.

**Complexity × parallelism:** high complexity, medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `resolveConfig` is renamed to `normalize` on op and step authoring surfaces.
- [ ] `createOp(...)` (or equivalent) implements `op.normalize` dispatch by `envelope.strategy` (strategy-specific normalize hook).
- [ ] No runtime code path calls `normalize` (enforced by imports + tests).

**Scope Boundaries**
In scope:
- Renaming and semantic tightening for op/step normalization surfaces.
- Updating existing strategy/step implementations to match the new naming/contract.
Out of scope:
- Removing engine planner’s step normalization calls (D2 owns validate-only flip).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `rg -n \"\\bresolveConfig\\b\" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits by the end of this unit)

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/authoring/op/types.ts
    notes: "Rename DomainOp.resolveConfig -> normalize; ensure compile-time-only intent stays true."
  - path: /packages/mapgen-core/src/authoring/op/create.ts
    notes: "Rename dispatcher to normalize; preserve 'return cfg unchanged if selected strategy has no normalize'."
  - path: /packages/mapgen-core/src/authoring/types.ts
    notes: "Rename Step.resolveConfig -> normalize (compile-time only); propagate through authoring surfaces."
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/index.ts
    notes: "Remove step-level resolveConfig blocks; replace with compiler-time normalization in later units (E2/C2)."
  - path: /mods/mod-swooper-maps/src/domain/**/ops/**/strategies/*.ts
    notes: "Rename strategy-local resolveConfig helpers to normalize where they are part of the op’s compile-time surface."
```

**Paper Trail**
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md` (I2, I3)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/01-config-model.md` (§1.7 hook semantics)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` (“Rename: resolveConfig → normalize”)

### C) Recipe boundary + config model cutover (C1–C3)

This is where compilation becomes mandatory for any real runtime callsite. The strategy is: land compilation at the recipe boundary first, then migrate stages incrementally, then remove the bypass.

```yaml
C:
  reference_disclaimer:
    - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
    - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
  C1:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Update createRecipe so compileRecipeConfig runs before compileExecutionPlan."
      - "Make compileOpsById assembly explicit at the recipe boundary (no implicit globals)."
      - "Update recipe config typing to reflect stage surfaces (`knobs` + either public fields or internal step keys) and compiled output (stageId -> stepId -> canonical)."
  C2:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Migrate the standard recipe stages one-by-one to the new authoring surface."
      - "Start with the foundation stage as the first migrated stage (small surface, no step.resolveConfig today)."
      - "For steps currently using step.resolveConfig, move that logic into compiler-time normalization (step.normalize and/or op.normalize) and remove runtime dependence."
  C3:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Remove any remaining path that lets uncompiled configs reach engine planning."
      - "Ensure error surfaces point authors to compiler errors, not engine resolveConfig failures."
```

#### C1 — Introduce recipe boundary compilation (before engine plan compilation)

Today the runtime call chain is: `recipe.run(...)` → `compileExecutionPlan(...)` → `PipelineExecutor.executePlan(...)`. This unit inserts compilation at the recipe boundary so the engine only sees canonical per-step configs (and later becomes validate-only).

**Complexity × parallelism:** high complexity, low-medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `createRecipe` compiles author-facing stage config via `compileRecipeConfig` before engine plan compilation.
- [ ] Recipe boundary assembles a recipe-owned `compileOpsById` explicitly (by merging domain registries used by the recipe/stages).
- [ ] `RecipeConfigInputOf` and `CompiledRecipeConfigOf` are updated to represent stage surface input vs compiled per-step output (as pinned by spec; note O2 is closed).

**Scope Boundaries**
In scope:
- Wiring compiler into the recipe boundary (in authoring SDK).
- Making `compileOpsById` assembly explicit at that boundary.
Out of scope:
- Migrating all standard stages (that is C2).
- Engine validate-only flip (that is D1/D2).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm test` (full suite gate once wired)

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/authoring/recipe.ts
    notes: "Current call chain builds a RecipeV2 with per-step config and calls compileExecutionPlan; insert compileRecipeConfig before plan compilation."
  - path: /packages/mapgen-core/src/authoring/types.ts
    notes: "Update RecipeConfigInputOf/CompiledRecipeConfigOf typing split (O2 is closed and pinned)."
  - path: /mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: "Standard recipe is the primary consumer of createRecipe; will be first runtime callsite to adapt."
  - path: /mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts
    notes: "Calls recipe.run(context, settings, config); config typing and shape will change after cutover."
```

**Paper Trail**
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md` (§1.16 call chain)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` (“Slice 2 — Recipe boundary adoption…”)

#### C2 — Update stage+step authoring to the new config shape

This unit migrates the standard recipe to the new authoring surface incrementally, keeping the repo runnable after each stage migration.

**Complexity × parallelism:** high complexity, medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] Stage config input is a single object per stage and matches one of:
  - internal-as-public: `{ knobs, ...[stepId]: unknown }` (step fields remain unknown at Phase A), or
  - public+compile: `{ knobs, ...publicFields }` validated by `stage.public`, then compiled by `stage.compile`.
- [ ] Compiled output is total: `stageId → stepId → canonical step config` (no missing required envelopes/config).
- [ ] At least one migrated stage runs end-to-end through compiler → plan → `executePlan` and passes tests.

**Scope Boundaries**
In scope:
- Updating standard recipe stages one by one to the new shape.
- Starting with the foundation stage (no step.resolveConfig today) to establish the migration pattern.
Out of scope:
- Ecology exemplar refactor (that is E1–E3, intentionally later).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

**Implementation Guidance**
```yaml
files:
  - path: /mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: "Stage ordering is explicit; migrate stage modules one by one and keep tests green after each."
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts
    notes: "Pinned as the first stage to migrate (small surface; no step.resolveConfig in this stage today)."
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/**/index.ts
    notes: "Stage modules will need updates after Stage Option A and config shape changes."
```

#### C3 — Remove runtime compilation fallbacks at the recipe boundary

This unit removes any bypass paths that allow uncompiled configs to flow into engine plan compilation. After this, the only supported entry is compilation-first.

**Complexity × parallelism:** medium complexity, low-medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] No code path constructs an engine plan from uncompiled (author-facing) configs.
- [ ] Errors that used to surface during engine planning/resolveConfig now surface as compiler errors at the recipe boundary.

**Testing / Verification**
- `pnpm test`
- `rg -n \"RecipeConfigInputOf\" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect only author-facing call sites; no engine usage)

### D) Engine becomes validate-only (D1–D2)

This is deferred until after compilation is mandatory at the recipe boundary. The engine then becomes a pure consumer of canonical configs.

```yaml
D:
  reference_disclaimer:
    - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
    - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
  D1:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Remove or internalize PipelineExecutor.execute*/executeAsync* (they synthesize configs today)."
      - "Keep executePlan*/executePlanAsync* as the supported entrypoints."
  D2:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Make compileExecutionPlan validate-only for step configs."
      - "Remove default/clean/mutation and remove all step.resolveConfig calls."
      - "Remove the obsolete error code step.resolveConfig.failed."
```

#### D1 — Executor plan-only: remove runtime config synthesis

`PipelineExecutor.execute*` currently synthesizes configs via `Value.Default/Convert/Clean`. In the target architecture, execution consumes plans only; config construction happens at compile time.

**Complexity × parallelism:** medium complexity, medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `PipelineExecutor.execute` / `executeAsync` are removed or made internal-only (not supported runtime entrypoints).
- [ ] `executePlan` / `executePlanAsync` remain the supported entrypoints and are used by runtime call sites.
- [ ] Tests that previously relied on `execute(...)` are updated to compile a plan and call `executePlan(...)`.

**Scope Boundaries**
In scope:
- Executor API surface tightening and removal of config synthesis helpers.
Out of scope:
- Planner validate-only changes (D2 owns plan compilation semantics).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `pnpm test:mapgen`

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/engine/PipelineExecutor.ts
    notes: "Contains resolveStepConfig(...) (Value.Default/Convert/Clean) and execute*/executeAsync* entrypoints."
  - path: /packages/mapgen-core/test/pipeline/placement-gating.test.ts
    notes: "Uses executor.execute(...) today; update to compile plan + executePlan."
  - path: /packages/mapgen-core/test/pipeline/tag-registry.test.ts
    notes: "Uses executor.execute(...) today; update accordingly."
  - path: /packages/mapgen-core/test/pipeline/tracing.test.ts
    notes: "Uses executor.execute(...) today; update accordingly."
```

#### D2 — Planner validate-only: remove default/clean and step.resolveConfig

`compileExecutionPlan` currently defaults/cleans configs and invokes `step.resolveConfig(...)` during plan compilation. In the target state, compilation is validate-only: no mutation, no defaulting/cleaning, and no step/op normalization hooks.

**Complexity × parallelism:** high complexity, medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `compileExecutionPlan` validates only: it does not call `Value.Default/Convert/Clean` on step configs.
- [ ] `compileExecutionPlan` does not call any step/op normalization hook (`step.resolveConfig`/`step.normalize` etc).
- [ ] Error code `step.resolveConfig.failed` is deleted and tests updated accordingly.

**Scope Boundaries**
In scope:
- Engine planner semantics change (validate-only) and corresponding tests.
Out of scope:
- Recipe boundary compilation and stage migrations (C1/C2 own producing canonical configs).

**Testing / Verification**
- `pnpm -C packages/mapgen-core test`
- `rg -n \"step\\.resolveConfig\" packages/mapgen-core/src` (expect zero hits after this unit)
- `rg -n \"Value\\.(Default|Convert|Clean)\" packages/mapgen-core/src/engine` (expect zero hits after this unit)

**Implementation Guidance**
```yaml
files:
  - path: /packages/mapgen-core/src/engine/execution-plan.ts
    notes: "Baseline contains unknown-key detection + Value.Errors formatting; remove default/clean + resolveConfig calls while preserving validation errors."
  - path: /packages/mapgen-core/test/pipeline/execution-plan.test.ts
    notes: "Contains coverage for step resolveConfig behavior today; must be rewritten to match validate-only planner."
```

**Paper Trail**
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` (“Engine validate-only behavior”)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md` (I2)

### E) Ecology as canonical exemplar (E1–E3)

Ecology is the reference implementation for domain exports, ops registries, step authoring patterns, and (optionally) a stage public view. This refactor is intentionally late (after the compiler + authoring surfaces exist) so ecology can be migrated cleanly without introducing a second architecture.

```yaml
E:
  reference_disclaimer:
    - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
    - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
  E1:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Split ecology exports into a contract-only surface and an implementation surface."
      - "Add compileOpsById/runtimeOpsById registries and enforce domain entrypoint-only imports."
  E2:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Migrate ecology steps to declare ops as contracts and bind runtime ops by id."
      - "Replace step.resolveConfig patterns with compiler-time normalization (step.normalize and op.normalize)."
      - "Keep step-owned config (e.g. engine bindings) in the step schema as explicit extra fields (not duplicated elsewhere)."
  E3:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Define knobsSchema and, where beneficial, a public schema + compile mapping for ecology."
      - "Ensure the public surface validates strictly only at the stage boundary; step config validation remains Phase B."
```

#### E1 — Ecology domain entrypoint refactor (contracts + registries)

Ecology is the exemplar domain for the new ownership model. This unit reshapes the ecology domain entrypoint into:
- a contract-only surface (`@mapgen/domain/ecology/contracts`), and
- a canonical entrypoint that exports registries (`compileOpsById`, `runtimeOpsById`) and other safe domain types/constants.

**Complexity × parallelism:** high complexity, low-medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] `@mapgen/domain/ecology/contracts` exports contracts only (no engine binding, no strategy implementations).
- [ ] `@mapgen/domain/ecology` exports `compileOpsById` and `runtimeOpsById` keyed by `op.id`.
- [ ] Recipes/steps/tests do not deep-import from `@mapgen/domain/ecology/ops/**` (enforced by lint and/or `rg` scans).

**Testing / Verification**
- `pnpm -C mods/mod-swooper-maps test`
- `rg -n \"@mapgen/domain/ecology/ops/\" mods/mod-swooper-maps/src` (expect zero hits after refactor)

**Implementation Guidance**
```yaml
files:
  - path: /mods/mod-swooper-maps/src/domain/ecology/index.ts
    notes: "Baseline exports `ops` object and misc schemas/types; refactor into contract-only + registries model."
  - path: /docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md
    notes: "Domain entrypoint shape and import boundaries (pinned)."
  - path: /docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md
    notes: "Domain entrypoints only (no deep imports) enforcement."
```

#### E2 — Ecology steps migration (compiler-first, no runtime resolveConfig)

Baseline ecology steps still use step-level `resolveConfig(...)` that delegates into op `resolveConfig(...)`. This unit removes those runtime dependencies and makes compilation the only place where configs are defaulted/cleaned/normalized.

**Complexity × parallelism:** high complexity, low-medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] Ecology steps do not export or use step-level `resolveConfig` (no runtime normalization).
- [ ] Step configs are normalized at compile time via step.normalize and/or op.normalize (per the compiler pipeline).
- [ ] Runtime step code calls ops via `runtimeOpsById` (by id), not `ecology.ops.*` implementation objects.

**Prework Findings (Complete)**

### 1) Current standard recipe steps using step-level resolveConfig (must be migrated)
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biome-edge-refine/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/pedology/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/resource-basins/index.ts`

### 2) Non-ecology standard recipe step using step-level resolveConfig (must be migrated)
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/index.ts`

**Testing / Verification**
- `pnpm -C mods/mod-swooper-maps test`
- `rg -n \"resolveConfig:\" mods/mod-swooper-maps/src/recipes/standard` (expect zero hits after migration)

**Implementation Guidance**
```yaml
files:
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/ecology/**
    notes: "Remove step-level resolveConfig blocks; bind runtime ops by id; keep adapter-dependent helpers step-scoped."
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/**
    notes: "Placement derive step currently uses resolveConfig; migrate to compiler-first normalization too."
```

#### E3 — Ecology stage public view + compile (Option A) where beneficial

Use ecology to demonstrate the optional stage public schema and compile mapping end-to-end. This is the “copyable exemplar” for future stages/domains.

**Complexity × parallelism:** medium-high complexity, low-medium parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] Ecology stage defines `knobsSchema`, and where beneficial, an explicit `public` schema.
- [ ] Ecology stage `compile` maps public fields to internal per-step configs deterministically.
- [ ] Compiler error examples (unknown step ids, unknown keys, schema errors) are exercised end-to-end using ecology as the reference.

**Testing / Verification**
- `pnpm -C mods/mod-swooper-maps test`

### F) Cleanup pass (F1–F2)

This milestone is complete only when there is one architecture and no lingering legacy scaffolding.

```yaml
F:
  reference_disclaimer:
    - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
    - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
  F1:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Verify no compatibility shims were introduced; delete any dead paths if present."
  F2:
    reference_disclaimer:
      - "DO NOT consult non-target MapGen architecture/spec docs outside spec_package; they conflict with the target spec and will cause confusion."
      - "See non_target_arch_docs_off_limits in this milestone for off-limits paths."
    concrete_changes:
      - "Tighten lint boundaries per 06-enforcement.md and align docs/specs with code reality."
      - "Rename settings -> env and move Env schema/type to core; delete legacy naming (no long-lived alias)."
```

#### F1 — Verify no shims + remove dead paths

This is a cleanup gate: confirm we ended with one architecture and remove dead exports/paths introduced during the cutover.

**Complexity × parallelism:** medium complexity, high parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] No compatibility shims remain (no dual entrypoints, no parallel config path).
- [ ] Legacy error codes and dead paths are deleted (including `step.resolveConfig.failed`).

**Testing / Verification**
- `pnpm test`
- `rg -n \"\\bresolveConfig\\b\" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits)
- `rg -n \"Value\\.(Default|Convert|Clean)\" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits outside compiler-only paths)

#### F2 — Final hygiene + enforcement tightening

This is where enforcement becomes real: tighten import boundaries, finalize naming (`settings` → `env`), and align docs/spec references to the final code reality.

**Complexity × parallelism:** medium complexity, high parallelism.

**Acceptance Criteria (Verifiable)**
- [ ] Import boundaries match `06-enforcement.md` (domain entrypoint-only; no deep imports).
- [ ] `settings` is renamed to `env` and `Env` type/schema lives in core (no long-lived alias).
- [ ] Repo guardrails pass (lint + tests) and drift checks are in place.

**Testing / Verification**
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm lint:domain-refactor-guardrails`

---

## Part III: Sequencing (Slices 1–5: DX-first, risk-later)

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
