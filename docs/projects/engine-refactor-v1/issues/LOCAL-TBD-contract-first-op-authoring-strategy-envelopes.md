---
id: LOCAL-TBD
title: "Adopt contract-first op authoring + strategy envelope config"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: null
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Implement the converged, contract-first op + step authoring model: ops use strategy-local `{ strategy, config }` envelopes and out-of-line `createStrategy` implementations, and steps remain contract-first orchestration modules wired through recipe compilation (no structural op graphs).

## Deliverables
- [ ] Land contract-first op authoring surface in `packages/mapgen-core/src/authoring/op/`:
  - [ ] `defineOpContract(...)` for IO + per-strategy config schema ownership.
  - [ ] `createStrategy(contract, id, impl)` for out-of-line, contract-typed strategy implementations.
  - [ ] `createOp(contract, { strategies, customValidate? })` that derives:
    - [ ] `op.config` as the union of `{ strategy: Literal(id), config: <innerSchema> }` over strategies.
    - [ ] `op.defaultConfig` from `strategies.default` defaults as `{ strategy: "default", config: <defaulted inner config> }`.
    - [ ] `op.resolveConfig(envelope, settings)` as a dispatcher over per-strategy `resolveConfig`.
    - [ ] `op.runValidated(input, envelope)` that validates values and calls the selected strategy `run`.
- [ ] Land contract-first step authoring surface in `packages/mapgen-core/src/authoring/step/` and export it from `packages/mapgen-core/src/authoring/index.ts`:
  - [ ] `defineStepContract(...)` for contract metadata only (`id`, `phase`, `requires`, `provides`, `schema`).
  - [ ] `createStep(contract, { resolveConfig?, run })` + `createStepFor<TContext>()` to bind context typing and compose `contract + impl`.
- [ ] Wire step-level `resolveConfig` through recipe compilation (per draft):
  - [ ] Update `packages/mapgen-core/src/authoring/recipe.ts` to forward `resolveConfig` into `MapGenStep`.
  - [ ] Ensure `packages/mapgen-core/src/engine/types.ts` supports optional `resolveConfig` and `packages/mapgen-core/src/engine/execution-plan.ts` continues to invoke it for normalization.
- [ ] Standardize the canonical op/domain module layout (per draft):
  - [ ] `mods/mod-swooper-maps/src/domain/<domain>/index.ts` exports the domain module surface.
  - [ ] `mods/mod-swooper-maps/src/domain/ops/<domain>/index.ts` exports all ops for that domain.
  - [ ] Each op lives at `mods/mod-swooper-maps/src/domain/ops/<domain>/<op-slug>/{contract.ts,rules/**,strategies/**,index.ts}` and exports an implemented op.
- [ ] Standardize the canonical step module layout (per draft):
  - [ ] `mods/mod-swooper-maps/src/recipes/<recipe>/stages/<stage>/steps/<step-slug>/contract.ts` exports the contract.
  - [ ] `mods/mod-swooper-maps/src/recipes/<recipe>/stages/<stage>/steps/<step-slug>/index.ts` exports the implementation using the bound factory.
  - [ ] `mods/mod-swooper-maps/src/recipes/<recipe>/stages/<stage>/steps/<step-slug>/lib/**` holds local helpers.
  - [ ] Add `mods/mod-swooper-maps/src/authoring/steps.ts` exporting `createStepFor<ExtendedMapContext>()` as `createStep` (the only entrypoint for step implementations).
- [ ] Add/standardize path aliasing (per draft):
  - [ ] `@mapgen/domain/*` → `mods/mod-swooper-maps/src/domain/*`
  - [ ] `@mapgen/ops/*` → `mods/mod-swooper-maps/src/domain/ops/*`
- [ ] Convert existing ops and step schemas to the converged shape:
  - [ ] Move op IO + per-strategy config schemas into `contract.ts`.
  - [ ] Move per-strategy behavior into `strategies/<id>.ts`.
  - [ ] Move helpers into `rules/*.ts`.
  - [ ] Update step schemas to reuse `op.config` / `op.defaultConfig` without declaring bindings/graphs.
- [ ] Move shared helper clones (math/noise/RNG/grid utilities, etc.) into the core SDK and import from `@swooper/mapgen-core`.
- [ ] Update tests and call sites:
  - [ ] Migrate any legacy `createOp({ ... })` authoring/call-site patterns to `createOp(contract, { strategies })`.
  - [ ] Ensure any direct config normalization uses `op.resolveConfig(...)` (strategy-local), not step-owned widening.
