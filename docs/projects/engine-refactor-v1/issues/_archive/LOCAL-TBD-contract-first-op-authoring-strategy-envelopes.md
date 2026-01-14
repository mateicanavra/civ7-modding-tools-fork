---
id: LOCAL-TBD-M7-U16
title: "[M7] Land converged contract-first op + step authoring (strategy envelopes + step binder)"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M7
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - ADR-ER1-031
  - ADR-ER1-033
  - ADR-ER1-036
  - SPEC-step-domain-operation-modules
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Implement the converged, contract-first op + step authoring model: operations use strategy-local `{ strategy, config }` envelopes with out-of-line `createStrategy` implementations, and steps become contract-first orchestration modules created via a bound `createStepFor<TContext>()` factory (no step↔op binding DSL, no recipe compilation refactor).

## Target outcome (canonical)
- **Ops are contract-first:** op IO + per-strategy config schemas live in `contract.ts`; strategies are implemented out-of-line and remain fully typed.
- **Strategy config is always envelope-shaped:** op config at the runtime boundary is always `{ strategy: "<id>", config: <innerConfig> }` (no alternate shapes).
- **Op types are centralized:** each op exports a single `OpTypeBag` from `types.ts`; rules import types from `types.ts` only and never export types themselves.
- **Steps are contract-first:** step contracts are metadata only; runtime behavior (`run`, optional `resolveConfig`) is attached via a factory, mirroring `defineOp` / `createOp`.
- **Step typing parity with ops:** step implementations use a bound factory `createStepFor<TContext>()` so `run`/`resolveConfig` have full context autocomplete without manual type imports.
- **No architectural churn:** Recipe v2 + step registry compilation remain as-is; only pass optional step `resolveConfig` through compilation so normalization still works.
- **No shims:** remove or replace any legacy authoring APIs/call paths rather than keeping compatibility exports.

## Out of scope (hard boundaries)
- No recipe/stage redesign (no v5/v7-style mechanical compilers, no stage views, no plan-schema layering).
- No step↔op binding DSL or “declared op graphs” in step/stage/recipe contracts.
- No ops-root directory reorg (ops remain nested: `mods/mod-swooper-maps/src/domain/<domain>/ops/**`).
- No legacy compatibility shims, dual paths, or “keep old exports around” fallbacks.

## References (canonical)
- `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-031-strategy-config-encoding.md`

## Deliverables
- [x] Sub-issue A: Implement op authoring surface in `packages/mapgen-core/src/authoring/op/**` (`defineOp`, `createStrategy`, `createOp`).
- [x] Sub-issue B: Implement step authoring surface in `packages/mapgen-core/src/authoring/step/**` (`defineStep`, `createStep`, `createStepFor<TContext>`), export from `packages/mapgen-core/src/authoring/index.ts`.
- [x] Sub-issue C: Wire step `resolveConfig` through recipe compilation and engine types (pass-through only; no compilation redesign).
- [x] Sub-issue D: Standardize mod path aliasing (`@mapgen/domain/*`) and use `@swooper/mapgen-core/authoring` as the step entrypoint (no mod-local binder).
- [x] Sub-issue E: Convert ops to canonical layout + envelope config, and update call sites (no compat exports).
- [x] Sub-issue F: Convert steps to contract-first modules + binder-based implementations (no binding DSL; steps remain structurally ignorant of ops/domains).
- [ ] Sub-issue G: Replace shared helper clones with core SDK imports and add missing broadly-useful helpers to `@swooper/mapgen-core`.
- [x] Sub-issue H: Update tests and add guardrails so legacy authoring paths cannot reappear.

## Acceptance Criteria
- **Architecture enforcement**
  - [x] For every op, config at the runtime boundary is always `{ strategy: "<id>", config: <innerConfig> }` (no alternate shapes).
  - [x] Each op contract owns IO schemas and all per-strategy config schemas; strategy implementations are typed by the contract (no type widening to `any`).
  - [x] Steps remain contract-first orchestration modules (no op graphs/bindings):
    - [x] Contract is metadata-only and exported independently of implementation.
    - [x] Implementation is created via `createStep` (defaults to `ExtendedMapContext`) or a bound `createStepFor<TContext>()` when needed; `resolveConfig` (when present) lives only in the implementation.
    - [x] Step schemas remain mandatory and enforced by authoring helpers.
    - [x] Recipe compilation forwards optional step `resolveConfig` so normalization still works end-to-end.
  - [x] Strategy selection remains op-local; steps do not centrally choose strategies beyond supplying the envelope value.
