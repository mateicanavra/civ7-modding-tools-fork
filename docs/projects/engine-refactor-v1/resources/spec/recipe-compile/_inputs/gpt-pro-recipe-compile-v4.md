Below is a deep specification pass that resolves the ambiguities you listed. It is deliberately “mechanics-first”: where something is *supposed* to “just work,” I show the exact algorithm and the exact shapes involved so that implementation becomes execution, not further design.

I’m making a few small decisions explicitly where they were previously implicit (and in each case I’m choosing the lowest-risk, most mechanically-checkable option).

---

# 1) Variant surface area / modes

## 1.1 Explicit decision: single mode, optional `public` per stage

### In-scope to implement now (this landing)

There is exactly **one** configuration model:

* A recipe is composed of stages.
* Each stage has an **internal** config surface derived from its steps (always exists).
* A stage may optionally define a **public** schema + `compile` function:

  * If it does, stage config input is **public**, and stage compilation produces internal step configs.
  * If it does not, stage config input is assumed to already be **internal**, i.e. *public = internal* for that stage.

### Migration-only

None as “modes.” Incremental adoption is per-stage (see §4).

### Explicitly deferred (not implemented now)

* **Recipe-owned global facade public schema** (your Variant C).

  * We leave no hooks that change runtime semantics for this landing.
  * We may later add a thin facade layer that maps a recipe-level public view into stage public inputs, but that is strictly deferred.

**Result:** There is no recipe-level “Variant A/B/C.” There is only:

> “stage has explicit public schema” vs “stage uses internal schema as public schema.”

This collapses surface area without losing incremental adoption.

---

## 1.2 What “internal” means, precisely

A stage’s **internal** config shape is always:

```ts
type StageInternalInput = {
  [stepId: string]: unknown; // (author input form; partial allowed)
}
```

More specifically (typed by steps):

```ts
type StageInternalInputOf<TStage> =
  Partial<{
    [K in StepIdsOf<TStage>]: StepConfigInputOf<StepById<TStage, K>>
  }>
```

Key points:

* It is keyed by **step id**, not by op id.
* It is allowed to be **partial** (because defaults / op-prefill fill the rest).
* Unknown step ids are compile errors (strict).

The compiled output is a **compiled internal step config map**:

```ts
type StageInternalCompiledOf<TStage> = {
  [K in StepIdsOf<TStage>]: StepConfigCompiledOf<StepById<TStage, K>>
}
```

The compiled form is total (every step has a canonical config object).

---

## 1.3 What “public” means, precisely

A stage’s **public** config shape is:

* If `stage.public` is present: `Static<typeof stage.public>`
* Else: exactly `StageInternalInputOf<TStage>` (internal-as-public)

**Decision (explicit):** If a stage defines `public`, it must define `compile`.
Reason: there is no other safe way to map public → internal, and we do not want “implicit magic.”

---

## 1.4 Recipe-level composition when stages mix “public present” and “public absent”

Recipe config input is always a map by stage id:

```ts
type RecipeConfigInputOf<TRecipe> = {
  [stageId in StageIdsOf<TRecipe>]?: StageConfigInputOf<StageById<TRecipe, stageId>>
}
```

Where:

```ts
type StageConfigInputOf<TStage> =
  TStage extends { public: TSchema } ? Static<TStage["public"]> : StageInternalInputOf<TStage>;
```

### Concrete example: mixed stages

* `foundation` stage has **no** public schema → expects internal step map.
* `ecology` stage **does** have public schema → expects `ecology.public`.

So the recipe input shape is:

```ts
const config = {
  foundation: {
    "plates": { /* step internal config */ },
    "heightmap": { /* step internal config */ },
    // others omitted => defaults/prefill will fill
  },
  ecology: {
    vegetation: { density: 0.4, shrubsEnabled: true },
    biomeEdges: { strength: 0.55, passes: 3 },
  }
} satisfies RecipeConfigInput;
```

No “mode.” Just per-stage optional public.

---

# 2) Mechanical op normalization pass / envelopes

This section is intentionally concrete: exact discovery rules, exact pass ordering, exact helpers.

## 2.1 Non-negotiable invariants (explicit)

### I1 — Op envelopes are **only** discovered via `step.contract.ops`

