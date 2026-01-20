# SPEC: Domain Modeling Guidelines (Ops, Strategies, Rules, Steps)

## Outline (minimal)

1) Purpose
- Establish a single, canonical way to model a domain into operations, strategies, rules, and steps.
- Prevent ambiguous ownership and keep composition consistent with the current contract-first + compile-first architecture.

2) Definitions (behavioral)
- Rule: small, pure, single-purpose heuristic or decision.
- Strategy: algorithmic variant of a single op with identical input/output.
- Operation (op): stable, step-callable contract; pure input/config -> output.
- Step: orchestration + effect boundary; builds inputs, calls ops, applies outputs, publishes artifacts.
- Truth artifact: Physics-owned, engine-agnostic published state (no engine ids/adapter coupling; MAY be tile-indexed and MAY include `tileIndex`).
- Projection artifact: Gameplay-owned, canonical map-facing published state under `artifact:map.*`.
- Effect: a step-emitted execution guarantee (e.g. stamping/materialization completion via `effect:map.<thing>Plotted`).

3) Decision framework (what becomes what)
- If a unit has a stable I/O contract and should be observable independently -> op.
- If a unit is the same op contract but needs algorithmic variants -> strategy.
- If a unit is a small heuristic/scoring/check -> rule.
- If a unit orchestrates multiple ops or performs effects -> step.

4) Composition boundaries
- Steps call ops; ops do not call steps.
- Strategies are internal to ops; steps select via config only (strategy selection lives in op config).
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

This document defines how to model a domain into **operations**, **strategies**, **rules**, and **steps** under the architecture as implemented on this branch:

- **Contract-first**: ops and steps have explicit schemas and stable identifiers.
- **Compile-first**: config defaulting/cleaning/canonicalization happens during recipe compilation, not during runtime execution.

This document is intentionally aligned to the implemented surfaces in `packages/mapgen-core/src/authoring/**` and `packages/mapgen-core/src/compiler/**`.

### 2) Core concepts and responsibilities

**Rule**
- A tiny, pure unit of decision-making (check, score, pick, normalize).
- Must be composable and narrowly scoped.
- Lives under a single op in `rules/**` and is not a contract surface.

**Strategy**
- An algorithmic variant for one op.
- Must preserve the op’s input/output contract.
- Changes behavior only; it does not change the schema shape.
- Selected by config via the op’s strategy envelope: `{ strategy: "<id>", config: <schema> }`.

**Operation (op)**
- A stable, step-callable contract with explicit schemas.
- Pure `run(input, config) -> output`. No engine, no adapter, no step context.
- The unit we expect to reuse, test, and evolve independently.
- In code, ops are authored as:
  - `defineOp(...)` contract (`ops/<op>/contract.ts`)
  - `createOp(contract, { strategies })` implementation (`ops/<op>/index.ts`)

**Compile-time vs runtime behavior (op)**
- `strategy.normalize` (and the op-level dispatcher `op.normalize`) are **compile-time** canonicalization hooks.
- `strategy.run` (and `op.run`) are **runtime** behavior.

**Step**
- The smallest runtime unit in a recipe pipeline.
- Orchestrates inputs, calls ops, then applies/publishes results.
- Owns `requires/provides` and interaction with runtime/engine surfaces.
- In code, steps are authored as:
  - `defineStep({ id, phase, requires, provides, schema })` contract
  - `createStep(contract, { normalize?, run })` implementation

**Compile-time vs runtime behavior (step)**
- `step.normalize(config, { env, knobs })` is **compile-time only** (invoked by the recipe compiler).
- `step.run(context, config)` is **runtime** execution.

### 2.1) Artifacts and effects (locked posture: truth vs projection)

This posture is locked for Phase 2+ modeling:

- Physics domains publish **truth-only artifacts**: stable, deterministic, engine-agnostic state.
  - Truth artifacts MUST NOT embed engine ids, adapter objects, or other adapter/engine coupling.
  - Truth artifacts MAY be tile-indexed and MAY reference `tileIndex` (including in lists like volcano placements).
  - Physics truth MUST NOT depend on Gameplay `artifact:map.*` or `effect:map.*` as inputs (no backfeeding from projections/stamping into physics).
- Gameplay owns **projection artifacts** and **stamping**:
  - Canonical map-facing projection interfaces live under `artifact:map.*` and are Gameplay-owned.
  - `artifact:map.*` SHOULD publish observability/debug layers that are sensible and potentially useful for future Gameplay reads, even when not stamped to the engine yet.
    - Examples (non-exhaustive): `artifact:map.plateIdByTile` (computed by Gameplay from Physics truths, ideally via shared projection utilities; not a required mirror of any `artifact:foundation.*` surface), coasts, cliffs, mountains, volcanoes, plates, features, resources, etc.
  - Projection artifacts MAY be tile-indexed and MAY carry game-facing identifiers, but must remain pure data (no adapter calls).