- **No legacy fallbacks**
  - [x] No “compat” exports remain for previous op/step authoring APIs; all call sites are updated to the new factories.
  - [x] No deep relative imports into core packages exist (no `../../../../packages/...` or `../../../../../authoring/...` patterns crossing package boundaries).

## Testing / Verification
- [x] `pnpm check`
- [x] `pnpm test`
- [x] `pnpm lint`
- [ ] Manually sanity-check at least one multi-strategy op + orchestration step pair (vegetation example) compiles and validates configs at the boundary.

## Dependencies / Notes
- Canonical architecture (source of truth): `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`
- This issue intentionally replaces any earlier “envelope config hard-path” approaches for op authoring; do not preserve alternate authoring APIs as fallbacks.
- Review follow-ups tracked in `docs/projects/engine-refactor-v1/reviews/REVIEW-M7.md`.
- Key touchpoints:
  - `packages/mapgen-core/src/authoring/op/**`
  - `packages/mapgen-core/src/authoring/step/**`
  - `packages/mapgen-core/src/authoring/recipe.ts`
  - `packages/mapgen-core/src/engine/types.ts`
  - `packages/mapgen-core/src/engine/execution-plan.ts`
  - mod ops + step call sites under `mods/mod-swooper-maps/src/**`
- Critical wiring edge: `createRecipe` currently maps `schema -> configSchema`; it must also forward step `resolveConfig` (pass-through only).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

This section is written for implementers (human or agent). It assumes the converged architecture doc is locked and exists only to translate it into a complete, sequenced, “no ambiguity / no shims” implementation plan.

