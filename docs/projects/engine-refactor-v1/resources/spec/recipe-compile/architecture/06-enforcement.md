# Enforcement

This document defines DX rules and lint boundaries that enforce the
architectural invariants.

# DX Rules (pinned)

This file captures **developer experience guardrails** that the architecture is intentionally optimizing for. These rules are normative and should be enforced via lint (see `lint-boundaries.md`) and by keeping examples consistent.

## Enforcement approach (ordering; pinned)

Preferred strategy:
- Bake constraints into the public API and type surfaces first (structural enforcement).
- Use linting as a secondary layer to catch drift and reinforce intent.

Nuance (why lint still matters early):
- Lint is a fast, pragmatic tool to steer behavior while the API is still converging, especially for agent-driven implementation.
- If an invariant is expensive to encode structurally right now, lint can land first, but the intent is still to harden the API when feasible.

---

## 1) Import boundaries (hard)

### 1.1 Domain entrypoints only (no deep imports)

- Cross-module consumers must import domain content **only** via:
  - `@mapgen/domain/<domain>` (domain public surface; may include impl registries like `opsById`), or
  - `@mapgen/domain/<domain>/contracts` (contract-only; safe for step contracts and schema/type-only consumers).
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
- Step **contract** files importing **op contracts** via the domain contract surface:
  - `import * as ecologyContracts from "@mapgen/domain/ecology/contracts";`
  - `ops: { trees: ecologyContracts.planTreeVegetation, ... }`
- Step modules importing the domain entrypoint to access the registry for binding:
  - `const ops = bindRuntimeOps(contract.ops, ecology.opsById);`

Forbidden:
- Deep imports into `@mapgen/domain/<domain>/ops/**`, `strategies/**`, `rules/**`.

Rationale:
- Keeps domains free to reorganize internal layout without forcing horizontal churn.
- Keeps step contracts cheap (no impl bundling) while allowing step modules to bind by id via a stable registry.

---

## 2) Authoring APIs (preferred)

### 2.1 Prefer the canonical authoring entrypoint

Default authoring import path:
- Prefer importing authoring APIs from `@swooper/mapgen-core/authoring`.

Allowed exceptions (only when justified, e.g. tree-shaking):
- Second-level subpaths under `@swooper/mapgen-core/authoring/<area>` (e.g. `.../authoring/stage`, `.../authoring/op`).
- Do not proliferate deeper “grab bag” paths under `authoring/**/**`.

Optional downstream aliasing:
- A mod/package may create a local authoring barrel (e.g. `@mapgen/authoring`) that re-exports from `@swooper/mapgen-core/authoring` to centralize local context typing.
- If such an alias exists, use it consistently within that package; do not mix authoring entrypoints.

Rationale:
- Reduces “two ways” import drift and makes agent-driven changes more reliable.

---

## 3) Single-path ergonomics (avoid “two ways”)

Where the architecture offers multiple ways to achieve the same outcome (e.g., ops binding, schema derivation), the spec must:
- Select one canonical path,
- Make alternatives explicitly “deferred” or “forbidden for v1,”
- Ensure examples follow only the canonical path.

## 4) Lint Boundaries / Enforcement

This section is intentionally small but explicit: the architecture is brittle without enforcement.

### 4.1 No runtime defaulting/cleaning

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

### 4.2 Reserved key: `"knobs"`

Pinned enforcement (hard throw; not lint-only):
- Enforce at stage construction time (e.g. inside `createStage(...)` / `defineStage(...)`):
  - throw if any step id is exactly `"knobs"`
  - throw if stage `public` schema declares a top-level field named `"knobs"`

TypeScript (copy-paste ready):
- See Appendix A.4 for the exact `assertNoReservedStageKeys(...)` helper + how stage generics exclude `"knobs"` at the type level.

### 4.3 Factories default `additionalProperties: false` for inline schema definitions

- Enforce that inline schema field-map shorthands (only within factories) become strict object schemas by default.
- Do not introduce a globally reusable “schema builder” type that can be used ad hoc.

### 4.4 No nested op envelope scanning

- Any helper that attempts to discover ops by scanning config objects (nested paths/arrays) is a violation.
- Op envelopes are discovered only via `step.contract.ops` keys.

### 4.5 Domain public surface imports only

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
