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