- Execution guarantees are modeled as **boolean effects** emitted by the stamping step:
  - “Stamping happened” MUST be represented as `effect:map.<thing>Plotted`.
  - Steps are the effect boundary; ops remain data-pure and do not emit/verify effects.

**Example: Physics truth → Gameplay projection → stamping effect**
- Physics computes and publishes truth (no engine coupling): `artifact:<physicsDomain>.<truth>` (e.g. `artifact:ecology.biomeClassification`).
- Gameplay projects into the canonical map interface: `artifact:map.<projection>` (e.g. `artifact:map.biomeIdByTile`).
- A Gameplay `plot-*` stamping step reads `artifact:map.<projection>`, performs adapter writes, then provides `effect:map.<thing>Plotted` (e.g. `effect:map.biomesPlotted`).

**Shared projection algorithm posture (locked: single home, no per-domain duplicates)**
- If multiple domains/steps need the same projection algorithm (e.g., mesh→tile sampling, neighbor iteration, tile-space transforms), implement it once in shared/core libraries.
  - Prefer `packages/mapgen-core/` for core runtime + neutral utilities, and `packages/sdk/` for SDK-facing/shared tooling, per the target packaging specs.
  - Steps should call shared projection helpers; do not re-implement “the same projection” separately in each domain step.

### 3) Composition boundaries (hard rules)

- Steps **call** ops; ops **never** call steps.
- Steps **never** import or call op rules or strategy modules directly.
- Strategies are internal to ops; steps select strategies via config only.
- Rules are internal to ops; they are not exposed as contracts.

### 3.1) Architectural mapping (where these live)

Use this as the “current mental model” for refactors:

- **Domain** (ops + strategies + rules)
  - Location (example): `mods/mod-swooper-maps/src/domain/<domain>/ops/**`
  - Public surface exports:
    - `contracts` (op contracts)
    - `ops` (a `createDomainOpsSurface(...)` router that can bind contracts to `compile` and `runtime` surfaces)
- **Step** (orchestration)
  - Location (example): `mods/mod-swooper-maps/src/recipes/**/steps/**`
  - Binds ops via `domain.ops.bind({ ...contracts })`, then:
    - calls `compile.<opKey>.normalize(...)` from `step.normalize`
    - calls `runtime.<opKey>.run(...)` from `step.run`
- **Stage** (author-facing surface)
  - Location (example): `mods/mod-swooper-maps/src/recipes/**/stages/<stage>/index.ts`
  - Defined via `createStage({ id, knobsSchema, public?, compile?, steps })`
- **Recipe compiler**
  - `compileRecipeConfig(...)` in `packages/mapgen-core/src/compiler/recipe-compile.ts`
  - This is where `step.normalize` is invoked and where strict schema normalization happens.

### 3.2) Topology invariants (locked: wrap)

When you define adjacency, bounding boxes, “nearest”, and distance semantics:

- Treat topology as a **cylinder**: `wrapX=true` always (east–west wraps), `wrapY=false` always (north–south does not wrap).
- Do not introduce environment/config/knobs for wrap, and do not accept wrap flags as op/step inputs; wrap is a modeling invariant, not a contract parameter.
- Any neighbor iteration / BFS / distance over tiles MUST use the canonical semantics implied by this topology (periodic X, bounded Y).

### 3.3) Single-path posture (no shims / no dual paths)

- Do not model parallel “legacy + new” dependency paths for the same guarantee (e.g. dual effect ids for the same stamping boundary).
- Do not place adapter/engine logic outside steps; any side effects must be step-owned and surfaced via artifacts/effects, not hidden in helpers.

### 3.4) Maximal boundary posture (Physics vs `artifact:map.*` / `effect:map.*`)

This boundary is **hard** and **non-negotiable**. It exists to prevent drift and to keep the “truth vs projection/materialization” split legible across the entire pipeline.

**Physics domains (truth-only)**
- Physics steps MUST NOT `require` or consume `artifact:map.*` as inputs.
- Physics steps MUST NOT `require` or consume `effect:map.*` as inputs.
- Physics MAY publish tile-indexed truth artifacts when they are part of physics contracts/algorithms. `tileIndex` is allowed; the ban is on **engine/game-facing ids** and on **consuming map-layer artifacts/effects**.