We do not scan step config for “things that look like ops.” We do not support nested paths. We do not support arrays of ops. There is no “op AST.”

> If a config key is not listed in `step.contract.ops`, it is not treated as an op envelope.

### I2 — Op envelopes are **top-level properties** in the step config object

Top-level means: `stepConfig[opKey]`.

### I3 — “Mega-ops” are treated as single ops

If `featuresPlan` is internally composite, that is a **domain-private** concern. The normalization layer sees one envelope: `stepConfig.featuresPlan`.

---

## 2.2 What exactly is an “op envelope” in this architecture?

An op envelope is a plain object:

```ts
type Envelope = {
  strategy: string;
  config: object;
}
```

More specifically, for a given op contract:

```ts
type StrategySelection<Strategies> =
  { [K in keyof Strategies & string]: { strategy: K; config: Static<Strategies[K]> } }[keyof Strategies & string];
```

This matches the existing createOp pattern where `cfg.strategy` selects `strategy.run(input, cfg.config)`.

---

## 2.3 Exact compile pipeline ordering (including op normalization)

This is the definitive ordering for this landing.

### Phase A — Stage-level “public → internal” (optional)

For each stage:

1. Normalize stage config input (public or internal-as-public) via schema:

* If stage has `public`: validate/default/clean via `stage.public`
* Else: validate/default/clean via **derived internal stage schema**

2. Normalize knobs (if stage has `knobs` schema, else `{}`)

3. Produce **raw internal step configs**:

* If stage has `public`: `rawInternal = stage.compile({ env, knobs, config: publicValue })`
* Else: `rawInternal = internalValue` (identity)

At the end of Phase A, for every stage we have:

```ts
rawInternalStage: Partial<Record<stepId, unknown>>
```

### Phase B — Step canonicalization (always)

For each step in stage order:

4. `rawStep = rawInternalStage[stepId] ?? undefined`

5. **Prefill op defaults** (top-level, by contract ops keys)
   *(This is critical to allow step schema to require op fields without forcing authors to provide them.)*

6. Normalize step config via `step.contract.schema` (strict, defaulting + cleaning + unknown-key errors)

7. Apply `step.normalize` (value-only) if present, then re-normalize via `step.schema`

8. Apply **mechanical op normalization pass** (top-level by `step.contract.ops`), then re-normalize via `step.schema`

Output: `compiledStepConfig` for this step.

---

## 2.4 The strict schema normalization helper (exact semantics)

We mirror the current engine behavior you have today (default + clean + unknown-key errors), but we run it in recipe compilation, not in engine planning.

```ts
type CompileErrorItem = {
  code: "config.invalid" | "config.unknownKey" | "op.invalid" | "stage.compile.failed" | "step.normalize.failed";
  path: string;
  message: string;
};

type NormalizeResult<T> = { value: T; errors: CompileErrorItem[] };

function normalizeStrict<T>(
  schema: TSchema,
  rawValue: unknown,
  path: string
): NormalizeResult<T> {
  // Null is treated as user-provided explicit null (invalid for objects unless schema allows it)
  if (rawValue === null) {
    return {
      value: rawValue as T,
      errors: formatErrors(schema, rawValue, path).map(e => ({
        code: "config.invalid",
        path: e.path,
        message: e.message,
      }))
    };
  }

  const input = rawValue === undefined ? {} : rawValue;

  // Unknown key errors are computed on input (pre-clean), same as current engine compile
  const unknownKeyErrors = findUnknownKeyErrors(schema, input, path).map(e => ({
    code: "config.unknownKey" as const,
    path: e.path,
    message: e.message,
  }));

  // Default + clean (TypeBox Value.Default / Value.Clean)
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(schema, cloned);
  const cleaned = Value.Clean(schema, defaulted);

  const validationErrors = formatErrors(schema, defaulted, path).map(e => ({
    code: "config.invalid" as const,
    path: e.path,
    message: e.message,
  }));

  return { value: cleaned as T, errors: [...unknownKeyErrors, ...validationErrors] };
}

function assertNoErrors(errors: CompileErrorItem[]): void {
  if (errors.length > 0) throw new RecipeCompileError(errors);
}
```

Notes:

* This preserves: “unknown keys are errors but are still cleaned out.”
* This is the core mechanism that enables the “no runtime defaulting” policy (§5).

