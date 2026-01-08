Below is a **minimal-change reconciliation** of the “knobs vs config” ambiguity between V3’s locked invariant (“single author-facing surface per stage”) and V4’s mechanics (which currently normalize `knobs` separately and define “internal stage input” as a stepId-keyed map).

This is **not a redesign**. It is a clarification and a small type/mechanics adjustment so the model is self-consistent, non-magical, and implementation-safe.

---

## A) What was contradictory between V3 and V4

### What V3 locks in (as you summarized)

1. **Single author-facing surface per stage**
   Knobs are **part of the stage config surface**, not a parallel second input.

2. **Always-on compile/normalize pass**
   Engine is not the fallback canonicalizer. The compiler always runs the full pipeline.

3. **Hard policy: no runtime defaulting/cleaning**
   No schema defaulting helpers inside runtime handlers.

### What V4 text/mechanics currently imply

V4 currently describes:

* a separate “Normalize knobs” step and
* `stage.compile({ env, knobs, config })`
* while also defining “internal stage input” as a **stepId-keyed map**.

That combination creates a **real semantic tension**:

* If the stage’s author-facing config is a **stepId map**, there is **no slot** for knobs unless you:

  * special-case a reserved step id (e.g. `"knobs"`), or
  * introduce a second parallel author input for knobs, or
  * add runtime detection (“if it looks like step map treat as internal else public”).
* All three are precisely what V3’s invariant is trying to avoid.

**Conclusion:** This is not merely wording. The “internal stage input is stepId map” statement in V4 is incompatible with “knobs live in the stage config surface” unless we revise the internal stage input shape (or introduce special-casing/mode detection, which we must not).

The good news: V4’s separate `knobs` parameter and `stage.compile({ env, knobs, config })` is **fine as internal plumbing** *if* the author-facing surface is still a single object and knobs are extracted from it deterministically.

---

## B) Minimal, self-consistent revision (one concrete shape)

### Chosen resolution

**Option B (reserved key) + explicit extraction**:

* The **stage config surface** is always **one object** that contains:

  * `knobs` under a reserved key `"knobs"` (optional, default `{}`), and
  * either:

    * stage **public fields** (if stage has a public view), or
    * **stepId keys** (if stage is internal-as-public).

So the stage config surface is:

```ts
// Stage config surface (author-facing):
//   knobs + (public fields OR stepId fields)
// No second parallel knobs input.
type StageSurfaceInput =
  { knobs?: object } & Record<string, unknown>;
```

But it is *not* “any record”: we generate a strict object schema per stage so it is non-magical and rejects unknown keys.

### Reserved key rule

* `"knobs"` is reserved:

  * It cannot be a step id.
  * It cannot be a public field name.
* This is enforced at stage construction time, not at runtime.

This is the least magical option and keeps the “single stage surface” invariant literal.

---

## C) Revised types and signatures (minimal changes)

### C1) Stage definition (authoring-time)

A stage still *optionally* defines a `public` schema; knobs are always part of the stage surface.

```ts
type StageDef<
  StageId extends string,
  Steps extends readonly StepModuleAny[],
  KnobsSchema extends TSchema,              // schema for stage.knobs object
  PublicSchema extends TSchema | null       // schema for stage public fields (excluding knobs)
> = {
  id: StageId;
  steps: Steps;

  // knobs schema defines the shape of stageConfig.knobs
  knobs?: KnobsSchema;

  // optional public view schema (EXCLUDES knobs)
  public?: PublicSchema;

  // required iff public is present
  compile?: (args: {
    env: Env;
    knobs: Static<KnobsSchema>;
    config: Static<NonNullable<PublicSchema>>;
  }) => Partial<StageStepMapInput<Steps>>;
};
```

Key: `public` schema is for the **non-knob portion**, so the author-facing object is still one object with `knobs` plus public fields.

### C2) Computed stage surface schema (the single author-facing schema)

At `createStage(...)` time we compute:

* `knobsSchemaEffective`:

  * if `def.knobs` present: use it (and default it to `{}` if not already)
  * else: use a strict empty object schema with default `{}`

Then compute stage surface schema:

#### If stage has explicit public view:

Stage surface includes:

* `knobs: knobsSchemaEffective`
* plus **public fields** (from `def.public`)

#### If stage is internal-as-public:

Stage surface includes:

* `knobs: knobsSchemaEffective`
* plus **stepId keys**, each typed as `Type.Optional(Type.Unknown())`

> Important: for internal-as-public, step configs are *not validated* at stage validation time; strict validation happens at the step canonicalization phase (after op-prefill). This avoids premature failure when step schemas require op envelopes that we intend to prefill.

Concrete builder (code-like):

