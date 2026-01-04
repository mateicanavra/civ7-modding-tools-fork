---
id: LOCAL-TBD-M7-U14
title: "[M7] Hard path: strategy-centric ops + uniform envelope op config"
state: planned
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: M7
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - SPEC-step-domain-operation-modules
  - ADR-ER1-034
---

## TL;DR
U14 is the repo-wide cutover to a strict “hard path” op authoring + plan-truth config model:
- Ops are strategy-centric: `run` lives on the strategy.
- Plan-truth op config is always the same envelope: `{ strategy: "<id>", config: <innerConfig> }` for every op.
- No shorthand and no optional discriminator behavior; `strategy` is always present.
- Single-strategy ops use stable strategy id `"default"`.
- Resolution is strategy-level: `resolveConfig(innerConfig, settings) -> innerConfig`.

---

## Scope (above the fold)
U14 is the full cutover + repo alignment slice. After U14, there is one authoring shape, one plan-truth config shape, and no legacy compatibility paths remaining inside the authoring SDK.

### Deliverables (done means…)
- `createOp` supports exactly one authoring shape: **strategies required** (minimum: `strategies.default`).
- The op-level config contract is always the **envelope union** derived from strategies:
  - `op.config` schema validates the envelope union.
  - `op.defaultConfig` is always `{ strategy: "default", config: <defaulted inner config> }`.
  - `op.run` / `op.runValidated` accept and validate the envelope (never inner config).
- Repo-wide call sites are aligned:
  - Every op authoring module uses `strategies` (single-strategy ops become `strategies: { default: … }`).
  - All step schemas, presets/maps, fixtures/tests author op configs as the envelope.
  - Any code that previously assumed “inner config at runtime boundary” is updated to unwrap explicitly.
- Guardrails are authoritative and green:
  - `pnpm lint:domain-refactor-guardrails` fails on legacy authoring shapes and non-envelope configs.
  - `pnpm check`, `pnpm test`, `pnpm build`, `pnpm deploy:mods` are green.

### Explicit non-goals (U14 does not do these)
- Redesign what “strategy” means beyond enforcing that config + run live on strategy.
- Add new authoring sugar (`defineStrategies(...)`, factories over POJOs, etc.).
- Restructure domain directories or operation decomposition (that work is tracked elsewhere).

In-scope:
- Authoring SDK:
  - `createOp` contract and inference (strategy-centric only; single config shape at runtime boundary).
  - Strategy definition surface (`OpStrategy`, `StrategySelection`, `resolveConfig` placement).
  - `DomainOp` types so config is always the envelope union.
- Repo-wide callsite alignment:
  - Every op authoring module migrates to strategies (`strategies: { default: ... }` at minimum).
  - All step schemas, presets/maps, fixtures/tests migrate to the envelope config shape.
  - Any helper logic that assumed “inner config” at the runtime boundary is updated to explicitly unwrap `config.config`.
- Guardrails:
  - `scripts/lint/lint-domain-refactor-guardrails.sh` becomes the canonical gate for “no legacy authoring shapes / no non-envelope configs”.

---

