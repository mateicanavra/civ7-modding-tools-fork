# PRD: Target Task Graph Runtime (RunRequest → ExecutionPlan)

## 1. Purpose

Define the end-state runtime boundary for MapGen: a deterministic Task Graph pipeline driven by `RunRequest = { recipe, settings }`, compiled into an `ExecutionPlan`, and executed without legacy ordering/enablement/config shims. This PRD captures the canonical runtime surface described in `SPEC-target-architecture-draft.md` and related accepted decisions; it is explicitly about the desired final architecture (not the M4 slice).

## 2. Scope

**In scope**
- Boundary types (`RunRequest`, recipe schema, `ExecutionPlan` structure).
- Compilation rules (validation, enablement, config resolution) and execution semantics.
- Deterministic scheduling rules (linear baseline; DAG-ready contract).
- Mod packaging expectations (pipeline content shipped as mods with registry + recipes).

**Out of scope**
- Engine adapter API shape (covered by runtime boundary/adapter docs).
- Observability/event sinks (see `PRD-target-observability-and-validation.md`).
- Context storage layout and dependency satisfaction semantics (see `PRD-target-context-and-dependency-contract.md`).

## 3. Goals

1) A single orchestration path: compile `RunRequest` to `ExecutionPlan`, then execute the plan only.  
2) Recipe-authored enablement and ordering with fail-fast validation (no silent skips).  
3) Engine is content-agnostic; all pipeline content ships as mod packages (registry + recipes).  
4) Deterministic, schedulable pipeline supporting linear authoring now and DAG authoring later without breaking the contract.

## 4. Requirements

### 4.1 Boundary & Inputs
- **REQ-RUN-1:** The only runtime entrypoint is `RunRequest = { recipe, settings }`. Legacy inputs (`STAGE_ORDER`, `stageManifest`, `stageConfig`, presets) are deletion-only.
- **REQ-RUN-2:** `settings` are globally scoped per run (seed, dimensions, other run-wide settings) and validated before compilation. Step-local knobs live in per-occurrence recipe config, not in `settings`.
- **REQ-RUN-3:** Mods provide their own registries and one or more recipes; the core engine does not embed a privileged pipeline. The “standard pipeline” is just one mod package.

### 4.2 Recipe Authoring & Compilation
- **REQ-RUN-4:** Recipes are versioned (`schemaVersion`) and reference runnable atoms by registry `step.id`.
- **REQ-RUN-5:** Enablement is authored in the recipe; compilation drops disabled occurrences. Executors do **not** re-check enablement at runtime.
- **REQ-RUN-6:** Compilation resolves per-occurrence config, validates unknown config keys, and fails fast on missing tags/steps per the active registry.
- **REQ-RUN-7:** V1 authoring shape is an ordered `steps[]` list; the contract must allow future DAG/partial-order authoring that compiles to a deterministic schedule (stable topo-sort with defined tie-break rules).

### 4.3 ExecutionPlan & Execution Semantics
- **REQ-RUN-8:** The `ExecutionPlan` is a derived artifact that contains only validated, enabled nodes with resolved config and normalized `requires/provides`.
- **REQ-RUN-9:** Executors run the compiled plan only (no runtime recipe interpretation) and enforce dependency validation before each step.
- **REQ-RUN-10:** Execution is deterministic for a given `{recipe, settings}`; the plan fingerprint and run ID are derived from these inputs + normalized step IDs/config.
- **REQ-RUN-11:** Offline determinism is mandatory; the engine/adapter is optional. Any adapter-specific side effects are modeled as explicit `effect:*` tags (no hidden state).

## 5. Success Criteria

- Every pipeline invocation enters through `RunRequest` and produces an `ExecutionPlan` before execution.
- Unknown step IDs, tag references, and config keys are rejected at compile time with structured errors.
- No runtime checks for `shouldRun` or legacy enablement paths exist; disabled steps never appear in the plan.
- The standard pipeline is runnable as a mod-provided recipe through the same `RunRequest → ExecutionPlan` path.

## 6. Dependencies & References

- `SPEC-target-architecture-draft.md` (runtime contract, observability baseline, registry contract).  
- `PRD-target-registry-and-tag-catalog.md` (registry shape + canonical tags).  
- `PRD-target-context-and-dependency-contract.md` (context ownership + satisfaction rules).  
- `PRD-target-observability-and-validation.md` (required outputs and diagnostics).