```ts
function buildStageSurfaceSchema(stage: StageDefAny): TObject {
  const knobsSchema = stage.knobs ?? strictEmptyObjectSchemaWithDefault();

  if (stage.public) {
    // stage.public must be an object schema (or inline object field-map) in this architecture.
    // We merge by constructing a new object:
    return strictObjectSchema({
      knobs: knobsSchema,
      ...objectSchemaFields(stage.public), // public fields only
    }, { default: { knobs: {} } });
  }

  // internal-as-public: top-level stepId keys + knobs
  const stepFields: Record<string, TSchema> = {};
  for (const step of stage.steps) {
    assert(step.contract.id !== "knobs");
    stepFields[step.contract.id] = Type.Optional(Type.Unknown());
  }

  return strictObjectSchema({
    knobs: knobsSchema,
    ...stepFields,
  }, { default: { knobs: {} } });
}
```

Where `strictObjectSchema(fields)` is your factory-only shorthand that auto-injects `additionalProperties:false`.

### C3) Stage “toInternal” always exists (no runtime detection)

To eliminate any temptation toward “if it looks like X,” every stage exposes one internal plumbing method:

```ts
type StageRuntime = {
  id: string;
  surfaceSchema: TObject; // the single author-facing surface schema (includes knobs)
  toInternal: (args: { env: Env; stageConfig: any /* already normalized */ }) => {
    knobs: any;
    rawSteps: Partial<Record<string, unknown>>; // stepId-keyed partial configs
  };
};
```

Implementation:

```ts
function toInternal({ env, stageConfig }: { env: Env; stageConfig: any }) {
  const knobs = stageConfig.knobs ?? {};

  // configPart = everything except knobs
  const { knobs: _omit, ...configPart } = stageConfig;

  if (stage.public) {
    // validate configPart against stage.public (strict) BEFORE calling compile
    const publicCfg = normalizeStrict(stage.public, configPart, `/stages/${stage.id}`).value;

    if (!stage.compile) throw new Error(`Stage ${stage.id} has public but no compile`);

    const rawSteps = stage.compile({ env, knobs, config: publicCfg });
    return { knobs, rawSteps };
  }

  // internal-as-public: configPart is already a stepId-keyed map (by schema construction)
  return { knobs, rawSteps: configPart };
}
```

This keeps V4’s `stage.compile({ env, knobs, config })` signature (good internal clarity) **without** implying a separate author-facing knobs input.

### C4) Step normalize / op normalize signatures (unchanged in spirit, clarified in meaning)

These compile-time hooks receive knobs as part of compilation context (extracted from stage config surface).

```ts
type NormalizeCtx<Knobs> = {
  env: Env;
  knobs: Knobs; // stageConfig.knobs (already normalized)
};

type StepNormalize<TStepCfg, Knobs> =
  (cfg: TStepCfg, ctx: NormalizeCtx<Knobs>) => TStepCfg;

type OpNormalize<TOpEnvelope, Knobs> =
  (cfg: TOpEnvelope, ctx: NormalizeCtx<Knobs>) => TOpEnvelope;
```

Runtime `run(...)` sees neither knobs nor defaulting utilities.

---

## D) “Public === internal” meaning (revised precisely)

With knobs-as-fields, the old V4 statement:

> “rawInternal = internalValue (identity)”

is **not literally true** if you treat “internalValue” as the whole stage object, because the stage object includes `knobs`.

### Revised invariant (minimal change, precise)

* “Public→internal mapping can be identity **for the step-config portion of the stage object**, but stage compilation is never skipped.”
* More concretely:

  * For internal-as-public stages: `rawSteps = omit(stageConfig, "knobs")` (identity on the step-map portion).
  * The compiler still:

    * validates/defaults/cleans stage surface,
    * extracts knobs,
    * runs full step/op canonicalization pipeline.

This avoids hidden fallback behavior because nothing is detected by shape—everything is determined by stage definition.

---

## E) Knobs: “only normalize, never compile” — coherent or not?

### I accept the statement, with one precise interpretation

* Knobs **do not become runtime context**.
* Knobs are **consumed** during compilation:

  * stage.compile may use knobs to choose strategies or set values
  * step.normalize may use knobs to clamp or bias values
  * op.normalize may use knobs to fill defaults or clamp values
* The compiled output is only per-step configs; knobs do not persist.

So knobs “only normalize” is coherent if it means:

> Knobs influence canonicalization decisions and values, but they are not themselves a config payload that persists into the compiled plan/runtime.

### Concrete example: knobs influence without a separate pipeline

* Author writes `ecology.knobs.vegetationScale = 1.2`
* Stage compile multiplies `density` by that scale and emits step config with a concrete `trees.config.density = 0.48`.
* Step/op normalization may further clamp, default, or set derived values.
* Runtime sees only the normalized envelopes and values.