## Context / starting point
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools-mapgen-domain-config`
- Branch: `chore/mapgen-domain-config-barrel`
- This branch is intentionally dirty. Do not reset/revert/stash as part of this issue.

---

## Prerequisites
- **LOCAL-TBD-M7-U13** is merged.

---

## Locked hard-path rules (non-negotiable)
These are architecture decisions for this migration. Do not introduce dual paths to “ease” the cutover.

### H1) Strategy-centric ops only
- The only way to define op behavior is via strategies.
- The strategy is the unit that contains:
  - `id: string` (required; stable)
  - `config: TSchema` (strategy-specific config schema; “inner config”)
  - `resolveConfig?: (innerConfig, settings) => innerConfig` (optional; compile-time only)
  - `run: (input, innerConfig) => output`
- No top-level op `run` authored by the op module (runtime op surface may still expose `op.run`, but it must dispatch to the selected strategy’s `run`).

### H2) Plan-truth op config is always an envelope
For every operation, the config shape used by:
- step schemas,
- plan compilation,
- step `run` calls to ops,
- and tests/presets,

is always:
```ts
{ strategy: "<id>", config: <innerConfig> }
```

Hard prohibitions:
- No `{ config: ... }` shorthand.
- No omitted `strategy`.
- No “optional discriminator for default strategy” behavior.

### H3) Stable strategy IDs
- Single-strategy ops use strategy id `"default"`.
- Multi-strategy ops must explicitly provide IDs for each strategy (no implicit ids).

### H4) Resolution is strategy-level, schema-preserving
- Resolution/normalization occurs on `innerConfig` only:
  - `strategy.resolveConfig(innerConfig, settings) -> innerConfig` (must return a schema-valid config).
- Resolution is compile-time only (invoked by step resolveConfig composition).
- No plan-stored internal-only fields; no widening to unknown bags.

### H5) Hard cutover, no backwards compatibility inside scope
This migration is intended to reduce noise and ambiguity:
- remove old `createOp` authoring forms instead of keeping them around,
- remove any “compat” helper shapes that accept non-envelope configs.

---

## Current reality (pre-migration)

### `createOp` shapes that currently exist (must be removed in U14)
Implementation: `packages/mapgen-core/src/authoring/op/create.ts`

1) Non-strategy authoring:
- `{ input, config, output, run }`

2) Schema overload authoring:
- `{ schema, run }`

3) Strategy authoring:
- `{ input, output, strategies, defaultStrategy? }`

### `{ schema }` authoring (legacy; remove in U14)
`{ schema }` is a legacy authoring convenience from the “op owns config schema” era: it bundles `{ input, config, output }` into one TypeBox object so `createOp` can unpack `schema.properties.*`.

Under the hard-path model, **the config schema lives inside each strategy** and `createOp` derives the envelope union. That means `{ schema }` no longer maps cleanly to the authoring model (there is no single authored `config` schema to bundle).

U14 decision:
- Remove `{ schema }` authoring as part of the hard cutover.

### Current “optional strategy discriminator” behavior (why it’s a problem)
The current strategy path synthesizes an op-level config union and attempts to be ergonomic by making the discriminator optional for the default strategy case.
Consequences:
- Multiple runtime config shapes exist (`{ config: ... }` and `{ strategy, config }`) depending on defaults.
- Type relationships become conditional and hard to reason about (especially when composing step configs that include multiple ops).
- The wrapper logic falls back to `cfg?.config ?? {}` which undermines “plan-truth config is fully defaulted + validated”. 

### Repo scale (this branch, current scan)
- `createOp(...)` call sites: **29** (`rg -n "\\bcreateOp\\(" -S . | wc -l`)
- `.defaultConfig` call sites: **17** (`rg -n "\\.defaultConfig\\b" -S mods/mod-swooper-maps packages/mapgen-core | wc -l`)
- Step schemas referencing `ops.*.config` in `mods/mod-swooper-maps/src/recipes`: **8** (`rg -n "\\.ops\\.[A-Za-z0-9_]+\\.config\\b" mods/mod-swooper-maps/src/recipes | wc -l`)
- Strategy authoring call sites: **0** (`rg -n "strategies:\\s*\\{" -S mods/mod-swooper-maps packages/mapgen-core | wc -l`)

---

## Implementation details (single committed plan)
This is a hard cutover. Implement in the order below; do not introduce compatibility layers.

### A) Authoring SDK: enforce strategy-centric + uniform envelope (Complex)
**Files to touch**
- `packages/mapgen-core/src/authoring/op/create.ts`
- `packages/mapgen-core/src/authoring/op/types.ts`
- `packages/mapgen-core/src/authoring/op/strategy.ts`
- Authoring SDK tests (update as needed to match the new single authoring shape):
  - `packages/mapgen-core/test/**`

**Work**
1) Change `createOp` so the only supported authoring shape is “strategies required”.
   - Remove/disable:
     - `{ input, config, output, run }`
     - `{ schema, run }`
   - Required authoring shape:
     - `{ input, output, strategies: { ... }, defaultStrategy: "default" }`

2) Op config schema derivation:
   - Build the op-level `config` schema as a union of:
     - `{ strategy: Literal(id), config: <strategyConfigSchema> }`
   - Set `defaultConfig` to:
     - `{ strategy: <defaultId>, config: <defaultedInnerConfig> }`
   - Delete the “optional discriminator” behavior entirely.

3) Runtime `op.run(input, cfg)`:
   - Select strategy based strictly on `cfg.strategy` (required).
   - Call strategy `run(input, cfg.config)` (no `cfg?.config ?? {}` fallback).

4) Resolution plumbing:
   - Move the canonical resolve hook to the strategy surface:
     - `resolveConfig?: (innerConfig, settings) => innerConfig`
   - Op-level resolve (if it continues to exist as a surface for step composition) must:
     - unwrap envelope -> call selected strategy resolve -> rewrap envelope.

5) Types:
   - Update `DomainOp` to model op config as the envelope union for all ops.
   - Remove conditional “Strategies optional” typing; it is no longer a special case.

**Why this is complex**
- Core API surface + schema derivation changes.
- TS inference changes can surface surprising errors in unrelated ops/steps.
- Must ensure plan compilation + step schema defaulting still behave correctly with the new envelope shape.

**Acceptance criteria**
- No `createOp` call site can compile unless it provides strategies.
- `op.config` is always the envelope schema.
- `op.defaultConfig` is always `{ strategy, config }`.
- `op.runValidated` validates the envelope, not an inner config.

---

### B) Convert all existing ops to “single default strategy” (Bulk)
**Files**
- Every `createOp(...)` call site in:
  - `mods/mod-swooper-maps/**`
  - `packages/mapgen-core/test/**`

**Mechanical transformation**
- Old:
  - `createOp({ input, config, output, run, ... })`
  - `createOp({ schema, run, ... })`
- New:
```ts
createOp({
  // (still op-level)
  id,
  kind,
  input,
  output,

  // required now
  strategies: {
    default: {
      config: <oldConfigSchema>,
      run: <oldRun>,
      // optional: resolveConfig: <oldResolveInnerConfig> (if needed)
    },
  },
  defaultStrategy: "default",
});
```

**Notes**
- This is intentionally repetitive and low-judgment.
- Do not try to rename strategy ids in ad hoc ways; use `"default"` unless/until the op truly needs multiple strategies.

**Acceptance criteria**
- `rg -n "\\bcreateOp\\(" -S` shows only the strategy-centric authoring shape.

---

### C) Update steps + step config schemas to accept envelope configs (Bulk, with localized thought)
**Files (examples)**
- `mods/mod-swooper-maps/src/recipes/**/steps/**/index.ts`

**Work**
1) Step schema updates:
   - Anywhere a step schema includes `domain.ops.someOp.config`, it now expects the envelope.
   - Defaults should use `domain.ops.someOp.defaultConfig` (also envelope).

2) Step `run` call sites:
   - Anywhere the step passes `config.someOp` into helpers expecting inner config, unwrap:
     - `const inner = config.someOp.config;`
   - Calls to ops become:
     - `op.runValidated(input, config.someOp)` (still passes envelope)
     - But any use of config fields in step-local logic must unwrap first.

3) Step `resolveConfig`:
   - Prefer: unwrap -> call strategy-level resolver -> rewrap.
   - Avoid calling op-level resolver on the envelope unless the op implementation provides a thin wrapper; the strategy resolver is canonical under this model.

**Where thought is required**
- Existing casts like `as ResolvedXConfig` must be revisited; prefer deriving runtime values in `run(...)` rather than asserting resolved types.
- Composite step configs containing multiple ops must unwrap each op independently (avoid “spread merges”).

**Acceptance criteria**
- No step config can be authored without a `strategy`.
- Steps compile cleanly without `as` casts that pretend envelope == inner.

---

### D) Update presets/maps/test fixtures that specify op configs (Bulk)
**Files**
- `mods/mod-swooper-maps/src/maps/**`
- `mods/mod-swooper-maps/test/**`

**Work**
- Wrap any authored op config objects in:
  - `{ strategy: "default", config: { ... } }`
- If a config was previously omitted and relied on defaults:
  - it should remain omitted; the plan compiler/step schema defaults must supply `defaultConfig` which is now the envelope.

**Acceptance criteria**
- No test/preset sets inner op config directly without the envelope wrapper.

---

### E) Execution plan + compiler wiring (Mostly Bulk / probably minimal)
**Files**
- `packages/mapgen-core/src/engine/execution-plan.ts`
- Any helper code that assumes “op config is the inner config” and reaches into op config directly.

**Work**
1) Confirm plan compilation remains correct:
   - step schemas validate/default/clean the envelope config shape.
   - step resolveConfig still returns a plain object that matches the step schema.

2) Update any code paths assuming inner config:
   - Search for patterns like `runValidated(..., config.*)` where downstream code treats that config as inner.
   - Unwrap where necessary.

**Acceptance criteria**
- Compilation and runtime do not depend on non-envelope configs.
- No fallback logic like `cfg?.config ?? {}` exists in op run dispatch.

---

### F) Tests + docs/spec/workflow catch-up (Bulk)
**Files**
- `packages/mapgen-core/test/**`
- Specs/workflow docs that describe strategy/config behavior:
  - `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`

**Work**
- Update tests to use envelope configs.
- Update docs to state unambiguously:
  - op config is always `{ strategy, config }`
  - strategy is always required
  - `"default"` is the canonical single-strategy id
  - resolution operates on inner config and is rewrapped to envelope

---

## Constraints / assumptions (explicit)
This migration stays low-complexity only if these are held:
- Breaking shape change is accepted everywhere (plans/steps/presets/tests).
- No dual shapes; no shorthand; no optional discriminator.
- Hard cutover: remove old `createOp` forms; do not keep compatibility overloads.

If any of these are relaxed, complexity rises sharply (conditional unions + ambiguous inference).

---

## Verification (must be green)
- `pnpm check` (includes `pnpm lint:domain-refactor-guardrails`)
- `pnpm test`
- `pnpm build`
- `pnpm deploy:mods`

---

## Pre-work Findings
