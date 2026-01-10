# SPEC: Domain Modeling Guidelines (Ops, Strategies, Rules, Steps)

## Outline (minimal)

1) Purpose
- Establish a single, canonical way to model a domain into operations, strategies, rules, and steps.
- Prevent ambiguous ownership and keep composition consistent with the contract-first architecture.

2) Definitions (behavioral)
- Rule: small, pure, single-purpose heuristic or decision.
- Strategy: algorithmic variant of a single op with identical input/output.
- Operation (op): stable, step-callable contract; pure input/config -> output.
- Step: orchestration + effect boundary; builds inputs, calls ops, applies outputs, publishes artifacts.

3) Decision framework (what becomes what)
- If a unit has a stable I/O contract and should be observable independently -> op.
- If a unit is the same op contract but needs algorithmic variants -> strategy.
- If a unit is a small heuristic/scoring/check -> rule.
- If a unit orchestrates multiple ops or performs effects -> step.

4) Composition boundaries
- Steps call ops; ops do not call steps.
- Strategies are internal to ops; steps select via config only.
- Rules are internal to ops and never exported as step-callable surfaces.

5) Op sizing rules
- Favor multiple focused ops over mega-ops.
- If input requirements diverge, split the op.
- Do not use strategies to hide unrelated responsibilities.

6) Step modeling rules
- Steps are action boundaries (apply/publish); planning lives in ops.
- Steps own dependency keys; ops own contracts.

7) Anti-patterns
- Mega-ops with unrelated knobs.
- Steps that “plan” or encode domain heuristics.
- Strategies with different inputs or outputs.
- Rules exporting shared types or importing op contracts.

8) Required outputs for domain inventory
- Map existing logic -> {step | op | strategy | rule}.
- Proposed op catalog with ids + kinds.
- Strategy list per op (only if I/O stable).
- Rule inventory per op.

9) Example (vegetation)
- Ops: plan-tree-vegetation, plan-shrub-vegetation, plan-ground-cover.
- Step: plot-vegetation (orchestrates ops, applies/publishes).
- Rules: normalize configs, pick placements, enforce distance.

---

## Expanded guidance

### 1) Purpose and scope

This document defines how to model a domain into **operations**, **strategies**, **rules**, and **steps** under the contract-first architecture. It is the canonical guide for composition decisions and ownership boundaries. If local code or precedent conflicts with this spec, this spec wins.

### 2) Core concepts and responsibilities

**Rule**
- A tiny, pure unit of decision-making (check, score, pick, normalize).
- Must be composable and narrowly scoped.
- Lives under a single op in `rules/**` and is not a contract surface.

**Strategy**
- An algorithmic variant for one op.
- Must preserve the op’s input/output contract.
- Changes behavior only; it does not change the schema shape.

**Operation (op)**
- A stable, step-callable contract with explicit schemas.
- Pure input + config -> output. No engine, no adapter, no step context.
- The unit we expect to reuse, test, and evolve independently.
- Compile-time normalization lives in `op.normalize(...)` (never at runtime).
- Op config envelopes are `{ strategy, config }` and should remain stable in shape.
- Op normalize runs only during compilation; runtime `run(...)` assumes canonical configs.

**Step**
- The smallest runtime unit in a recipe pipeline.
- Orchestrates inputs, calls ops, then applies/publishes results.
- Owns `requires/provides` and interaction with runtime/engine surfaces.
- May provide `step.normalize(...)` (compile-time only); runtime `run(...)` treats config as canonical.
- Step contracts require explicit schemas; op envelopes are included directly in step schemas and defaulted/cleaned by the compiler.

### 3) Composition boundaries (hard rules)

- Steps **call** ops; ops **never** call steps.
- Steps **never** import or call op rules or strategy modules directly.
- Strategies are internal to ops; steps select strategies via config only.
- Rules are internal to ops; they are not exposed as contracts.
- Runtime steps bind ops via `bindRuntimeOps` (runtime surface strips compile-time hooks).
- Compile-time normalization uses `bindCompileOps` (compile surface) inside `step.normalize` or compiler helpers.

### 4) Decision framework (what becomes what)

Use this decision table when mapping legacy logic to the target architecture:

- **Operation**
  - If it has a stable input/output contract.
  - If you want to observe/test it independently.
  - If multiple steps might reasonably call it.

