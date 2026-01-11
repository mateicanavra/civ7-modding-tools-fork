# Compilation Pipeline

This document defines the mechanics of the recipe compiler: phase ordering, strict normalization rules, and the compile-time hook contract.

Canonical implementations (source of truth):
- `packages/mapgen-core/src/compiler/recipe-compile.ts`
- `packages/mapgen-core/src/compiler/normalize.ts`

---

## 1.9 Canonical compilation pipeline (definitive ordering)

The compiler is responsible for producing a fully canonical internal config tree (stage-id → step-id → step-config) before engine plan compilation/execution.

### Phase A — Stage surface normalization + public→internal (optional)

For each stage:

1. **Normalize stage config input** against the stage’s computed `surfaceSchema` (the single author-facing stage schema):
   - `knobs` is always a field on the stage config object.
   - If the stage defines `public`, the non-knob portion is validated against `public` (and `compile` produces internal step configs).
   - If the stage omits `public`, the non-knob portion is treated as an internal-as-public step-id keyed map (step configs are `unknown` at this phase).

2. **Convert deterministically to internal plumbing shape** via `stage.toInternal({ env, stageConfig })`:
   - Extract `knobs`.
   - Produce `rawSteps` (a partial map keyed by step id).

3. **Validate `rawSteps` keys**:
   - `Object.keys(rawSteps)` must be a subset of the declared `stage.steps[].contract.id` set (excluding the reserved `"knobs"` key).
   - Unknown keys become explicit compiler errors (`stage.unknown-step-id`).

### Phase B — Step canonicalization (always)

For each step in `stage.steps` array order:

1. `rawStep = rawSteps[stepId] ?? undefined`
2. **Prefill op defaults (optional)** (`prefillOpDefaults(step, rawStep, path)`):
   - This is a mechanical, top-level-only pass.
   - It is contract-driven and only applies when a step carries an `ops` declaration (see “Op envelopes” below).
3. **Strict normalize** the step config against `step.contract.schema` (`normalizeStrict`):
   - default + clean + unknown-key errors
4. **Apply `step.normalize`** (compile-time only) if present:
   - The compiler re-runs `normalizeStrict` and rejects non-shape-preserving results (`normalize.not.shape-preserving`).
5. **Mechanical op normalization pass (optional)** (`normalizeOpsTopLevel`):
   - This is a compiler-owned, top-level-only wiring pass.
   - It binds declared op contracts to implementations by `op.id` using the recipe-owned `compileOpsById` registry.
6. **Strict normalize** again to finalize the canonical step config.

Output:
- a canonical per-stage config map keyed by step id, with one canonical step config shape per step.

---

## 1.10 Strict normalization (defaults, cleaning, unknown keys)

Strict normalization is implemented by `normalizeStrict` and is used for:
- stage config normalization (against `stage.surfaceSchema`)
- step config normalization (against `step.contract.schema`)

Behavior:
- `null` is treated as invalid input (schema errors only; no implicit `{}` coercion).
- `undefined` is treated as “missing” and normalizes as `{}` for object schemas.
- Unknown keys are detected via `additionalProperties: false` and surfaced as `config.invalid` errors with stable paths.
- Defaults are applied using TypeBox defaults, including nested defaults (property defaults, union defaults, and op envelope defaults).
- Output is cleaned via TypeBox cleaning (removes unknown/extra keys when representable).

Schema authoring convention (enforced for op + step schemas):
- Do not set object-level defaults when properties already declare defaults.
- `additionalProperties: false` is treated as the default for object schemas (when omitted) by the authoring helpers.

---

## 1.11 Op envelopes (strategy selection)

Domain ops are strategy-backed and the op config shape is always a strategy envelope:

```ts
{ strategy: "<strategyId>", config: <strategyConfig> }
```

In step config schemas, op envelope configs are modeled as top-level properties whose schemas reuse the op’s `op.config` schema.

Selection rules:
- Steps select strategies only via config (`config.strategy`), not by importing strategy modules.
- Strategies are internal to the op module; callers interact with `op.normalize` (compile-time) and `op.run` (runtime).

Top-level-only constraint:
- Op envelope handling in the compiler is strictly top-level and contract-driven; the compiler does not scan nested config shapes to “discover” ops.

---

## 1.18 Single rule: where normalization is allowed

Rule:

> Only the recipe compiler pipeline may perform schema defaulting/cleaning and may invoke `step.normalize` / `op.normalize`. Runtime execution must not.

Practical consequences:
- Any canonicalization that would otherwise happen inside `step.run` must move to schema defaults and/or `step.normalize` and/or `strategy.normalize`.
- Runtime step code is free of TypeBox `Value.*` usage and does not depend on compiler utilities.

Enforcement:
- API layering: compiler helpers live under `@swooper/mapgen-core/compiler/*`.
- Lint boundaries: runtime layers forbid importing TypeBox runtime validators and compiler helpers.

---

## 1.19 Compiler error examples (pinned shape; illustrative)

Errors are accumulated as `CompileErrorItem[]` and surfaced as a single `RecipeCompileError`.

Unknown key in a stage public config (caught by strict stage surface normalization):

```ts
{
  code: "config.invalid",
  path: "/config/ecology/extraField",
  message: "Unknown key",
  stageId: "ecology",
}
```

Stage compile produced an unknown step id (compiler does not silently ignore):

```ts
{
  code: "stage.unknown-step-id",
  path: "/config/ecology/unknown-step",
  message: "Unknown step id \"unknown-step\" returned by stage.compile/toInternal (must be declared in stage.steps)",
  stageId: "ecology",
  stepId: "unknown-step",
}
```

Step normalize violates shape-preservation (result does not validate against the step schema):

```ts
{
  code: "normalize.not.shape-preserving",
  path: "/config/ecology/features-plan",
  message: "step.normalize returned a value that does not validate against the step schema",
  stageId: "ecology",
  stepId: "features-plan",
}
```

---

## 1.20 Testing patterns (compiler + hooks)

Compiler logic is unit-testable without the engine.

Recommended pattern:
- Use real `createStage` / `defineStep` / `createStep` authored modules.
- Call `compileRecipeConfig(...)` and assert on `RecipeCompileError.errors` (paths + codes) and on compiled output shapes.