- [ ] Validate with an end-to-end reference example (ecology vegetation multi-op orchestration) proving:
  - [ ] Out-of-line strategies keep full type inference.
  - [ ] Steps orchestrate via function calls + validated values.
  - [ ] Strategy selection remains local to each op via the `{ strategy, config }` envelope.

## Acceptance Criteria
- [ ] For every op, the plan-truth config shape at the runtime boundary is always `{ strategy: "<id>", config: <innerConfig> }` (no alternate shapes).
- [ ] Each op contract owns IO schemas and all per-strategy config schemas; strategy implementations are typed by the contract.
- [ ] Steps remain contract-first orchestration modules (no op graphs/bindings):
  - [ ] Step contract is metadata-only and exported independently of implementation.
  - [ ] Step implementation is created via a bound `createStepFor<TContext>()` factory; `resolveConfig` (when present) lives only in the implementation.
  - [ ] Step schemas remain mandatory and enforced by authoring helpers.
  - [ ] Recipe compilation forwards optional step `resolveConfig` so normalization still works end-to-end.
- [ ] Strategy selection remains op-local; steps do not centrally choose strategies beyond supplying the envelope value.
- [ ] Repo compiles with the new authoring surface and converted call sites; no remaining legacy authoring paths are required for the target architecture.

## Testing / Verification
- `pnpm check`
- `pnpm test`
- `pnpm lint`
- Manually sanity-check at least one multi-strategy op + orchestration step pair (see draft’s vegetation example) compiles and validates configs at the boundary.

## Dependencies / Notes
- Source draft (authoritative): `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`
- This converged shape appears aligned with existing “hard path / envelope config” work in `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M7-U14-hard-path-strategy-centric-op-config-envelope.md`; confirm whether this issue is a standalone slice or should be merged/treated as a refinement of that effort.
- Touchpoints called out in the draft include `packages/mapgen-core/src/authoring/step/*`, `packages/mapgen-core/src/authoring/recipe.ts`, `packages/mapgen-core/src/engine/types.ts`, `packages/mapgen-core/src/engine/execution-plan.ts`, and step/recipe call sites.
- Integration edge (draft): `createRecipe` currently maps `schema -> configSchema` but drops step `resolveConfig`; this must be wired through to preserve step-level normalization.
- Open questions carried from the draft:
  - Step config: pass op envelopes directly vs map from step-specific shapes.
  - For each op: ensure the strategy set is stable and per-strategy config schemas are minimal.
  - Ensure op boundaries remain focused (avoid monolithic ops).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Approach / Design Notes
- **Problem framing (from draft):**
  - Operation authoring needs contract-first structure so strategy implementations can be authored out of line with full type inference.
  - Steps must remain simple contracts that orchestrate ops without owning or declaring op graphs.
  - The step↔op bridge should be validated function calls (not structural coupling/mechanical compilation).
- **Design goals (from draft):**
  - Contract-first and declarative.
  - Compile-time availability for schemas/config shapes/defaults.
  - Domain/recipe separation: steps do not own or expose op bindings; ops remain pure functions.
  - Strategy selection stays a local op detail using `{ strategy, config }`.

### Canonical Model (from draft)
- **Operation**
  - Pure domain capability: `run(input, config) -> output`.
  - Contract owns IO schemas and per-strategy config schemas.
  - Strategies are attached via `createStrategy`.
  - Runtime op is produced by `createOp(contract, { strategies })` and derives:
    - `op.config` (union over strategy envelopes)
    - `op.defaultConfig` (from default strategy schema)
    - `op.resolveConfig` (per-strategy resolver hook; compile-time oriented)
- **Step**
  - Contract is metadata only: `id`, `phase`, `requires`, `provides`, `schema`.
  - Implementation is attached via a bound factory `createStepFor<TContext>()`, producing `createStep(contract, { resolveConfig?, run })`.
  - `resolveConfig` is implementation-only; the contract file never contains runtime code.
- **Bridge**
  - Steps build op inputs, resolve config with `op.resolveConfig`, and call `op.runValidated`.
  - Recipe v2 and step registry compilation stay unchanged; the only wiring change is carrying step `resolveConfig` through compilation.

### Conceptual model (from draft)
- **Ops** are planning/analysis units defined by contracts; **strategies** are algorithmic variants with the same IO contract.
- **Rules** are small policy/decision helpers composed inside strategies.
- **Steps** are action boundaries that orchestrate ops and publish artifacts; **stages** are orchestration/grouping only.

### Canonical file layouts (from draft)

Ops/domains:
```
mods/mod-swooper-maps/src/domain/
  <domain>/
    index.ts
  ops/
    <domain>/
      index.ts
      <op-slug>/
        contract.ts
        rules/
          <rule>.ts
        strategies/
          default.ts
        <strategy>.ts
        index.ts
```