No separate knobs pipeline is needed because knobs live in the same stage config surface object.

---

## F) Worked example #1 (end-to-end with two stages, knobs inside stage config object)

This is exactly what you requested: 2 stages, knobs present in each, one stage has public+compile, one stage is internal-as-public.

### F1) Setup (stages)

#### Stage A: `foundation` (internal-as-public; no public schema)

* Steps: `plates`, `heightmap`
* Knobs: `{ ridgeSharpness: number }`

**Stage surface schema becomes:**

```ts
foundationStage.surfaceSchema = strictObjectSchema({
  knobs: strictObjectSchema({
    ridgeSharpness: Type.Number({ default: 0.5, minimum: 0, maximum: 1 })
  }, { default: {} }),

  plates: Type.Optional(Type.Unknown()),
  heightmap: Type.Optional(Type.Unknown()),
}, { default: { knobs: {} }});
```

#### Stage B: `ecology` (explicit public+compile)

* Steps: `plot-vegetation`
* Knobs: `{ vegetationScale: number }`
* Public fields: `{ vegetation: { density: number; shrubsEnabled: boolean } }`

**Stage surface schema becomes:**

```ts
ecologyStage.surfaceSchema = strictObjectSchema({
  knobs: strictObjectSchema({
    vegetationScale: Type.Number({ default: 1, minimum: 0.25, maximum: 2 })
  }, { default: {} }),

  vegetation: strictObjectSchema({
    density: Type.Number({ default: 0.35, minimum: 0, maximum: 1 }),
    shrubsEnabled: Type.Boolean({ default: true }),
  }, { default: {} }),
}, { default: { knobs: {} }});
```

### F2) Author-facing recipe input (single surface per stage)

```ts
const recipeInput = {
  foundation: {
    knobs: { ridgeSharpness: 0.7 },
    plates: {
      // partial step config; op envelopes may be omitted
      iterations: 3
    }
    // heightmap omitted entirely
  },

  ecology: {
    knobs: { vegetationScale: 1.2 },
    vegetation: { density: 0.4, shrubsEnabled: true }
  }
};
```

Knobs are clearly part of stage config objects.

### F3) Phase A: per-stage validation + toInternal extraction

#### A1) Foundation stage validation

Normalize `recipeInput.foundation` against `foundationStage.surfaceSchema`:

Result:

```ts
foundationStageConfig = {
  knobs: { ridgeSharpness: 0.7 },
  plates: { iterations: 3 },
  // heightmap stays undefined (optional)
}
```

Now `foundationStage.toInternal({ env, stageConfig })`:

* `knobs = stageConfig.knobs`
* `rawSteps = omit(stageConfig, "knobs")`

So:

```ts
foundationInternal = {
  knobs: { ridgeSharpness: 0.7 },
  rawSteps: {
    plates: { iterations: 3 }
    // heightmap missing
  }
};
```

#### A2) Ecology stage validation

Normalize `recipeInput.ecology` against `ecologyStage.surfaceSchema`:

Result:

```ts
ecologyStageConfig = {
  knobs: { vegetationScale: 1.2 },
  vegetation: { density: 0.4, shrubsEnabled: true }
};
```

Now `ecologyStage.toInternal({ env, stageConfig })`:

* `knobs =  { vegetationScale: 1.2 }`
* `configPart = omit(stageConfig, "knobs") = { vegetation: {...} }`
* validate `configPart` against `ecologyStage.public` (same as vegetation object here)
* call `ecologyStage.compile({ env, knobs, config })`

Suppose compile returns:

```ts
rawSteps = {
  "plot-vegetation": {
    densityBias: 0,
    trees: { strategy: "default", config: { density: 0.4 * 1.2, jitter: 0.1 } },
    // shrubs omitted; prefill will fill it
  }
};
```

So:

```ts
ecologyInternal = {
  knobs: { vegetationScale: 1.2 },
  rawSteps: { "plot-vegetation": { ... } }
};
```

### F4) Phase B: step canonicalization pipeline (per stage, per step)

Now we run the always-on pipeline for every step:

#### B1) Foundation step: `plates`

* `rawStep = foundationInternal.rawSteps["plates"] ?? undefined`
* `prefillOpDefaults(step, rawStep)` injects missing op envelopes if the step binds ops
* `normalizeStrict(step.schema, ...)` produces canonical internal config
* `step.normalize(cfg, { env, knobs: foundationInternal.knobs })` (optional)
* `normalizeOpsTopLevel(...)` applies op.normalize for each bound op key
* re-`normalizeStrict(step.schema, ...)`

**Important:** knobs influence `step.normalize` and `op.normalize` here, but knobs are not persisted.

#### B2) Ecology step: `plot-vegetation`

