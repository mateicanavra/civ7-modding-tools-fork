# Enforcement

This document defines DX rules and lint boundaries that enforce the
architectural invariants.

# DX Rules (pinned)

This file captures **developer experience guardrails** that the architecture is intentionally optimizing for. These rules are normative and should be enforced via lint (see `lint-boundaries.md`) and by keeping examples consistent.

---

## 1) Import boundaries (hard)

### 1.1 Domain entrypoints only (no deep imports)

- Cross-module consumers must import domain content **only** via `@mapgen/domain/<domain>`.
- Forbidden in steps/recipes/tests: deep imports such as:
  - `@mapgen/domain/ecology/ops/*`
  - `@mapgen/domain/ecology/ops-by-id`
  - `@mapgen/domain/ecology/strategies/*`
  - `@mapgen/domain/ecology/rules/*`

Rationale:
- Prevents “accidental bundling” of op implementations into contracts and prevents brittle path coupling to domain internals.
- Keeps domains free to reorganize internal layout without forcing horizontal churn.

### 1.2 Steps import only the domain entrypoint (no deep imports)

**Pinned:** Step contracts and step modules may import the **domain entrypoint**, but must not deep-import op modules/strategies/rules.

Allowed:
- Step **contract** files importing **op contracts** via the domain entrypoint:
  - `import * as ecology from "@mapgen/domain/ecology";`
  - `ops: { trees: ecology.contracts.planTreeVegetation, ... }`
- Step modules importing the domain entrypoint to access the registry for binding:
  - `const ops = bindRuntimeOps(contract.ops, ecology.opsById);`

Forbidden:
- Deep imports into `@mapgen/domain/<domain>/ops/**`, `strategies/**`, `rules/**`.

Rationale:
- Keeps domains free to reorganize internal layout without forcing horizontal churn.
- Keeps step contracts cheap (no impl bundling) while allowing step modules to bind by id via a stable registry.

---

## 2) Authoring APIs (preferred)

### 2.1 Prefer the stable step authoring alias

When referencing the canonical step factory in examples:
- Prefer `import { createStep } from "@mapgen/authoring/steps";`

Rationale:
- Centralizes `ExtendedMapContext` typing and avoids forcing examples to pick a core package path.

---

## 3) Single-path ergonomics (avoid “two ways”)

Where the architecture offers multiple ways to achieve the same outcome (e.g., ops binding, schema derivation), the spec must:
- Select one canonical path,
- Make alternatives explicitly “deferred” or “forbidden for v1,”
- Ensure examples follow only the canonical path.
## 3) Lint Boundaries / Enforcement

This section is intentionally small but explicit: the architecture is brittle without enforcement.

### 3.1 No runtime defaulting/cleaning

Policy:
- `step.run(...)` and `strategy.run(...)` are runtime and must not default/clean configs.
- All defaulting/cleaning happens in compilation (stage/step/op normalization).

Enforcement (minimal, real):
- Keep defaulting utilities in compiler-only modules, e.g. `packages/mapgen-core/src/compiler/normalize.ts`.
- Do not re-export compiler helpers from runtime-facing entrypoints.
- Lint rule: forbid importing `typebox/value` (or any schema default/clean helper) in:
  - `mods/**/domain/**`
  - `mods/**/recipes/**/steps/**`
  - `packages/**/src/engine/**`
  - `packages/**/src/core/**`
  - allow only under `packages/**/src/compiler/**`

### 3.2 Reserved key: `"knobs"`

Pinned enforcement (hard throw; not lint-only):
- Enforce at stage construction time (e.g. inside `createStage(...)` / `defineStage(...)`):
  - throw if any step id is exactly `"knobs"`
  - throw if stage `public` schema declares a top-level field named `"knobs"`

TypeScript (copy-paste ready):
- See Appendix A.4 for the exact `assertNoReservedStageKeys(...)` helper + how stage generics exclude `"knobs"` at the type level.

### 3.3 Factories default `additionalProperties: false` for inline schema definitions

- Enforce that inline schema field-map shorthands (only within factories) become strict object schemas by default.
- Do not introduce a globally reusable “schema builder” type that can be used ad hoc.

### 3.4 No nested op envelope scanning

- Any helper that attempts to discover ops by scanning config objects (nested paths/arrays) is a violation.
- Op envelopes are discovered only via `step.contract.ops` keys.

### 3.5 Domain public surface imports only

Policy:
- Cross-module consumers (steps, recipes, tests) import domain contracts/ops only via the domain public surface:
  - `@mapgen/domain/<domain>`
  - and optionally `@mapgen/domain/config` for schema/type-only fragments
- No deep imports into `@mapgen/domain/**/ops/**` (or `strategies/**`, `rules/**`) from outside the domain module itself.

Enforcement (lint, plus review discipline):
- Lint rule: forbid imports matching `@mapgen/domain/**/ops/**` under:
  - `mods/**/recipes/**`
  - `mods/**/maps/**`
  - `mods/**/test/**`
- Allow deep imports only under `mods/**/domain/**` (op internals may use relative imports).

---