- **Strategy**
  - If the op contract is stable but the algorithm should vary.
  - If the only difference is internal computation (same inputs/outputs).

- **Rule**
  - If the logic is a small heuristic or decision point.
  - If it should be composed into multiple strategies or reused within one op.

- **Step**
  - If it orchestrates multiple ops.
  - If it performs effects (engine calls, buffer writes, artifact publication).
  - If it defines the pipeline boundary and dependency keys.

### 5) Operation sizing and stability

**Hard rules**
- Op ids must be verb-forward and action-specific (`plan`, `compute`, `score`, `select`).
- A single op must have a **coherent, stable input shape**.
- If inputs diverge by use case, split into multiple ops.
- Op `config` schemas must represent a stable envelope shape (strategy + config), not ad-hoc unions.

**Heuristics**
- Split by **different responsibilities**, even if inputs overlap.
- Split by **different kinds** (`plan` vs `compute`).
- If config becomes a “grab bag” of unrelated knobs, the op is too broad.

### 6) Strategies vs multiple ops

Use strategies when:
- The input/output contract stays stable.
- Differences are algorithmic (sampling methods, scoring formulas, heuristics).

Do **not** use strategies when:
- Different strategies need different inputs or outputs.
- The behavior spans different responsibilities or kinds.

In those cases, create **multiple ops** with separate contracts.

### 7) Rules as discrete policy units

Rules should be:
- Small and focused.
- Easy to test in isolation.
- Named after the decision they make (e.g., `enforceMinDistance`, `pickWeightedIndex`).

Rules should not:
- Export types (types are centralized in `types.ts`).
- Import op contracts (rules consume types only).

### 8) Step modeling and orchestration

Steps are **action boundaries**:
- They build inputs from runtime context.
- They call ops with validated config.
- They apply results and publish artifacts.

Steps are **not** planning units:
- Planning belongs to ops.
- A step named “plan-*” is a modeling smell; rename it to reflect action (e.g., `plot-*`, `apply-*`, `publish-*`).

Steps in the current architecture:
- Author contracts are schema-only via `defineStepContract` (explicit `schema` required).
- Op envelopes are included directly in the step schema (typically via `op.config`), and defaults are handled by schema defaults or explicit step defaults.
- Op normalization is performed in `step.normalize(...)` using compile-surface ops (`bindCompileOps`) when needed.

### 9) Domain modeling workflow (practical use)

When refactoring a domain:

1) **Inventory** all legacy logic and classify each unit:
   - Step orchestration? -> step.
   - Stable contract? -> op.
   - Variant algorithm? -> strategy.
   - Small heuristic? -> rule.

2) **Define the op catalog**:
   - Id + kind for each op.
   - Input/output schemas with stable shape.
   - Strategies only when the contract is stable.

3) **Place rules** inside ops:
   - Rules are op-local and compose strategy behavior.

4) **Wire steps**:
   - Steps call ops and publish results.
   - Steps never call rules or strategies directly.

### 10) Anti-patterns (avoid)

- **Mega-ops** with unrelated configs or responsibilities.
- **Step-level planning** (steps encoding domain heuristics).
- **Strategy misuse** (different I/O shapes under one op).
- **Rule leakage** (rules exported as public contracts or type sources).

### 11) Required outputs for the domain inventory

- A mapping of current logic -> {step | op | strategy | rule}.
- A proposed op catalog with ids + kinds.
- Strategy lists per op (only if I/O stable).
- Rule lists per op and where they are composed.

### 12) Example: Vegetation modeling

**Ops**
- `plan-tree-vegetation` (plan) — outputs tree placements.
- `plan-shrub-vegetation` (plan) — outputs shrub placements.
- `plan-ground-cover` (plan) — outputs grass/ground cover placements.

**Strategies**
- `plan-tree-vegetation`: `default`, `clustered` (same inputs/outputs, different algorithms).

**Rules**
- `normalizeTreeConfig`, `buildTreePlacements`, `enforceMinDistance` (op-local helpers).

**Step**
- `plot-vegetation` — orchestrates multiple ops, applies placements to engine, publishes artifacts.

Key modeling point:
- Planning lives inside ops; the step is the orchestration boundary.
- If only tree planning inputs change, only the tree op contract changes (no global “plan vegetation” op with shape-shifting inputs).