* `rawStep = ecologyInternal.rawSteps["plot-vegetation"]`
* prefill missing `shrubs` envelope
* normalize strict against step schema
* step.normalize may apply any knob-based bias (if present)
* op normalization runs for `trees` and `shrubs` keys (top-level only)

### F5) Final compiled output (what engine sees)

The final compiled per-step configs contain no knobs:

```ts
compiledRecipeConfig = {
  foundation: {
    plates: { /* canonical internal step config */ },
    heightmap: { /* canonical internal step config (fully defaulted) */ },
  },
  ecology: {
    "plot-vegetation": {
      densityBias: 0,
      trees: { strategy: "default", config: { density: 0.48, jitter: 0.1, /* derived defaults */ } },
      shrubs: { strategy: "default", config: { density: 0.288, /* ... */ } },
    }
  }
};
```

### Where V4 would have broken the invariant

* If V4’s “internal stage input is stepId map” were taken literally, `foundation` input could not include knobs without:

  * treating `"knobs"` as a magical pseudo-step id, or
  * making knobs a separate top-level recipe input.
    Both violate “single author-facing surface per stage.”

With the revision above, V4’s `stage.compile({ env, knobs, config })` remains valid internal plumbing, but knobs are clearly derived from the stage surface, not a parallel surface.

---

## G) Worked example #2 (internal-as-public stage, showing why step configs are `Unknown` at stage validation)

This surfaces the hidden challenge: step schemas may require op envelopes, but those envelopes are prefilling later.

### Stage: `foundation` internal-as-public

User provides:

```ts
foundation: {
  knobs: { ridgeSharpness: 0.7 },
  plates: { iterations: 3 } // note: does not include required op envelope fields
}
```

If stage validation tried to validate `plates` against `platesStep.schema` immediately, it might fail (because `platesStep.schema` might require `ops` envelopes that are not present yet).

So the stage surface schema uses:

```ts
plates: Type.Optional(Type.Unknown())
```

Then in step canonicalization:

1. we read raw `plates` object
2. prefill missing op envelopes
3. normalize against step.schema

This preserves strictness **without** forcing authors to redundantly specify envelope defaults at the stage layer.

---

## H) Minimal rewrite to V4 text (what to change on paper)

To reconcile V4 with V3 invariants, you only need to adjust these statements:

### H1) Replace “internal stage input is stepId-keyed map”

With:

> Stage config surface is a single strict object that always includes an optional `knobs` field, and includes either:
>
> * public fields (if stage has explicit public view), or
> * stepId fields (if stage is internal-as-public).

### H2) Replace “Normalize knobs step”

With:

> Knobs are normalized as part of stage surface normalization (since `knobs` is a field in the stage surface schema). For internal plumbing, the compiler extracts `knobs = stageConfig.knobs` and passes it to compile/normalize hooks as a separate argument.

### H3) Clarify “identity transform”

With:

> For internal-as-public stages, the step-map portion of the stage config is identity-mapped to raw per-step configs via `omit(stageConfig, "knobs")`. Compilation is never skipped.

---

## I) Remaining short tradeoffs needing explicit decision

These are small but real; you should decide them once and encode as invariant.

1. **Reserved key set**
   We picked `"knobs"` as reserved. Decide whether to reserve any others (e.g. `"meta"`). Minimal choice is reserve only `"knobs"`.

2. **Do knobs exist anywhere post-compilation for observability?**
   Canonical model says “no.” If you want trace/debug visibility, decide whether to:

   * keep knobs only in a compiler trace artifact (not in runtime config), or
   * attach knobs to the trace session metadata (not passed to steps/ops at runtime).

3. **Domain knob namespacing (optional)**
   Not required for reconciliation, but if you want domain ops to be insulated from stage knob packaging, you may later standardize `stageConfig.knobs.domains[domainId]`. This is not needed to land the fix above.

---

## Final summary (what you get after this reconciliation)

* **Single author-facing surface per stage is preserved literally**: knobs are a field inside the stage config object.
* V4’s `stage.compile({ env, knobs, config })` remains as **internal plumbing**: `knobs` is extracted from stage config; `config` is `omit(knobs)` and validated against `public` when present.
* Internal-as-public stages remain coherent: stage surface schema includes knobs + stepId keys; step config bodies are validated later during the always-on canonicalization pipeline.
* “Identity” is clarified: identity applies to the **step-map portion**, not the entire stage object.
* No new modes/variants; no runtime detection; no runtime defaulting.

If you want, the next paper pass should be to write the exact `createStage(...)` factory pseudo-implementation with:

* reserved key checks,
* surface schema construction for both cases,
* and the exact `toInternal` function generation,
  so there is zero ambiguity about how the stage abstraction is instantiated.
