# Compilation Pipeline

This document defines the mechanics of the recipe compiler: phase ordering,
op envelope handling, and normalization rules.

### 1.9 Canonical compilation pipeline (definitive ordering)

This is the definitive ordering for the landing.

#### Phase A — Stage-level “public → internal” (optional)

For each stage:

1. Normalize stage config input via schema:
   - Always validate/default/clean against the stage’s computed `surfaceSchema` (the single author-facing schema: `knobs` + fields).
   - For internal-as-public stages, step fields are `unknown` at this phase; strict step validation happens later.
2. Convert to internal plumbing shape deterministically via `stage.toInternal({ env, stageConfig })`:
   - Extract `knobs` from the stage config object.
   - Produce `rawSteps`.
     - `createStage(...)` provides a standard `toInternal` wrapper:
       - If stage has `public`: it calls `stage.compile({ env, knobs, config: configPart })`
       - Else: `rawSteps = omit(stageConfig, "knobs")` (identity on the step-map portion; `knobs` is not part of the step map)
3. Validate `rawSteps` keys (pinned; no silent ignore):
   - `Object.keys(rawSteps)` must be a subset of the declared `stage.steps[].contract.id` set (excluding `"knobs"`).
   - Unknown keys become explicit compiler errors (see §1.19).

At the end of Phase A for each stage:

```ts
rawInternalStage: Partial<Record<stepId, unknown>>
knobs: unknown
```

#### Phase B — Step canonicalization (always)

For each step, in deterministic order:

Deterministic order (pinned):
- The compiler iterates steps in `stage.steps` array order (the stage author’s explicit declaration order).
- Stage config input is a partial step-id keyed map (for internal-as-public stages), but the step canonicalization order is **not** derived from input key order.
- Ordering is for reproducibility (stable error ordering, stable traces). The canonicalization algorithm is step-local and must not depend on step ordering for correctness.

1. `rawStep = rawInternalStage[stepId] ?? undefined`
2. Prefill op defaults (top-level keys only; keys are discovered from `step.contract.ops`)
3. Normalize step config via strict schema normalization (default + clean + unknown-key errors)
4. Apply `step.normalize` (value-only) if present; re-normalize via schema
5. Apply mechanical op normalization pass (top-level only); re-normalize via schema
   - requires a compile-visible op registry `compileOpsById: Record<op.id, DomainOpCompileAny>` so the compiler can bind op contracts to implementations by id
   - the runtime op surface is structurally stripped and cannot be used for compilation (see §1.14)

Output:
- a total, canonical internal per-step config map for the stage

This pipeline is recipe-owned; the engine receives only the compiled internal configs.

---

### 1.10 Mechanical op envelopes (discovery rules, helpers, and “top-level only”)

Non-negotiable invariants:

- Op envelopes are discovered **only** via `step.contract.ops`.
- Op envelopes are **top-level properties** in the step config object: `stepConfig[opKey]`.
- “Mega-ops” are treated as single ops (internal composition is domain-private).

Strict schema normalization helper (compiler-only): default + clean + unknown-key errors (runs in compilation, not engine planning):