**Gameplay / map layer (projection + materialization lane)**
- `artifact:map.*` is Gameplay-owned. It is the canonical map-facing projection/annotation layer (including debug/observability layers).
- “Materialization happened” MUST be represented by boolean effects: `effect:map.<thing>Plotted` (short, stable names; no versioning).
- Any step that touches the engine adapter (read or write) is Gameplay-owned and MUST provide the corresponding `effect:map.*Plotted` for what it did.

**Zero-legacy cutover requirement**
- We are switching to this posture and cutting over end-to-end. Do not plan or implement shims, dual paths, or “temporary compat”.
- If any existing step currently violates this posture (e.g., a physics stage reads adapter state), the fix is to **reclassify** that step into the Gameplay/materialization lane and adjust dependencies so physics truth remains truth-only.

### 4) Decision framework (what becomes what)

Use this decision table when mapping legacy logic to the target architecture:

- **Operation**
  - If it has a stable input/output contract.
  - If you want to observe/test it independently.
  - If multiple steps might reasonably call it.

- **Strategy**
  - If the op contract is stable but the algorithm should vary.
  - If the only difference is internal computation (same inputs/outputs).
  - If “which algorithm?” should be selectable by config rather than by imports.

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
- Export types (shared/public types live in the op module’s `types.ts` surface).
- Import op contracts (rules consume types only).
- Import step/recipe/engine code.

### 8) Step modeling and orchestration

Steps are **action boundaries**:
- They build inputs from runtime context.
- They call ops with validated config.
- They apply results and publish artifacts.

Steps are **not** planning units:
- Planning belongs to ops.

### 8.1) Map projections are first-class (observability + future consumers)

`artifact:map.*` is not “optional extra polish.” If a tile-indexed layer is reasonably useful for understanding, debugging, inspection tooling, or likely Gameplay reads later, it SHOULD exist under `artifact:map.*` as a projection/annotation layer.

Hard rules:
- Physics never consumes `artifact:map.*`.
- Do not model `artifact:map.*` as a “direct mirror” of physics truth by contract. It is derived independently in Gameplay projection steps from physics truth artifacts.

Examples (non-exhaustive): coasts, cliffs, mountains, volcanoes, plates, landmasses, features, resources, region slots/ids, etc.
- A step named “plan-*” is a modeling smell; rename it to reflect action (e.g., `plot-*`, `apply-*`, `publish-*`).

**Compile-first configuration rule (current architecture)**
- Any config canonicalization that would otherwise happen in `step.run` must be moved to:
  - schema defaults (via op strategy schemas and step schemas), and/or
  - `step.normalize` (compile-time), and/or
  - `strategy.normalize` / `op.normalize` (compile-time).

Recommended pattern inside `step.normalize` when the step is driven by op envelope configs:
- Bind compile/runtime op surfaces once via `domain.ops.bind({ ...contracts })`.
- Invoke `compile.<opKey>.normalize(config.<opKey>, ctx)` for each op envelope config used by the step.
- Apply any cross-op or knob-driven canonicalization in a shape-preserving way.

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
- **Truth/projection coupling** (Physics truth embedding engine ids/adapter coupling, or Physics requiring `artifact:map.*` / `effect:map.*` as inputs).
- **Shims / dual paths** (publishing multiple keys for the same guarantee; “just in case” compatibility paths).
- **Logic outside steps** (adapter/engine calls or effect verification performed anywhere other than a step).

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

---

## Appendix: Refactor checklist (ecology-ready)

Use this checklist when refactoring the ecology domain under the current architecture:

1) **Inventory** existing ecology behavior and classify:
   - engine/adapter/artifact I/O → step
   - deterministic computation over typed inputs + config → op/strategy/rule

2) **Define or confirm op contracts** (`defineOp`) and keep them stable:
   - pick `kind` (`plan`/`compute`/`score`/`select`) deliberately
   - keep input/output schemas independent of step/runtime

3) **Choose strategies only for algorithmic variants** (same I/O):
   - strategy selection lives in config (`config.strategy`)
   - strategy-specific schema lives in the op contract under `strategies`

4) **Move all canonicalization out of runtime**:
   - strategy-level config canonicalization → `strategy.normalize`
   - step-level composition/knob adjustments → `step.normalize`
   - runtime `step.run` and `strategy.run` do not default/clean/normalize configs

5) **Bind ops in steps using the domain router**:
   - build an `opContracts` object from `domain.contracts`
   - `const { compile, runtime } = domain.ops.bind(opContracts)`
   - use `compile.*.normalize` in `step.normalize`, `runtime.*.run` in `step.run`

6) **Keep rule boundaries clean**:
   - rules live under `ops/<op>/rules/**`
   - shared/public types live in `ops/<op>/types.ts` (rules import types, rules do not export types)