### Quick Navigation
- [Implementation Decisions (locked)](#implementation-decisions-locked)
- [Implementation Plan (sub-issues)](#implementation-plan-sub-issues)
- [Pre-work Findings / Research](#pre-work-findings--research)

## Implementation Decisions (locked)

### D1) Op config is always an envelope
- **Decision:** the runtime config shape for any op is always `{ strategy: "<id>", config: <inner> }`.
- **Non-negotiable:** do not accept “flat” config or strategy hidden behind implicit defaults at the boundary.

### D2) Step contracts are metadata-only; implementation is factory-attached
- **Decision:** `defineStep(...)` returns metadata only (`id`, `phase`, `requires`, `provides`, `schema`).
- **Decision:** `createStep(contract, { resolveConfig?, run })` attaches behavior; the contract file contains no runtime code.

### D3) `createStep` defaults to `ExtendedMapContext`
- **Decision:** step implementations use `createStep` from `@swooper/mapgen-core/authoring`, which defaults to `ExtendedMapContext` for rich typing without local binders.
- **Decision:** `createStepFor<TContext>()` remains available only for non-standard contexts.

### D4) No recipe compilation refactor
- **Decision:** recipe v2 + step registry compilation stay as-is; only add step `resolveConfig` pass-through.
- **Non-goal:** no mechanical plan compilers, no stage views, no schema layering (no `planSchema` vs `configSchema`).

### D5) No legacy shims
- **Decision:** remove or replace superseded authoring APIs and call paths; do not keep compatibility exports or “legacy mode” behavior.

### D6) Import hygiene is a hard rule
- **Decision:** cross-module imports must use package imports / stable aliases (no deep relative path churn across modules/packages).
- **Decision:** shared helpers come from `@swooper/mapgen-core` when available; if broadly useful and missing, add to the core SDK.
- **Decision:** contract/step schemas import `Type`/`Static` from `@swooper/mapgen-core/authoring` (not from `typebox` directly).

### D7) Step schemas compose op envelope schemas directly
- **Decision:** when a step config needs an op config, it embeds the op’s envelope schema directly (e.g., `trees: ecology.ops.planTreeVegetation.config`) and uses `op.defaultConfig` for defaults.
- **Non-goal:** do not duplicate strategy unions or per-strategy schemas at the step level.

### D8) Op module type + rules boundaries are strict
- **Decision:** each op has `types.ts` exporting a single `OpTypeBag` (and optional extra type-only helpers).
- **Decision:** `rules/**` files import types from `../types.js` only (type-only) and never import from `../contract.js` or export types.

## Implementation Plan (sub-issues)

Implement as a Graphite stack with one logical change per branch (A → H). Do not mix migrations with authoring-surface changes; keep each layer reviewable.

### Sub-issue A) Land contract-first op authoring (`defineOp` / `createStrategy` / `createOp`)
**In scope**
- Implement the canonical op authoring surface in `packages/mapgen-core/src/authoring/op/**` exactly as described in `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`.
- Ensure `createOp(...)` derives (and exports) the envelope config schema and defaults in a compile-time-available way.
- Add the `OpTypeBag` helper type in the authoring package and export it from `packages/mapgen-core/src/authoring/index.ts`.

**Out of scope**
- Refactoring any mod ops under `mods/mod-swooper-maps` (handled in Sub-issue E).

**Files**
- Add/modify:
  - `packages/mapgen-core/src/authoring/op/contract.ts`
  - `packages/mapgen-core/src/authoring/op/strategy.ts`
  - `packages/mapgen-core/src/authoring/op/create.ts`
  - `packages/mapgen-core/src/authoring/op/index.ts`
  - `packages/mapgen-core/src/authoring/index.ts`
- Delete/replace any legacy op authoring modules that provide alternative shapes.

**Acceptance Criteria**
- `createStrategy(...)` implementations authored out-of-line preserve full type inference from the op contract (no `any` leaks).
- `op.config` and `op.defaultConfig` are envelope-shaped and compile-time available.
- There is exactly one op authoring path in the codebase (no dual APIs or compat exports).

### Sub-issue B) Land contract-first step authoring (`defineStep` / `createStep` / `createStepFor<TContext>`)
**In scope**
- Implement `defineStep(...)` (metadata only) and `createStep(contract, impl)` that attaches `run` + optional `resolveConfig`.
- Implement `createStepFor<TContext>()` binder and require it for step implementations (DX parity with ops).
- Export from `packages/mapgen-core/src/authoring/index.ts`.

**Files**
- Add/modify:
  - `packages/mapgen-core/src/authoring/step/contract.ts`
  - `packages/mapgen-core/src/authoring/step/create.ts`
  - `packages/mapgen-core/src/authoring/step/index.ts`
  - `packages/mapgen-core/src/authoring/index.ts`
- Delete/replace any legacy step authoring modules that conflate contract + implementation.

**Acceptance Criteria**
- Step contract does not accept runtime functions.
- `createStepFor<TContext>()` restores contextual typing for `run(ctx, config)` and `resolveConfig(config, ctx)` without extra generics in call sites.
- There is exactly one step authoring path in the codebase (no dual APIs or compat exports).

### Sub-issue C) Wire step `resolveConfig` through recipe compilation (pass-through only)
**In scope**
- Update recipe compilation to carry the optional step `resolveConfig` through to the runtime `MapGenStep` object.
- Ensure engine normalization continues to call step-level `resolveConfig` when present.

**Files**
- Modify:
  - `packages/mapgen-core/src/authoring/recipe.ts`
  - `packages/mapgen-core/src/engine/types.ts`
  - `packages/mapgen-core/src/engine/execution-plan.ts`

**Out of scope**
- Any change to recipe v2 semantics beyond adding the pass-through property.

**Acceptance Criteria**
- Compiled steps still expose `configSchema` and `run`, and now also preserve `resolveConfig` when provided.
- No “dual” pipeline exists: there is a single compilation path and a single runtime step shape.

### Sub-issue D) Standardize mod aliasing + step authoring entrypoint
**In scope**
- Add stable path aliasing for cross-module imports:
  - `@mapgen/domain/*` → `mods/mod-swooper-maps/src/domain/*`
- Update step implementations to import `createStep` from `@swooper/mapgen-core/authoring` (no mod-local authoring aliasing).

**Files**
- Modify:
  - `mods/mod-swooper-maps/tsconfig.json` (or nearest tsconfig governing the mod build)

**Acceptance Criteria**
- `createStep` defaults to `ExtendedMapContext` in the authoring SDK, so step implementations import directly from `@swooper/mapgen-core/authoring`.
- Cross-module imports in the mod use aliases or package imports (no brittle `../../..` traversals across the domain/recipe tree).

### Sub-issue E) Convert ops to canonical layout + envelope config (no compat exports)
**In scope**
- Convert existing ops under `mods/mod-swooper-maps/src/domain/<domain>/ops/**` to the canonical layout:
  - `contract.ts` owns IO + per-strategy config schemas
  - `types.ts` exports a single `OpTypeBag` (plus optional type-only helpers)
  - `rules/index.ts` barrels rule helpers; `rules/**` never export types
  - `strategies/index.ts` barrels strategies; `strategies/<id>.ts` implement out-of-line behavior via `createStrategy`
  - `index.ts` exports the created op via `createOp` and re-exports `*` from `contract.ts` + `type *` from `types.ts`
- Update all importers to the new module locations and exports; do not keep compatibility barrel modules.

**Acceptance Criteria**
- Each converted op exports a single implemented op from `index.ts`.
- Strategy selection and normalization happen through the op (`op.resolveConfig`, `op.runValidated`), not via step-specific widening layers.
- No compat exports exist and all call sites are updated.

### Sub-issue F) Convert steps to contract-first modules + binder-based implementations
**In scope**
- Convert steps to the canonical layout:
  - `contract.ts`: metadata-only `defineStep(...)`
  - `index.ts`: `export default createStep(contract, { resolveConfig?, run })`
  - `lib/**`: local helpers with no registry awareness
- Ensure step code remains orchestration/action oriented and uses domain ops as functions.

**Acceptance Criteria**
- Steps do not declare op graphs or op bindings in their contracts.
- Step schemas reuse `op.config` and `op.defaultConfig` where they need op configs (no duplicated unions or per-strategy schema copies in step contracts).
- Steps call ops via `runValidated` with already-normalized configs.
- Step modules import authoring via `@swooper/mapgen-core/authoring` (no deep-relative imports).

### Sub-issue G) Replace shared helper clones with core SDK imports
**In scope**
- Audit ops/steps for duplicated generic utilities (math/noise/RNG/grid).
- Replace local clones with imports from `@swooper/mapgen-core` where functions already exist.
- If a helper is broadly useful but missing, add it to the core SDK and import it from there (no new local “utils” proliferation).

**Acceptance Criteria**
- Shared helpers are imported from the core SDK; local helpers remain only when truly local.

### Sub-issue H) Tests + guardrails: prevent regressions into legacy authoring
**In scope**
- Update tests and call sites to use the new authoring surfaces.
- Add at least one focused test (or type-level harness) that proves:
  - `createStrategy` out-of-line typing remains correct (smoke),
  - step binder typing works (compile-time via `pnpm check`),
  - step `resolveConfig` pass-through is invoked when present.
- Add lint guardrails so:
  - `rules/**` never import from `../contract.js`,
  - `rules/**` never export types,
  - `Type`/`Static` are imported from `@swooper/mapgen-core/authoring` in contracts/steps.

**Acceptance Criteria**
- Repo compiles with the new authoring surface and migrated call sites.
- There is no remaining legacy authoring path required to run the engine.

## Pre-work Findings / Research

### Dependency chain + integration edges (must be touched)
- `packages/mapgen-core/src/authoring/op/**`: new canonical op authoring surface.
- `packages/mapgen-core/src/authoring/step/**`: new canonical step authoring surface.
- `packages/mapgen-core/src/authoring/recipe.ts`: must forward step `resolveConfig` (pass-through).
- `packages/mapgen-core/src/engine/types.ts`: `MapGenStep` includes `configSchema` and optional `resolveConfig`.
- `packages/mapgen-core/src/engine/execution-plan.ts`: uses `configSchema` and optional `resolveConfig` for normalization.
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`: executes `run` using normalized config.

### High-signal searches for implementers
- Find existing step authoring entrypoints: `rg -n "createStep\\b|defineStep\\b|StepContract\\b" packages/mapgen-core/src/authoring`
- Find recipe compilation touchpoints: `rg -n "createRecipe\\b|configSchema\\b|resolveConfig\\b" packages/mapgen-core/src/authoring packages/mapgen-core/src/engine`
- Find op authoring call sites: `rg -n "createOp\\b|defineOp\\b|createStrategy\\b" mods/mod-swooper-maps/src`

### Hard guardrails (required before marking the issue done)
- No deep relative imports into core authoring:
  - `rg -n "\\.{2}/\\.{2}/\\.{2}/\\.{2}/\\.{2}/authoring" mods/mod-swooper-maps/src || true`
  - `rg -n "packages/mapgen-core/src/authoring" mods/mod-swooper-maps/src || true`
- No rule modules exporting types or importing contracts:
  - `rg -n "rules/.+export type" mods/mod-swooper-maps/src || true`
  - `rg -n "rules/.+contract\\.js" mods/mod-swooper-maps/src || true`
- No legacy op authoring call sites using the old shape:
  - `rg -n "createOp\\(\\{" mods/mod-swooper-maps/src packages/mapgen-core/src || true`