---

## 2.5 Prefill op defaults (exact behavior)

This is the first mechanical step that touches op envelopes.

**Input:** raw step config (possibly undefined)
**Output:** object where every op key has at least an envelope.

Rules:

* Only keys in `step.contract.ops` are prefilled.
* Only top-level keys.
* `undefined` means “missing” → replace with op default envelope.
* `null` is treated as explicitly invalid (will be caught by schema validation).

```ts
function prefillOpDefaults(
  step: StepModuleAny,
  rawStepConfig: unknown,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  const base = isPlainObject(rawStepConfig) ? { ...rawStepConfig } : {};
  const errors: CompileErrorItem[] = [];

  const ops = step.contract.ops;
  if (!ops) return { value: base, errors };

  for (const opKey of Object.keys(ops)) {
    const op = step.boundOps[opKey]; // bound implementation (see §3.4)
    if (!op) {
      errors.push({
        code: "op.invalid",
        path: `${path}/${opKey}`,
        message: `No bound op implementation for key "${opKey}"`,
      });
      continue;
    }

    if (base[opKey] === undefined) {
      base[opKey] = op.defaultConfig; // envelope default (strategy + config)
    }
  }

  return { value: base, errors };
}
```

This is deliberately *not* “schema defaulting.” It is compile-time assembly of canonical internal config.

---

## 2.6 Mechanical op normalization pass (exact behavior)

This is where we normalize op envelopes by calling op-level `normalize` (renamed from resolveConfig) and applying strict schema checks.

**Discovery:** iterate `Object.keys(step.contract.ops)` only.
**No nested traversal.**

### 2.6.1 Op normalization entry point

```ts
function normalizeOpsTopLevel(
  step: StepModuleAny,
  stepConfig: Record<string, unknown>,
  ctx: NormalizeCtx,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  const ops = step.contract.ops;
  if (!ops) return { value: stepConfig, errors: [] };

  const out = { ...stepConfig };
  const errors: CompileErrorItem[] = [];

  for (const opKey of Object.keys(ops)) {
    const op = step.boundOps[opKey];
    if (!op) {
      errors.push({
        code: "op.invalid",
        path: `${path}/${opKey}`,
        message: `Missing bound op for "${opKey}"`,
      });
      continue;
    }

    const rawEnvelope = out[opKey];

    const normalized = normalizeOpEnvelope(op, rawEnvelope, ctx, `${path}/${opKey}`);
    errors.push(...normalized.errors);

    // even if errors exist, write value (so caller can see cleaned form in diagnostics)
    out[opKey] = normalized.value;
  }

  return { value: out, errors };
}
```

### 2.6.2 Normalize a single op envelope (strategy-selected, schema-driven)

This avoids ambiguity around union schemas by selecting the strategy explicitly (same model as createOp runtime dispatch).

```ts
function normalizeOpEnvelope(
  op: DomainOpAny,          // bound op implementation
  rawEnvelope: unknown,
  ctx: NormalizeCtx,
  path: string
): { value: unknown; errors: CompileErrorItem[] } {
  // Missing => default envelope
  const envelope = rawEnvelope === undefined ? op.defaultConfig : rawEnvelope;

  // Must be a plain object
  if (!isPlainObject(envelope)) {
    return {
      value: envelope,
      errors: [{
        code: "op.invalid",
        path,
        message: `Op envelope must be a plain object`,
      }],
    };
  }

  const strategyId = (envelope as any).strategy;
  const rawConfig = (envelope as any).config;

  if (typeof strategyId !== "string") {
    return {
      value: envelope,
      errors: [{
        code: "op.invalid",
        path: `${path}/strategy`,
        message: `Op envelope requires "strategy: string"`,
      }],
    };
  }

  const strategy = op.strategies[strategyId];
  if (!strategy) {
    return {
      value: envelope,
      errors: [{
        code: "op.invalid",
        path: `${path}/strategy`,
        message: `Unknown strategy "${strategyId}" for op "${op.id}"`,
      }],
    };
  }

  // Normalize inner strategy config strictly by that strategy's schema
  const normalizedInner = normalizeStrict(strategy.config, rawConfig, `${path}/config`);
  const innerErrors = normalizedInner.errors.map(e => ({
    ...e,
    code: e.code === "config.invalid" || e.code === "config.unknownKey" ? "op.invalid" : e.code,
  }));

  let inner = normalizedInner.value;
  const errors: CompileErrorItem[] = [...innerErrors];

  // Strategy-level normalize hook (value-only)
  if (strategy.normalize) {
    try {
      inner = strategy.normalize(inner, ctx);
    } catch (err) {
      errors.push({
        code: "op.invalid",
        path: `${path}/config`,
        message: err instanceof Error ? err.message : `normalize failed`,
      });
    }

    // Re-normalize after normalize hook
    const re = normalizeStrict(strategy.config, inner, `${path}/config`);
    errors.push(...re.errors.map(e => ({ ...e, code: "op.invalid" as const })));
    inner = re.value;
  }

  const result = { strategy: strategyId, config: inner };

  // Optional: validate envelope itself has no extra keys (strictness)
  // We do this via a minimal hard-coded envelope schema:
  const envelopeSchema = Type.Object(
    { strategy: Type.String(), config: Type.Any() },
    { additionalProperties: false }
  );
  const envCheck = normalizeStrict(envelopeSchema, result, path);
  errors.push(...envCheck.errors.map(e => ({ ...e, code: "op.invalid" as const })));

  return { value: envCheck.value, errors };
}
```