Steps:
```
mods/mod-swooper-maps/src/recipes/<recipe>/stages/<stage>/steps/
  <step-slug>/
    contract.ts
    index.ts
    lib/
      <helper>.ts
```

Bound step factories:
```
mods/mod-swooper-maps/src/authoring/
  steps.ts
```

### Canonical authoring surface (from draft)
- Draft provides concrete target code for:
  - `packages/mapgen-core/src/authoring/op/contract.ts`
  - `packages/mapgen-core/src/authoring/op/strategy.ts`
  - `packages/mapgen-core/src/authoring/op/create.ts`
  - `packages/mapgen-core/src/authoring/op/index.ts`
  - `packages/mapgen-core/src/authoring/index.ts`
- Draft also defines the step authoring surface:
  - `packages/mapgen-core/src/authoring/step/contract.ts`
  - `packages/mapgen-core/src/authoring/step/create.ts`
  - `packages/mapgen-core/src/authoring/step/index.ts` (or re-exports via `authoring/index.ts`)
- Keep the draft as the canonical reference for the exact code shapes/snippets:
  - `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`

### End-to-end example reference (from draft)
- Ecology vegetation planning orchestrates two focused ops:
  - `planTreeVegetation` (`default`, `clustered`)
  - `planShrubVegetation` (`default`, `arid`)
- A single step owns its schema, validates config, resolves strategy-specific settings, and publishes a combined plan.

### Implementation Plan (from draft)
- **Mechanical work**
  1. Add contract-first op authoring files and exports in `packages/mapgen-core/src/authoring/op/**` and `packages/mapgen-core/src/authoring/index.ts`.
  2. Add contract-first step authoring files and exports in `packages/mapgen-core/src/authoring/step/**` and `packages/mapgen-core/src/authoring/index.ts`.
  3. Pass through step `resolveConfig` during recipe compilation (wire `authoring/recipe.ts` → `MapGenStep`).
  4. Convert each op module to the canonical layout (contract/rules/strategies/index).
  5. Update step modules to the contract-first layout (contract file + bound `createStep` implementation + `lib/**`).
  6. Update step schema defaults to reference `op.defaultConfig` and `op.config` from implemented ops.
  7. Add the `@mapgen/ops/*` path alias and standardize cross-module imports to use aliases (keep intra-op/step imports relative).
  8. Move any shared helper clones into the core SDK and import them from `@swooper/mapgen-core`.
  9. Update op validation tests and any direct `createOp({ ... })` usages to `createOp(contract, { strategies })`.
- **Thinky work**
  1. For each op, confirm strategy set is stable and config schemas are minimal.
  2. Ensure op boundaries stay focused (avoid monolithic ops mixing unrelated concerns).
  3. Decide whether step config should pass op envelopes directly or map from step-specific shapes.
  4. Confirm whether step config should always be `Static<typeof schema>` or whether any steps require a looser config type.

### Dependency chain + integration edges (from draft)
- Dependency chain and touchpoints:
  - `packages/mapgen-core/src/authoring/step/contract.ts`: new contract-only metadata builder.
  - `packages/mapgen-core/src/authoring/step/create.ts`: composes `contract + impl` and enforces schema presence.
  - `packages/mapgen-core/src/authoring/index.ts`: export surface for `defineStepContract`.
  - `packages/mapgen-core/src/authoring/step.ts`: superseded by `authoring/step/create.ts` and should be removed or re-exported.
  - `packages/mapgen-core/src/authoring/stage.ts`: still asserts `schema` on created steps.
  - `packages/mapgen-core/src/authoring/recipe.ts`: forwards `schema -> configSchema` and must also forward `resolveConfig`.
  - `packages/mapgen-core/src/engine/types.ts`: `MapGenStep` includes `configSchema` and optional `resolveConfig`.
  - `packages/mapgen-core/src/engine/execution-plan.ts`: uses `configSchema` and optional `resolveConfig` for normalization.
  - `packages/mapgen-core/src/engine/PipelineExecutor.ts`: executes `run` using normalized config.
  - Tests and example recipes: update to `defineStepContract` + bound `createStep` from `createStepFor<ExtendedMapContext>()`.
- Integration edges:
  - `createRecipe` currently maps `schema -> configSchema` and drops `resolveConfig`; this must be wired through to preserve step-level config normalization.
  - `engine/execution-plan.ts` already treats `resolveConfig` as optional and only invokes it when `configSchema` exists, so the contract schema must remain mandatory.
  - `createStage` and `createStep` should continue to reject missing schemas, ensuring compile-time safety and consistent defaults.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