```ts
// NEW (planned): compiler-only helper (implementation-pinned).
//
// Baseline today: `normalizeStepConfig(...)` in `packages/mapgen-core/src/engine/execution-plan.ts`
// (uses `findUnknownKeyErrors(...)` + `Value.Default(...)` + `Value.Clean(...)` + `Value.Errors(...)`).
//
// NEW (planned): compiler-owned error surface.
//
// Copy-pasteable reference implementation: `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/compiler.ts`

import type { TSchema } from "typebox";
import { Value } from "typebox/value";

import { buildOpEnvelopeSchema } from "./ops";
import { bindCompileOps, type DomainOpCompileAny } from "./ops";
import type { StepModuleAny } from "./steps";
import type { NormalizeCtx } from "./env";

export type CompileErrorCode =
  | "config.invalid"
  | "stage.compile.failed"
  | "stage.unknown-step-id"
  | "op.missing"
  | "step.normalize.failed"
  | "op.normalize.failed"
  | "normalize.not.shape-preserving";

export type CompileErrorItem = Readonly<{
  code: CompileErrorCode;
  path: string;
  message: string;
  stageId?: string;
  stepId?: string;
  opKey?: string;
  opId?: string;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function joinPath(basePath: string, rawPath: string): string {
  const base = basePath && basePath.length > 0 ? basePath : "";
  const suffix = rawPath && rawPath.length > 0 ? rawPath : "";
  return `${base}${suffix}`;
}

function formatErrors(
  schema: TSchema,
  value: unknown,
  basePath: string
): Array<{ path: string; message: string }> {
  const formatted: Array<{ path: string; message: string }> = [];
  for (const err of Value.Errors(schema, value)) {
    const path =
      (err as { path?: string; instancePath?: string }).path ??
      (err as { instancePath?: string }).instancePath ??
      "";
    const normalizedPath = path && path.length > 0 ? path : "/";
    formatted.push({ path: joinPath(basePath, normalizedPath), message: err.message });
  }
  return formatted;
}

function findUnknownKeyErrors(
  schema: unknown,
  value: unknown,
  path = ""
): Array<{ path: string; message: string }> {
  if (!isPlainObject(schema) || !isPlainObject(value)) return [];

  const anyOf = Array.isArray(schema.anyOf) ? (schema.anyOf as unknown[]) : null;
  const oneOf = Array.isArray(schema.oneOf) ? (schema.oneOf as unknown[]) : null;
  const candidates = anyOf ?? oneOf;
  if (candidates) {
    let best: Array<{ path: string; message: string }> | null = null;
    for (const candidate of candidates) {
      const errs = findUnknownKeyErrors(candidate, value, path);
      if (best == null || errs.length < best.length) best = errs;
      if (best.length === 0) break;
    }
    return best ?? [];
  }

  const properties = isPlainObject(schema.properties)
    ? (schema.properties as Record<string, unknown>)
    : null;
  const additionalProperties = schema.additionalProperties;

  const errors: Array<{ path: string; message: string }> = [];

  if (properties && additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        errors.push({ path: `${path}/${key}`, message: "Unknown key" });
        continue;
      }
      errors.push(...findUnknownKeyErrors(properties[key], value[key], `${path}/${key}`));
    }
    return errors;
  }

  if (properties) {
    for (const key of Object.keys(properties)) {
      errors.push(
        ...findUnknownKeyErrors(properties[key], (value as any)[key], `${path}/${key}`)
      );
    }
  }
  return errors;
}

function buildValue(schema: TSchema, input: unknown): { converted: unknown; cleaned: unknown } {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(schema, cloned);
  const cleaned = Value.Clean(schema, defaulted);
  return { converted: defaulted, cleaned };
}

export function normalizeStrict<T>(
  schema: TSchema,
  rawValue: unknown,
  path: string
): { value: T; errors: CompileErrorItem[] } {
  if (rawValue === null) {
    const errors = formatErrors(schema, rawValue, path).map((err) => ({
      code: "config.invalid" as const,
      path: err.path,
      message: err.message,
    }));
    return { value: rawValue as T, errors };
  }

  const input = rawValue === undefined ? {} : rawValue;
  const unknownKeyErrors = findUnknownKeyErrors(schema, input, path);
  const { converted, cleaned } = buildValue(schema, input);
  const errors = [...unknownKeyErrors, ...formatErrors(schema, converted, path)].map((err) => ({
    code: "config.invalid" as const,
    path: err.path,
    message: err.message,
  }));

  return { value: cleaned as T, errors };
}
```

Prefill op defaults (compiler-only; not schema defaulting):

```ts
// NEW (planned): compiler helper (implementation-pinned).
//
// Prefill is mechanical and contract-driven:
// - discovers op keys only from `step.contract.ops`
// - if `rawStepConfig[opKey]` is missing/undefined, installs the op contract's default envelope
// - does not call op normalization hooks (that happens later)
//
// Note: defaults are derived from op contract strategy schemas via `buildOpEnvelopeSchema(...)`.
export function prefillOpDefaults(
  step: StepModuleAny,
  rawStepConfig: unknown,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  if (rawStepConfig !== undefined && !isPlainObject(rawStepConfig)) {
    return {
      value: {},
      errors: [
        {
          code: "config.invalid",
          path,
          message: "Expected object for step config",
        },
      ],
    };
  }

  const value: Record<string, unknown> = { ...(rawStepConfig as Record<string, unknown> | undefined) };
  const errors: CompileErrorItem[] = [];

  const opsDecl = (step as any).contract?.ops as Record<
    string,
    { id: string; strategies: Record<string, TSchema> }
  > | null;
  if (!opsDecl) return { value, errors };

  for (const opKey of Object.keys(opsDecl)) {
    if (value[opKey] !== undefined) continue;
    const contract = opsDecl[opKey]!;
    const { defaultConfig } = buildOpEnvelopeSchema(contract.id, contract.strategies as any);
    value[opKey] = Value.Clone(defaultConfig);
  }

  return { value, errors };
}
```