### Why this model is explicitly “top-level only”

Because the normalization layer is a *wiring* layer, not an AST layer. The only coupling we want is:

* step knows which ops it binds (`step.contract.ops`)
* compiler knows where those envelopes live (top-level keys)

Nested traversal would:

* require path declarations,
* encourage mega-op patterns,
* and create “config DSL” creep.

So we do not do it.

---

## 2.7 Complete concrete example of mechanical op normalization

### Step contract + bound ops

Assume a step has:

```ts
contract.ops = {
  trees: /* op ref */,
  shrubs: /* op ref */,
}
```

and at binding time (see §3.4) it has:

```ts
boundOps = {
  trees: ecology.ops.planTreeVegetation,
  shrubs: ecology.ops.planShrubVegetation,
}
```

### Raw step config input (user/stage provided)

```ts
const rawStepConfig = {
  densityBias: 0.1,
  trees: { strategy: "default", config: { density: 0.4 } },
  // shrubs omitted entirely
};
```

### Compiler execution (exact)

1. `prefillOpDefaults` injects missing `shrubs`:

```ts
prefilled = {
  densityBias: 0.1,
  trees: { strategy: "default", config: { density: 0.4 } },
  shrubs: ecology.ops.planShrubVegetation.defaultConfig,
};
```

2. `normalizeStrict(step.schema, prefilled)` applies defaults/cleans unknown keys for *all fields*, including non-op fields.

3. `step.normalize` may apply bias to both envelopes (value-only)

4. `normalizeOpsTopLevel` runs:

* `normalizeOpEnvelope(treesOp, cfg.trees, ...)`
* `normalizeOpEnvelope(shrubsOp, cfg.shrubs, ...)`

No nesting, no arrays, no scanning.

---

# 3) Ops-derived schema shortcut (tractability in TypeScript)

You asked for “prove it’s tractable (or not).” Here is a tractable approach that lands meaningful DX now **without** TypeScript going off the deep end.

## 3.1 Explicit decision: we implement ops-derived step schema **now**, with a constrained scope

### Implement now (scope)

* If `defineStep` is called with `ops` and **no explicit schema**, we auto-generate a strict step schema where:

  * each op key becomes a required property whose schema is the op envelope schema
  * `additionalProperties: false` is defaulted

This covers the common “router step” case and is a real DX win.

### Not required for this landing

* Automatically merging “custom step fields” + ops-derived fields with perfect type-level disjoint key enforcement.

  * We can still support it ergonomically (see §3.3), but we do not block the landing on perfect TS constraints.

---

## 3.2 The core typing is straightforward

### Step contract supports schema omission when ops are present

