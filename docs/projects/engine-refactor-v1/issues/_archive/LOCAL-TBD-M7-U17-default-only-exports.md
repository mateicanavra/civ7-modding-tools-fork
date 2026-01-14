---
id: LOCAL-TBD-M7-U17
title: "[M7] Authoring conventions: default-only exports + inline schemas + factory enforcement"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: [codex]
labels: [architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - LOCAL-TBD-M7-U16
  - LOCAL-TBD-M7-B3
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Harden authoring conventions so modules are simpler to import/re-export and schema authoring is more consistent and less error-prone:
  - leaf ops/steps/contracts become **default-only** value exports (with type exports allowed),
  - contract factory callers **inline** root schemas (nested schemas can stay extracted),
  - schema factories apply `additionalProperties: false` automatically so authors don’t repeat it,
  - factory naming is standardized (`define*` for contracts, `create*` for binders) so there is one obvious way.

## Why (Narrative)
This work reduces “surface area” and drift in our authoring patterns:
- Default-only leaf exports reinforce the “single thing per module” contract and make barrels consistent.
- Inlined root schemas make contracts easier to read and update, and avoid schema indirection that drifts from the implementation.
- Factory enforcement removes repetitive schema boilerplate (`additionalProperties: false`) and prevents inconsistent schema authoring.
- Consistent factory naming improves DX/type-completion and reduces “which helper should I use?” ambiguity.

## Complexity × Parallelism
- Overall: medium complexity, medium parallelism (default-only exports and schema inlining can be mostly mechanical; factory renames may require coordination).

## Scope (Precision)
<!-- Path roots -->
CORE = `packages/mapgen-core`
SWOOPER = `mods/mod-swooper-maps`

### In Scope
- `mods/mod-swooper-maps/src/domain/**/ops/**` (ops + op contracts + barrels)
- `mods/mod-swooper-maps/src/recipes/**/steps/**` (steps + step contracts + barrels)
- `packages/mapgen-core/src/**` factory functions that accept schemas (especially contract factories)
- Naming standardization for factories/binders where used across these surfaces

### Out of Scope (unless required for build correctness)
- Behavior changes to recipe compilation/execution or runtime validation semantics
- Reworking schema semantics (defaults/ranges/etc.) beyond authoring shape and factory enforcement
- Converting *all* project modules to default-only exports (restricted to ops/steps/contracts and their barrels)

## Testing / Verification
- `pnpm -C packages/mapgen-core build`
- `pnpm -C mods/mod-swooper-maps check`

## Dependencies / Notes
- Related: [LOCAL-TBD-M7-U16](./LOCAL-TBD-M7-U16-domain-router-surface.md)
- Related: [LOCAL-TBD-M7-B3](./LOCAL-TBD-M7-B3-domain-ops-registries.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Hardening Notes (Implementation-Oriented)

### Work Breakdown (Authoritative)

#### U17-A — Default-only exports for leaf ops/steps/contracts

**Complexity × Parallelism:** low-medium complexity, high parallelism (mechanical edits; broad file surface).

**Contract change (Precision):**
- Leaf modules export **exactly one value**: `export default <value>`.
- Leaf modules may keep `export type ...` / `export interface ...` / `export { type ... }`.
- Barrels re-export leaf defaults using `export { default as <Name> } from "./path.js"`.
- Direct consumers import leaf defaults via default import (no `{ Foo }` from leaf module).

**Files (Guide)**
```yaml
files:
  - path: mods/mod-swooper-maps/src/domain/**/ops/**/index.ts
    notes: Change to default-only value export; keep type exports.
  - path: mods/mod-swooper-maps/src/domain/**/ops/**/contract.ts
    notes: Change to default-only value export; keep type exports.
  - path: mods/mod-swooper-maps/src/recipes/**/steps/**/index.ts
    notes: Change to default-only value export; keep type exports.
  - path: mods/mod-swooper-maps/src/recipes/**/steps/**/*.contract.ts
    notes: Change to default-only value export; keep type exports.
  - path: mods/mod-swooper-maps/src/domain/**/index.ts
    notes: Re-export defaults via `export { default as ... }`.
  - path: mods/mod-swooper-maps/src/recipes/**/steps/index.ts
    notes: Re-export defaults via `export { default as ... }`.
```

**Acceptance Criteria**
- [ ] All op leaf modules match default-only:
  - `mods/mod-swooper-maps/src/domain/**/ops/**/index.ts`
  - `mods/mod-swooper-maps/src/domain/**/ops/**/contract.ts`
- [ ] All step leaf modules match default-only:
  - `mods/mod-swooper-maps/src/recipes/**/steps/**/index.ts`
  - `mods/mod-swooper-maps/src/recipes/**/steps/**/*.contract.ts`
- [ ] All barrels that re-export these leaf modules use `export { default as ... }`.
- [ ] No remaining named-value imports from leaf modules (type-only imports OK).
- [ ] `pnpm -C packages/mapgen-core build` and `pnpm -C mods/mod-swooper-maps check` pass.

**Verification Helpers**
- `rg -n --glob='*.ts' \"^export\\s+(const|function|class|\\{)\" mods/mod-swooper-maps/src/domain mods/mod-swooper-maps/src/recipes | head`
- `rg -n --glob='*.ts' \"from \\\".*\\/ops\\/.*\\/(index|contract)\\.js\\\"\" mods/mod-swooper-maps/src | head`
- `rg -n --glob='*.ts' \"from \\\".*\\/steps\\/.*\\/index\\.js\\\"\" mods/mod-swooper-maps/src | head`

**Open Questions**
- Should we also enforce default-only for domain-level entrypoints (e.g. `mods/mod-swooper-maps/src/domain/ecology/index.ts`), or only leaf modules + barrels? (Current scope: leaf modules + barrels only.)

---

#### U17-B — Factory schema enforcement: no manual `additionalProperties: false`

**Complexity × Parallelism:** medium complexity, medium parallelism (core factory changes + mechanical removals).

**Goal (Narrative):**
Authors should not have to remember to set `additionalProperties: false` for contract schemas; factories should apply it consistently so schemas are uniform and we reduce boilerplate and drift.

**Contract change (Precision):**
- For factory helpers that accept a “root object schema” (especially contracts), ensure `additionalProperties: false` is applied by default for object schemas created/accepted by the factory.
- Remove manual `additionalProperties: false` from call sites *when the factory already enforces it*.

**Files (Guide)**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/op/contract.ts
    notes: Enforce `additionalProperties: false` by convention for root object schemas.
  - path: packages/mapgen-core/src/authoring/step/contract.ts
    notes: Enforce `additionalProperties: false` by convention for root object schemas.
  - path: packages/mapgen-core/src/authoring/schema.ts
    notes: If there is a shared schema-normalization helper, prefer putting enforcement here.
  - path: mods/mod-swooper-maps/src/domain/**/ops/**/contract.ts
    notes: Remove redundant `additionalProperties: false` at call sites.
  - path: mods/mod-swooper-maps/src/recipes/**/steps/**/*.contract.ts
    notes: Remove redundant `additionalProperties: false` at call sites.
```

**Acceptance Criteria**
- [ ] Each relevant factory function in `packages/mapgen-core/src/authoring/**` documents + enforces “no need to specify `additionalProperties: false` manually” for root object schemas.
- [ ] All call sites in `mods/mod-swooper-maps/src` that redundantly specify `additionalProperties: false` are updated to omit it (when safe).
- [ ] `rg -n \"additionalProperties:\\s*false\" mods/mod-swooper-maps/src/domain mods/mod-swooper-maps/src/recipes` returns only intentional exceptions (nested schemas or non-factory uses), with a short justification comment if any remain.
- [ ] `pnpm -C packages/mapgen-core build` and `pnpm -C mods/mod-swooper-maps check` pass.

**Prework Prompt (Agent Brief)**
**Purpose:** Identify which factories already enforce `additionalProperties: false` and enumerate redundant call sites.
**Expected Output:** (1) list of enforcing factories + their behavior, (2) list of redundant call sites to update, (3) list of true exceptions (with rationale).
**Sources to Check:**
- `packages/mapgen-core/src/**` for contract factories (e.g. `define*Contract`, `define*` helpers)
- `mods/mod-swooper-maps/src/**` for schema objects passed to those factories
**Commands:**
- `rg -n \"additionalProperties:\\s*false\" packages/mapgen-core/src mods/mod-swooper-maps/src`
- `rg -n \"define(.*Contract|Op|Step)\\(\" packages/mapgen-core/src mods/mod-swooper-maps/src`

---

#### U17-C — Inline root schemas in contract factory calls

**Complexity × Parallelism:** medium complexity, high parallelism (mechanical inlining; broad file surface).

**Goal (Narrative):**
Root-level schemas (input/output/config/selection) should be inlined at the factory call site so the contract is readable without chasing identifiers. Nested schemas may remain extracted for reuse.

**Rules (Precision):**
- In any `define*`/contract factory call, root schema values must be inlined.
  - Allowed extraction: nested property schemas reused across multiple places.
  - Not allowed: `const InputSchema = ...; defineOp({ input: InputSchema, ... })` (root schema indirection).

**Files (Guide)**
```yaml
files:
  - path: mods/mod-swooper-maps/src/domain/**/ops/**/contract.ts
    notes: Inline root schemas (input/output/config/selection) in the contract factory call.
  - path: mods/mod-swooper-maps/src/recipes/**/steps/**/*.contract.ts
    notes: Inline root schemas (input/output/config/selection) in the contract factory call.
```

**Acceptance Criteria**
- [ ] All operation contracts in `mods/mod-swooper-maps/src/domain/**/ops/**/contract.ts` inline root schemas.
- [ ] All step contracts in `mods/mod-swooper-maps/src/recipes/**/steps/**/*.contract.ts` inline root schemas.
- [ ] `pnpm -C packages/mapgen-core build` and `pnpm -C mods/mod-swooper-maps check` pass.

**Prework Prompt (Agent Brief)**
**Purpose:** Enumerate “out-of-line root schemas” to inline without breaking nested-schema reuse.
**Expected Output:** List of files + the extracted identifiers to inline.
**Sources to Check:** `mods/mod-swooper-maps/src/domain/**/ops/**/contract.ts`, `mods/mod-swooper-maps/src/recipes/**/steps/**/*.contract.ts`
**Commands:**
- `rg -n --glob='contract.ts' \"\\bconst\\s+\\w+(Input|Output|Config|Selection)Schema\\b\" mods/mod-swooper-maps/src/domain`
- `rg -n --glob='*.contract.ts' \"\\bconst\\s+\\w+(Input|Output|Config|Selection)Schema\\b\" mods/mod-swooper-maps/src/recipes`

---

#### U17-D — Standardize factory naming (`define*` vs `create*`)

**Complexity × Parallelism:** medium-high complexity, low-medium parallelism (API surface + call sites; depends on backwards-compat stance).

**Goal (Narrative):**
Make naming predictable: “definition/contract” helpers are `define*`; “implementation/binding” helpers are `create*`.

**Contract change (Precision):**
- Contract factories: `define<Thing>` (e.g. `defineOp`, `defineStep`, `defineStage`, `defineDomain`).
- Implementation binders: `create<Thing>` (e.g. `createOp`, `createStep`, `createStage`, `createDomain`).

**Files (Guide)**
```yaml
files:
  - path: packages/mapgen-core/src/authoring/index.ts
    notes: Export the standardized factory/binder names.
  - path: packages/mapgen-core/src/authoring/op/contract.ts
    notes: If renaming `defineOp`, do it here (and update exports/call sites).
  - path: packages/mapgen-core/src/authoring/step/contract.ts
    notes: If renaming `defineStep`, do it here (and update exports/call sites).
  - path: mods/mod-swooper-maps/src/**/*
    notes: Update call sites and imports to match the standardized names.
```

**Acceptance Criteria**
- [ ] No more mixed naming within the targeted surfaces (contracts/binders used by `mods/mod-swooper-maps/src/domain/**` and `mods/mod-swooper-maps/src/recipes/**`).
- [ ] `pnpm -C packages/mapgen-core build` and `pnpm -C mods/mod-swooper-maps check` pass.

**Open Questions**
- Are these names public API across other mods/packages that would require broader coordination? If yes, do we:
  - (A) keep backwards-compatible re-exports temporarily, or
  - (B) do an atomic rename across the workspace now?

**Prework Prompt (Agent Brief)**
**Purpose:** Inventory factory/binder names and their call sites, then propose the minimal-change rename map.
**Expected Output:** Rename map + file list + estimated churn.
**Sources to Check:** `packages/mapgen-core/src/**`, `mods/mod-swooper-maps/src/**`
**Commands:**
- `rg -n \"export\\s+(function|const)\\s+(define|create)\" packages/mapgen-core/src`
- `rg -n \"\\b(define|create)(Op|Operation|Step|Stage|Domain)\\b\" packages/mapgen-core/src mods/mod-swooper-maps/src`

### Paper Trail / Prior Art
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M7-U16-domain-router-surface.md`
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M7-B3-domain-ops-registries.md`