Mechanical op normalization pass (strategy-selected, schema-driven):

```ts
function normalizeOpsTopLevel(
  step: StepModuleAny,
  stepConfig: Record<string, unknown>,
  ctx: NormalizeCtx<any, any>,
  compileOpsById: Readonly<Record<string, DomainOpCompileAny>>,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  const errors: CompileErrorItem[] = [];

  const opsDecl = (step as any).contract?.ops as Record<string, { id: string }> | null;
  if (!opsDecl) return { value: stepConfig, errors };

  // Bind compile ops (by id) in compiler-only code; runtime code binds against `runtimeOpsById` instead.
  // Important: binding errors are compiler errors (not hard throws) so they can be accumulated.
  let compileOps: Record<string, DomainOpCompileAny>;
  try {
    compileOps = bindCompileOps(opsDecl, compileOpsById) as any;
  } catch (err) {
    errors.push({
      code: "op.missing",
      path,
      message: err instanceof Error ? err.message : "bindCompileOps failed",
    });
    return { value: stepConfig, errors };
  }

  let value: Record<string, unknown> = stepConfig;
  for (const opKey of Object.keys(opsDecl)) {
    const op = (compileOps as any)[opKey] as DomainOpCompileAny | undefined;
    if (!op) {
      errors.push({
        code: "op.missing",
        path: `${path}/${opKey}`,
        message: `Missing op implementation for key "${opKey}"`,
        opKey,
        opId: (opsDecl as any)[opKey]?.id,
      });
      continue;
    }

    const envelope = value[opKey];
    if (envelope === undefined) continue;

    // Compile-time op normalization (optional).
    // In baseline code this is `op.resolveConfig(envelope, settings)`. In the target architecture
    // it is renamed to `op.normalize(envelope, ctx)` (compile-time only) and dispatches by
    // `envelope.strategy` under the hood.
    if (typeof (op as any).normalize === "function") {
      try {
        const next = (op as any).normalize(envelope, ctx);
        value = { ...value, [opKey]: next };
      } catch (err) {
        errors.push({
          code: "op.normalize.failed",
          path: `${path}/${opKey}`,
          message: err instanceof Error ? err.message : "op.normalize failed",
          opKey,
          opId: op.id,
        });
      }
    }
  }

  return { value, errors };
}
```

Why “top-level only” is a hard model constraint:
- The normalization layer is a wiring layer, not an AST layer.
- Nested traversal encourages config DSL creep and mega-op patterns; it is out-of-scope by design.

---

### 1.11 Ops-derived step schema (DX shortcut; constrained scope)

This is in-scope for this landing (explicit decision):

- **NEW (planned)**: if `defineStepContract` is called with `ops` and **no explicit schema**, auto-generate a strict step schema where:
  - each op key becomes a schema-required property whose schema is the op envelope schema (author input may omit these keys; the compiler prefills before strict schema normalization)
  - `additionalProperties: false` is defaulted inside the factory

Important: `schema` is not required just because `ops` exists:
- If the step is “ops-only” (no extra top-level config keys), the derived `schema` removes boilerplate (no duplicate schema authoring).
- If the step needs extra top-level fields, the author provides an explicit `schema`. Factories still derive and overwrite op-key property schemas from `ops`, but factories do not add any new non-op keys “for you” (O3: no “derive + extras” hybrid).
- In both cases, there is still only one step schema; there is no separate step `inputSchema`.

Concretely, the v1 authoring surface supports (and only supports) these shapes:
- `defineStepContract({ ..., schema })` — explicit schema-owned step config (no ops-derived schema).
- `defineStepContract({ ..., ops })` — ops-only step config; schema is derived from op envelopes (DX shortcut).
- `defineStepContract({ ..., ops, schema })` — explicit hybrid schema (author-owned); `ops` declares which envelope keys exist, and factories overwrite those op keys with their derived envelope schemas (authors do not duplicate envelope schemas).

Contract-level helper (no op impl bundling):

```ts
// Baseline today (repo-verified): shared envelope derivation exists:
// - `buildOpEnvelopeSchema(...)`: `packages/mapgen-core/src/authoring/op/envelope.ts`
//
// NEW (planned): `defineStepContract({ ops, schema? })` derives op-envelope schemas from the provided
// op contracts and (optionally) auto-derives the step schema when `schema` is omitted.
//
// DX intent:
// - authors do NOT need to call `opRef(...)` directly
// - they declare the op contracts; factories derive `OpRef` + envelope schemas using the shared builder
```

Binding helper (op refs → implementations):

