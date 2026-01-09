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

---

## Part I: Scope & Purpose

### Summary

Land the composition-first recipe compiler architecture as the single, canonical config path:

```yaml
summary:
  - "Stage config becomes a single author-facing surface (knobs + fields), compiled into internal step-id keyed configs."
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
        goal: "Make stage config a single object (knobs + fields), compiled to internal step map."
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
      - "Update recipe config typing to reflect stage surfaces (knobs + fields) and compiled output (stageId -> stepId -> canonical)."
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

---

## Part V: Notes

### Where migration ordering lives (spec)

```yaml
migration_ordering_source:
  file: docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md
```
