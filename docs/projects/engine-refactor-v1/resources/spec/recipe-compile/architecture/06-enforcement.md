# Enforcement

This document defines DX rules and lint boundaries that enforce the architectural invariants.

Canonical enforcement in this repo:
- `eslint.config.js`
- authoring factories in `packages/mapgen-core/src/authoring/**`

---

## Import boundaries

### Domain entrypoints only (no deep imports)

Cross-module consumers (steps/recipes/tests) import domain content only via:
- `@mapgen/domain/<domain>` (domain public surface)
- `@mapgen/domain/<domain>/contracts` (contract-only surface)

Forbidden from outside the domain itself:
- `@mapgen/domain/<domain>/ops/**`
- `@mapgen/domain/<domain>/ops/*`

This is enforced for mod source by `eslint.config.js` via `no-restricted-imports` patterns.

---

## Runtime vs compile-time boundaries

### No runtime schema defaulting/cleaning/validation

Policy:
- Runtime layers (`step.run`, `strategy.run`) execute with already-canonical configs.
- Schema defaulting/cleaning and config canonicalization happen only in the recipe compiler pipeline.

Lint enforcement (mod runtime layers):
- Forbid importing TypeBox runtime utilities:
  - `@sinclair/typebox/value`
  - `@sinclair/typebox/compiler`
- Forbid importing compiler helpers into runtime code:
  - `@swooper/mapgen-core/compiler/normalize`

These constraints are enforced for:
- `mods/**/src/recipes/**/stages/**/steps/**/*.ts`
- `mods/**/src/domain/**/ops/**/strategies/**/*.ts`

---

## Reserved keys and naming

### Reserved stage key: `"knobs"`

Pinned rule:
- `"knobs"` cannot be a step id.
- When a stage defines `public`, `"knobs"` cannot be a public field name.

Enforcement:
- `createStage(...)` in `packages/mapgen-core/src/authoring/stage.ts` throws on violations.
- The compiler also rejects reserved step ids if a stage is provided without the factory.

### Step id format

Pinned rule:
- Step ids are kebab-case (e.g. `features-plan`, `biome-edge-refine`).

Enforcement:
- `defineStep(...)` in `packages/mapgen-core/src/authoring/step/contract.ts`
- `createStage(...)` also validates step ids at stage construction time

---

## Schema conventions

Pinned conventions for op + step schemas:
- `additionalProperties: false` is treated as the default for object schemas.
- Do not set object-level defaults when properties already declare defaults.

Enforcement:
- `applySchemaConventions(...)` is invoked by op/step authoring helpers.