```ts
// Canonical binding API: see §1.14.
//
// Key properties:
// - binds by op id (declared in contracts)
// - produces compile vs runtime op surfaces
// - runtime surface is structurally stripped (no normalize/defaultConfig/strategies)
```

Inline schema strictness (factory-only):
- If schema is supplied as an inline field-map object, factories wrap it with `additionalProperties: false`.
- If schema is supplied as an arbitrary `TSchema`, factories do not mutate it.

---

### 1.18 Single rule: where compile-time normalization is allowed

Rule (crisp):

> Only the compiler pipeline and its helpers may call `step.normalize` and op normalization (including per-strategy normalize). Runtime code must not.

Enforcement mechanisms (structural + lint-reinforced):

- runtime ops are bound using `bindRuntimeOps` against `runtimeOpsById`, which is structurally stripped (`DomainOpRuntime` has no normalize members)
- engine step interface remains `run(ctx, cfg)`; step.normalize is not part of engine runtime shape
- compiler modules are not exported in runtime-facing entrypoints
- lint boundaries forbid importing compile-surface registries or compiler normalization utilities into runtime step modules

---

### 1.19 Compiler error examples (pinned shape; illustrative)

Errors are accumulated as `CompileErrorItem[]` and surfaced as a single `RecipeCompileError` at the compiler boundary.

Example: unknown key in a step config (caught by strict schema normalization):

```ts
{
  code: "config.invalid",
  path: "/config/ecology/plot-vegetation/extraKey",
  message: "Unknown key",
  stageId: "ecology",
  stepId: "plot-vegetation",
}
```

Example: stage public compilation produced an unknown step id (pinned; the compiler does not silently ignore unknown keys in `rawSteps`):

```ts
{
  code: "stage.unknown-step-id",
  path: "/config/ecology/plot-vegetation-typo",
  message: "Unknown step id \"plot-vegetation-typo\" returned by stage.compile/toInternal (must be declared in stage.steps)",
  stageId: "ecology",
  stepId: "plot-vegetation-typo",
}
```

Example: missing op implementation in the compile registry (caught during binding / op normalization):

```ts
{
  code: "op.missing",
  path: "/config/ecology/plot-vegetation/trees",
  message: "bindCompileOps: missing op id \"ecology/planTreeVegetation\" for key \"trees\"",
  stageId: "ecology",
  stepId: "plot-vegetation",
  opKey: "trees",
  opId: "ecology/planTreeVegetation",
}
```

Example: step.normalize violates shape-preservation (returns a value that does not validate against the same schema):

```ts
{
  code: "normalize.not.shape-preserving",
  path: "/config/ecology/plot-vegetation",
  message: "step.normalize returned a value that does not validate against the step schema",
  stageId: "ecology",
  stepId: "plot-vegetation",
}
```

---

### 1.20 Testing patterns (compiler + hooks)

All compiler logic should be unit-testable without the engine. Tests should target the compiler entrypoint and the helper functions described above.

Minimal test skeleton (Bun test runner; repo-real):

```ts
import { expect, test } from "bun:test";
import { Type } from "typebox";

import {
  createStage,
  createStep,
  defineOpContract,
  defineStepContract,
} from "@swooper/mapgen-core/authoring";

import { compileRecipeConfig } from "@swooper/mapgen-core/compiler/recipe-compile";

test("compileRecipeConfig prefills missing op envelopes", () => {
  const PlanTrees = defineOpContract({
    kind: "plan",
    id: "ecology/planTreeVegetation",
    input: Type.Object({}, { additionalProperties: false }),
    output: Type.Object({}, { additionalProperties: false }),
    strategies: { default: Type.Object({}, { additionalProperties: false, default: {} }) },
  } as const);

  const contract = defineStepContract({
    id: "plot-vegetation",
    phase: "ecology",
    requires: [],
    provides: [],
    ops: { trees: PlanTrees },
  } as const);

  const step = createStep(contract, { run: async () => {} });

  const stage = createStage({
    id: "ecology",
    steps: [step] as const,
    knobsSchema: Type.Object({}, { additionalProperties: false, default: {} }),
  } as const);

  const compileOpsById = {
    "ecology/planTreeVegetation": { id: "ecology/planTreeVegetation", kind: "plan" } as any,
  };

  const compiled = compileRecipeConfig({
    env: {} as any,
    recipe: { stages: [stage] as const },
    config: { ecology: { "plot-vegetation": {} } },
    compileOpsById,
  });

  expect((compiled as any).ecology["plot-vegetation"].trees).toBeDefined();
});
```