```ts
type OpRef = Readonly<{
  id: string;
  // envelope schema, derived from op contract (not implementation)
  config: TSchema;
}>;

type OpsMap = Readonly<Record<string, OpRef>>;

type SchemaFromOps<Ops extends OpsMap> =
  TObject<{ [K in keyof Ops & string]: Ops[K]["config"] }>;

type StepContractBase<Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  ops?: OpsMap;
}>;

// Overload A: explicit schema
export function defineStep<
  const Id extends string,
  const Schema extends TSchema,
  const Ops extends OpsMap | undefined
>(def: StepContractBase<Id> & { schema: Schema; ops?: Ops }): StepContractBase<Id> & { schema: Schema; ops?: Ops };

// Overload B: schema omitted, ops required => derived schema
export function defineStep<
  const Id extends string,
  const Ops extends OpsMap
>(def: StepContractBase<Id> & { ops: Ops; schema?: undefined }): StepContractBase<Id> & { schema: SchemaFromOps<Ops>; ops: Ops };
```

### Runtime derivation is also straightforward

```ts
export function defineStep(def: any): any {
  // Inline strictness injection happens inside this factory (see §3.5)
  if (!def.schema) {
    if (!def.ops) throw new Error(`defineStep(${def.id}) requires schema or ops`);

    const fields: Record<string, TSchema> = {};
    for (const k of Object.keys(def.ops)) fields[k] = def.ops[k].config;

    def.schema = Type.Object(fields, { additionalProperties: false });
  }

  return def;
}
```

### DX / inference quality

* With `ops` declared as `as const`, keys are preserved.
* The returned `schema` type becomes a concrete `TObject<{ trees: TSchema; shrubs: TSchema }>` etc.
* `Static<typeof contract.schema>` produces the correct shape: `{ trees: EnvelopeType; shrubs: EnvelopeType }`

This is viable and not brittle.

---

## 3.3 Optional ergonomics: allowing extra step fields without repeating op fields

If you want to avoid repeating op fields in schema, we can support:

```ts
defineStep({
  id: "plot-vegetation",
  ops: { trees: opRef(...), shrubs: opRef(...) },
  schema: {
    densityBias: Type.Number({ default: 0 }),
    // no need to write trees/shrubs here; factory merges them
  }
})
```

**Mechanics (runtime):**

* If `schema` is a plain object (field map), the factory builds a strict object schema:

  * merges schema fields + ops fields
  * throws if collision

**Typing reality (TS):**

* We can type this as:

```ts
type InlineFields = Record<string, TSchema>;

type MergeFields<A extends InlineFields, B extends InlineFields> = A & B;
```

This gives good autocomplete but does not perfectly prevent collisions at compile time. Collision prevention is runtime (explicit throw). This is acceptable for landing because:

* collisions are rare and obvious
* runtime throw happens during module initialization, not mid-run

If you want *perfect* compile-time collision prevention, it becomes a TS type puzzle with diminishing returns. I recommend deferring that.

---

## 3.4 Binding: contracts vs implementations (so contracts don’t bundle op impls)

This is the part you explicitly called out (“match behind the scenes”).

### Explicit decision: Step contracts list **OpRefs** (contract-level), not op implementations

We introduce a contract-level helper:

```ts
function opRef<C extends OpContract<any, any, any, any, any>>(contract: C): OpRef {
  // derive envelope schema from the contract’s strategies
  const config = Type.Unsafe<any>(); // real code would build discriminated union envelope schema
  return { id: contract.id, config };
}
```

(Implementation detail: you can reuse the same internal builder createOp uses to compute the envelope schema from strategy schemas.)

### Step module binding resolves OpRef → actual op implementation by id

At step creation, we bind:

```ts
type DomainRegistry = { byId: Record<string, DomainOpAny> };

function bindOps(ops: OpsMap, domain: DomainRegistry): Record<string, DomainOpAny> {
  const out: Record<string, DomainOpAny> = {};
  for (const key of Object.keys(ops)) {
    const id = ops[key].id;
    const impl = domain.byId[id];
    if (!impl) throw new Error(`Missing op impl for "${id}" (key "${key}")`);
    out[key] = impl;
  }
  return out;
}
```

So:

* contracts import only op contracts (cheap)
* stage/recipe wiring imports domain implementation routers once (expected)
* steps run handlers receive ops injected (no direct import)

This also makes the mechanical op normalization pass unambiguous:

* it operates on `step.boundOps` (implementations)
* it discovers envelopes via `step.contract.ops` keys

---

## 3.5 Inline schemas default `additionalProperties: false` (factory-only)

