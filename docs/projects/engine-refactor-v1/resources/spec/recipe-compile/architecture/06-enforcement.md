# Enforcement

This document defines DX rules and lint boundaries that enforce the architectural invariants.

Canonical enforcement in this repo:
- `eslint.config.js`
- authoring factories in `packages/mapgen-core/src/authoring/**`

---

## Import boundaries

### Domain entrypoints only (no deep imports)

Cross-module consumers import domain content only via the layer-appropriate entrypoint:

Step contracts:
- Allowed: `@mapgen/domain/<domain>` only
- Forbidden: any deep import `@mapgen/domain/<domain>/*` (including `.../index.js`, `.../*.js`) and any runtime entrypoint `@mapgen/domain/<domain>/ops`

Recipe compilation roots (e.g. `mods/**/src/recipes/**/recipe.ts`):
- Allowed: `@mapgen/domain/<domain>/ops` only
- Forbidden: `@mapgen/domain/<domain>` (contract entrypoint)

Tests:
- Default: use the same public import surfaces as “real” code (`@mapgen/domain/<domain>` and `@mapgen/domain/<domain>/ops`)
- Allowed exception: deep imports when a stable public surface does not exist yet
- Requirement: deep imports in tests must be intentional (add a short rationale comment near the import, or a targeted eslint disable)

Enforcement:
- `eslint.config.js` enforces step-contract and recipe-root import boundaries.
- Tests are not treated as hard architectural boundaries in the same way as step contract/runtime code; allow exceptions where needed.

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