You required:

* inline schema definitions should not need `additionalProperties`
* default to `false`
* only in factories

**Exact behavior:**

* If user supplies `schema: { ...fields }` (inline field map), the factory wraps it:

```ts
Type.Object(fields, { additionalProperties: false, ...options })
```

* If user supplies `schema: SomeTSchema` already, the factory does not mutate it (we do not attempt to rewrite arbitrary schemas).

This keeps strictness consistent without introducing a globally reusable schema builder.

---

# 4) Incremental adoption / “mixed-mode recipes”

Because we have one mode, this becomes simple and mechanical.

## 4.1 Incremental adoption mechanism (explicit)

Adoption happens by stage:

* Initially: stages omit `public` and `compile` → internal-as-public.
* Later: a stage adds `public` + `compile` → recipe config input changes **only for that stage key**.

No recipe-wide mode flag. No parallel systems.

## 4.2 Concrete before/after

### Before: all internal-as-public

```ts
const config = {
  foundation: {
    plates: { /* internal */ },
  },
  ecology: {
    "plot-vegetation": { /* internal */ },
  }
};
```

### After: ecology adds public

```ts
const config = {
  foundation: {
    plates: { /* still internal */ },
  },
  ecology: {
    vegetation: { density: 0.4, shrubsEnabled: true }, // now public
  }
};
```

Compilation always outputs the same compiled internal tree:
`{ foundation: { ...stepIds... }, ecology: { ...stepIds... } }`

So runtime engine behavior is stable across adoption.

---

# 5) Hard policy: no runtime defaulting helpers

You want this as an explicit policy with a basic enforcement story.

## 5.1 Policy statement (explicit)

### P1 — Runtime execution must never default/clean configs

* Step `run(...)` and op strategy `run(...)` are runtime execution.
* They must treat configs as already canonical.
* They must not call schema defaulting or cleaning utilities.

### P2 — All defaulting/cleaning happens in recipe compilation

* Stage compilation, step normalization, op normalization.
* Engine plan compilation validates only; it does not mutate configs.

---

## 5.2 Architectural enforcement (minimal, real)

### Enforcement E1 — Defaulting utilities live in compiler-only modules

* `normalizeStrict`, `findUnknownKeyErrors`, any wrapper around `Value.Default/Clean`
* live in something like:

```
packages/mapgen-core/src/compiler/normalize.ts
```

and are **not exported** from runtime/engine entrypoints.

Runtime-facing entrypoints (what mods import for ops/steps) do not re-export compiler helpers.

### Enforcement E2 — Make “runtime defaulting” hard to do accidentally

A simple lint rule (recommended, not overcomplicated):

* forbid importing `@sinclair/typebox/value` in:

  * `mods/**/domain/**`
  * `mods/**/recipes/**/steps/**`
  * `packages/**/src/engine/**`
  * `packages/**/src/core/**`

Allow it only in `packages/**/src/compiler/**`.

This directly prevents “applySchemaDefaults in run” from creeping back.

### Enforcement E3 — Runtime wrappers do not call defaulting

* `runValidated` may validate and throw, but must not default/clean/mutate.

This is mechanically checkable in code review.

---

# 6) Collapsed deliverable: single-mode spec summary

Here is the complete “single-mode world” in one place:

1. Stage public is optional.
2. If stage has no public: stage config input is internal step map (partial allowed).
3. If stage has public: stage.compile maps public → internal step map (partial allowed).
4. Compiler then:

   * prefill op defaults (top-level, by `step.contract.ops` keys)
   * normalize step schema strictly (unknown key errors + default + clean)
   * run step.normalize (value-only)
   * normalize ops (top-level only, strategy-selected)
   * re-normalize step schema strictly
5. Engine validates only and executes; no config defaulting at runtime.

This is minimal variance and maximal determinism.

---

# 7) Remaining major open problems (ideally few)

I do not think there are many left, but there are two worth surfacing because they can hide implementation complexity if not acknowledged:

## O1 — How exactly op envelope schemas are derived from op contracts (contract-only opRefs)

We have a clear requirement and shape (`opRef(contract) -> { id, configSchema }`), but you need to decide whether:

* you reuse existing internal builders from `createOp` (recommended), or
* you build a second envelope-schema builder that must remain consistent forever (not recommended).

**Recommendation:** refactor/create a shared internal helper:

* `buildOpEnvelopeSchema(contract.strategies)` used by both `createOp` and `opRef`.

This is implementation work, not conceptual risk, but it should be called out.

## O2 — Exact author-input typing for “internal-as-public” stages

Mechanically, internal-as-public should accept partial step maps. But your current `RecipeConfigOf<TStages>` type is total (requires every step id key). That mismatch exists today because engine defaulting masks it.

**Decision options (small but real):**

* (Preferred) Introduce separate types:

  * `RecipeConfigInputOf<TStages>` (partial allowed)
  * `CompiledRecipeConfigOf<TStages>` (total)
* Or keep the existing total type and accept that power users write `{ stepId: {} }` boilerplate.

This is a DX decision, not a runtime architecture risk—but it should be made explicitly.

---

If you want, the next step is to choose one real stage (e.g., `ecology`) and write the **complete paper spec** for it:

* exact public schema (or none)
* exact compile function output (per step id)
* exact step ops keys
* and show a “raw config → compiled config” trace through the functions above

That exercise usually flushes out any remaining hidden edge cases in a way nothing else does.

---

# 8) Lock-in: knobs model (single author surface, ctx-threaded to step normalization)

This section resolves the remaining knobs ambiguity and is intended as a hard invariant for future revisions.

## 8.1 Invariants (explicit)

### K1 — Knobs are always a field in the stage config surface

* Knobs live at `stageConfig.knobs`.
* There is exactly **one** author-facing surface per stage: the stage config object contains:

  * `knobs` (optional), and
  * step configs keyed by step id (partial allowed).

There is **no** separate “knobs input” at the recipe/engine API boundary.

### K2 — The compiler extracts knobs once and threads them through normalization via ctx

* The compiler performs:

  * stage config validation/clean/default (public schema if present, otherwise derived internal schema),
  * then extraction of `knobs` from the stage config object,
  * then step canonicalization passes where `step.normalize(...)` receives `{ env, knobs }` via ctx.

Knobs do not become a runtime execution parameter surface; they are compile-time normalization context.

### K3 — Step configs do not contain knobs fields

* Step config objects are keyed by step ids at the stage boundary.
* Individual per-step config objects are normalized/canonicalized without embedding a `knobs` field.

### K4 — Reserved key rule: no step id may be `"knobs"`

Because knobs are represented as `stageConfig.knobs`, `"knobs"` is a reserved identifier and cannot be a step id.

## 8.2 Canonical types (illustrative)

Internal stage input explicitly allows knobs:

```ts
type StageInternalInput<StepId extends string, Knobs> =
  Partial<Record<StepId, unknown>> & { knobs?: Knobs };

// invariant: no step id may be "knobs"
```

Step normalization receives knobs via ctx:

```ts
type NormalizeCtx<Env, Knobs> = { env: Env; knobs: Knobs };

type StepNormalize<TConfig, Env, Knobs> =
  (config: TConfig, ctx: NormalizeCtx<Env, Knobs>) => TConfig;
```

## 8.3 Canonical compiler extraction (mechanical, always-on)

The compiler extracts knobs once per stage from the stage config object:

```ts
const { knobs = {}, ...rawStepMap } = stageConfig;
// rawStepMap is keyed by step id
// step.normalize(stepConfig, { env, knobs })
```

This is mechanical plumbing derived from the single author-facing stage config surface; it is not a second author input.

## 8.4 Relationship to compile vs normalize (and to §2.3 Phase A)

* `compile` remains the shape-changing hook for mapping a stage’s **public** view into an internal step-id-keyed map.
  * It is required only when `public !== internal` for that stage.
* `normalize` remains shape-preserving canonicalization; it runs under recipe compilation and may use `{ env, knobs }` as context.

Important clarification for the “public === internal” case:

* “Public defaults to internal” does **not** mean “skip compilation”.
* It also should not be interpreted as “the stage boundary is a literal identity function over the entire stage config object”.
  * Even when the public→internal mapping is identity, the compiler still performs the mechanical extraction shown in §8.3 and then runs the always-on normalization pipeline.

This eliminates the “parallel knobs track” ambiguity while preserving the always-on compilation and normalization model.
