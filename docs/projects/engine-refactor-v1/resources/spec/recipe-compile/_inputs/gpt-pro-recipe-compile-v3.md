Below is a fully integrated, canonical proposal (v3) that incorporates your five requested fixes/changes and resolves the ambiguities you flagged—especially the “step schema vs public schema vs ops” confusion, and the runtime `Env` vs author knobs vs config vs inputs separation.

I am explicitly changing the prior v2 direction in one meaningful way (as you requested I consider): **public schema and public→internal compilation move to the Stage layer, not the Step layer**. Steps become “internal-config-only + optional normalize” (like ops), and stages become the sole owners of “public authoring views” and “public→internal compilation.”

I’m also incorporating:

* **`Env` rename** (and moving it out of engine-only types so domain/authoring can reference it without importing engine),
* **ops injected into step run implementations** (step run implementation receives ops without importing them),
* **default `additionalProperties: false` for inline schemas** supported only by the definition factories (no free-floating schema shortcut type),
* and a clearer rule: **no config shape mutation**; only **value normalization** and **public→internal compilation**.

I’ve grounded key “current behavior” claims against the repomix snapshot: the engine currently calls `step.resolveConfig(value, settings)` during plan compilation and revalidates the returned object, and it performs schema defaulting/cleaning + unknown key detection in that compile phase. 

---

# Canonical Architecture Proposal (v3)

## 0) Decision log

### D1 — Rename runtime “settings” to `env`

**Decision:** everywhere that currently uses `settings` (RunRequest, ExecutionPlan, ExtendedMapContext) becomes `env`.

**Why:** “settings” conflates user-authored knobs with game runtime parameters. We need a hard semantic boundary.

**Grounding:** Current engine compilation reads `settings` from the RunRequest and passes it into `step.resolveConfig(value, settings)` during plan compilation.

---

### D2 — Stage owns `public` schema + compilation; Steps do not have `public`

**Decision:** only **Stage modules** may define:

* `public` schema (author-facing config surface)
* `knobs` schema (stage-level knobs)
* `compile(publicConfig, ctx) -> internalStepConfigs`

Steps define only:

* `schema` (internal step config schema; required)
* optional `normalize(internalConfig, ctx) -> internalConfig` (value-only normalization)
* optional `ops` bindings (to enable automatic op normalization + op injection into run)

**Why:** it avoids the “view-layer stacking” you called out. A step’s config view is rarely meaningful in isolation; **stage is the unit where knobs and coherent authoring surfaces belong**.

---

### D3 — Remove engine-owned config resolution; move normalization to recipe compilation

**Decision:** The engine becomes **validation + plan construction only**. It does not:

* default/clean configs into new shapes
* call `step.resolveConfig`
* call op normalization

Instead:

* **recipe compilation produces final internal step configs** before calling engine compile
* engine may still validate (recommended), but must not mutate/resolve

**Grounding:** Today engine compile both normalizes and calls `step.resolveConfig`, then normalizes again. This is exactly the coupling we’re removing.

---

### D4 — Rename `resolveConfig` to `normalize` (and forbid shape changes)

**Decision:** the only allowed “config processing hooks” are:

* `normalize` on Steps and Ops
* `compile` on Stages (public→internal compilation)

**Rule:** `normalize` must return a value that still validates against the same schema and **does not change config shape**.

---

### D5 — Inline schema definitions default `additionalProperties: false`

**Decision:** In definition factories (`defineStepContract`, `defineStage`, `defineOpContract`), if the schema is provided inline, we auto-inject `additionalProperties: false` (and do so consistently). No new globally-usable “schema helper type” is introduced.

**Why:** authoring ergonomics + consistent strictness, without proliferating ad hoc schema helpers.

---

## 1) The problem as it exists in the codebase

### 1.1 Engine currently performs config normalization and invokes step resolvers

In the current engine plan compiler, during `buildNodeConfig`, the engine:

1. schema-normalizes step config (`normalizeStepConfig`)
2. if `step.resolveConfig` exists, it calls it with `(value, settings)`
3. validates the returned object again and stores it in the plan node config.

This couples:

* engine compilation
* step-level normalization logic
* runtime “settings” (soon `env`)
  …and encourages drift because config becomes an engine-managed artifact rather than a recipe-owned artifact.

### 1.2 Step schema is currently mandatory in authoring (and that’s correct)

The authoring layer asserts/throws if a step is missing schema (and tests cover it). This is good: step schema is the runtime contract boundary. 

### 1.3 Ops and strategies currently depend on engine types (`RunSettings`)

Domain strategy hooks currently accept `settings: RunSettings` in some places (e.g. `resolveConfig: (cfg, settings) => ...`). That forces domain/authoring to import engine shapes, which is the wrong direction. 

---

## 2) Core conceptual model (canonical terms)

### 2.1 Four distinct data channels

1. **Env** (runtime, game-provided, not author-adjustable)

* Example: map size, wrap, seed, player count, civ selection, etc.
* Provided at runtime by Civ7 engine / runtime entrypoint
* Available to stage compilation + step/op normalization, but is not “config”

2. **Knobs** (author-facing “shared controls,” cross-cutting)

* Stage knobs: exposed by stage public schema and used to compile multiple steps
* Recipe/global knobs: optional, used across stages

3. **Config** (internal, stable schema shape, fully type-safe)

* Step internal config (validated against step `schema`)
* Op envelope config (validated against op config envelope schema)
* **Shape never changes**, only values may be normalized

4. **Inputs** (runtime artifacts / data produced by pipeline)

* Buffers, maps, artifacts, intermediate results
* Flow through steps and ops at runtime

---

## 3) Layering and dependency boundaries

### 3.1 Layer diagram

```
Domain (ops + strategies + contracts)
  └── exports DomainRouter (bag of ops)

Step (internal node; orchestration)
  └── depends on DomainRouter contracts + op envelopes
  └── defines internal schema (required)
  └── may normalize internal values (optional)
  └── run implementation may call ops (injected)

Stage (author-facing unit)
  └── owns public schema + knobs schema
  └── compiles public config -> internal per-step configs
  └── coordinates multiple steps

Recipe (composition + compilation orchestrator)
  └── composes stages
  └── composes recipe-level public schema optionally
  └── runs stage compilation to produce internal config tree
  └── then normalizes steps + ops
  └── instantiates recipe V2 for engine

Engine (execution plan + executor)
  └── takes compiled recipe V2 with internal configs
  └── validates but does not resolve
  └── builds plan + executes
```

### 3.2 Hard boundary: domain does not know about engine plan

Domain ops/strategies can depend on:

* core `Env` type (moved out of engine-only module)
* schema tooling
  …but not on engine plan compilation internals.

---

## 4) Canonical type surfaces and hook semantics

### 4.1 Env (runtime)

**Canonical:** Move `RunSettingsSchema` / `RunSettings` out of engine-only ownership.

* `packages/mapgen-core/src/runtime/env.ts`

  * `export type Env = Static<typeof EnvSchema>`
  * `export const EnvSchema = Type.Object(...)`

Engine imports EnvSchema; authoring imports Env type; domain strategies can refer to Env without importing engine.

This breaks the “domain imports engine” dependency that exists today.

### 4.2 Op shape (domain)

#### Op contract

```ts
type OpContract = {
  id: string;
  kind: "compute" | "mutate" | "place" | ...;

  input: TSchema;
  output: TSchema;

  strategies: Record<string, TSchema>; // per-strategy internal schema
};
```

#### Op implementation shape

```ts
type Op<Contract extends OpContract> = {
  id: Contract["id"];

  // Envelope schema: { strategy, config } unioned over strategies
  config: TSchema;

  // Default envelope (strategy + defaulted config)
  defaultConfig: StrategySelectionFor<Contract>;

  // Value-only normalization (no shape change)
  normalize?: (cfg: StrategySelectionFor<Contract>, ctx: NormalizeCtx) => StrategySelectionFor<Contract>;

  runValidated: (input: Static<Contract["input"]>, cfg: StrategySelectionFor<Contract>) => Static<Contract["output"]>;
};
```

**Key change:** `resolveConfig` becomes `normalize`.
**Key rule:** the config envelope schema shape is stable; normalization only fills/clamps values.

### 4.3 Step contract shape (internal-only)

```ts
type StepContract<TConfigSchema extends TSchema, TOps extends Record<string, Op<any>> | undefined> = {
  id: string;
  phase: GenerationPhase;
  requires: DependencyTag[];
  provides: DependencyTag[];

  // REQUIRED: internal config schema
  schema: TConfigSchema;

  // optional: for compiler + op injection
  ops?: TOps;

  // optional: internal defaults (if not purely schema defaults)
  default?: Static<TConfigSchema>;
};
```

#### Step module shape (what engine registers)

We keep engine-facing `MapGenStep<TContext, TConfig>` signature stable.

But we extend the step *implementation factory* so the impl gets `ops`:

```ts
type StepImpl<TContext, TConfig, TOps> = {
  normalize?: (cfg: TConfig, ctx: NormalizeCtx) => TConfig;
  run: (ctx: TContext, cfg: TConfig, ops: TOps) => void | Promise<void>;
};

type StepModule<TContext, TConfig, TOps> = {
  contract: StepContract<any, any>;
  // engine-facing
  step: MapGenStep<TContext, TConfig>;
};
```

**Important:** Engine sees `run(ctx, cfg)` only.
Our `createStep` wraps it and supplies ops to the impl.

This addresses your point (3): steps can call ops without importing them directly.

---

## 5) Public schema location and compilation rules

### 5.1 Stage is the canonical owner of `public` schema

```ts
type StageModule<TContext, TSteps extends readonly StepModule<TContext, any, any>[], TPublicSchema extends TSchema, TKnobsSchema extends TSchema> = {
  id: string;
  steps: TSteps;

  // author-facing
  public: TPublicSchema;
  knobs?: TKnobsSchema;

  // compilation: public -> internal
  compile: (input: {
    env: Env;
    knobs: Static<TKnobsSchema>;
    config: Static<TPublicSchema>;
  }) => Partial<StageInternalConfigOf<TSteps>>;
};
```

Where:

```ts
type StageInternalConfigOf<TSteps> = {
  [StepId in StepContractIdOf<TSteps>]: StepConfigOf<ThatStep>;
};
```

### 5.2 Recipe composes stage public schemas into recipe public config

Recipe’s author-facing config is:

```ts
type RecipePublicConfigOf<TStages> = {
  [StageId in keyof TStages]: Static<TStages[StageId]["public"]>;
};
```

And knobs:

```ts
type RecipeKnobsOf<TStages> = {
  [StageId in keyof TStages]?: Static<NonNullable<TStages[StageId]["knobs"]>>;
};
```

---

## 6) Canonical compilation pipeline (the “full chain”)

### 6.1 The compilation pipeline is *recipe-owned*

Recipe exposes:

* `compileConfig(env, publicConfig, knobs) -> internalConfigTree`
* `instantiate(internalConfigTree) -> RecipeV2`
* `runRequest(env, publicConfig, knobs) -> RunRequest`
* `compile(runRequest) -> ExecutionPlan`
* `run(context, env, publicConfig, knobs) -> result`

### 6.2 Canonical order of operations

This is the actual chain, with explicit phases:

```ts
function compileRecipeConfig(recipe, env, publicConfig, knobs) {
  // (A) Stage-level public → internal compilation
  const stageInternal = {}
  for (stage of recipe.stages) {
    const stagePublic = normalizeBySchema(stage.public, publicConfig[stage.id], `/config/${stage.id}`);
    const stageKnobs  = normalizeBySchema(stage.knobs ?? Empty, knobs?.[stage.id] ?? {}, `/knobs/${stage.id}`);

    const partialInternal = stage.compile({ env, knobs: stageKnobs, config: stagePublic });

    // fill missing steps with undefined; next phase will default
    stageInternal[stage.id] = { ...partialInternal };
  }

  // (B) Step internal schema normalization + step.normalize (value-only)
  for (stage of recipe.stages) {
    for (step of stage.steps) {
      const raw = stageInternal[stage.id]?.[step.contract.id];

      // schema defaulting + unknown-key validation, producing canonical internal step config
      let cfg = normalizeBySchema(step.contract.schema, raw, `/internal/${stage.id}/${step.contract.id}`);

      // step-level normalize (value-only, still must validate against schema)
      if (step.impl.normalize) {
        cfg = step.impl.normalize(cfg, { env, knobs: knobs?.[stage.id] ?? {} });
        cfg = normalizeBySchema(step.contract.schema, cfg, `/internal/${stage.id}/${step.contract.id}`);
      }

      // (C) Mechanical op normalization pass (based on step.contract.ops)
      if (step.contract.ops) {
        cfg = normalizeOpsInStepConfig(cfg, step.contract.ops, { env, knobs: knobs?.[stage.id] ?? {} });
        cfg = normalizeBySchema(step.contract.schema, cfg, `/internal/${stage.id}/${step.contract.id}`);
      }

      stageInternal[stage.id][step.contract.id] = cfg;
    }
  }

  return stageInternal; // internal tree: { [stageId]: { [stepId]: stepConfig } }
}
```

### 6.3 No config shape changes anywhere

* Stage `compile` changes *shape* from public → internal (that is allowed and explicit)
* Step `normalize` changes values only
* Op `normalize` changes values only

---

## 7) Canonical “schema vs ops vs normalize” rules (fixing your Q1 confusion)

### 7.1 Why step `schema` is required, but `ops` is optional

* `schema` is required because it is the **runtime contract boundary**. The engine must be able to validate the step config regardless of whether the step delegates to ops.
* `ops` is optional because not all steps call ops:

  * some steps are pure orchestration
  * some steps transform artifacts without domain ops
  * some steps call external logic

This matches current authoring semantics: createStage asserts every step has schema.

### 7.2 Why step schema cannot always be inferred from ops

Even if a step delegates to ops, it may have:

* step-specific config fields (e.g., `densityBias` in plot vegetation)
* config that isn’t an op envelope at all (toggles, routing config, weights)
* multiple ops under names that don’t match a generic convention

So schema inference from ops is not safe as a general rule.

### 7.3 But we still remove boilerplate: ops-driven schema synthesis is supported

**Canonical behavior:** `defineStepContract` can *derive* schema/defaults from `ops` **only when you opt into that shortcut**.

You can do either:

**Explicit schema (always valid):**

```ts
defineStepContract({
  id: "...",
  schema: Type.Object({ refine: ecology.ops.refineBiomeEdges.config }, /* ... */),
  ops: { refine: ecology.ops.refineBiomeEdges },
});
```

**Or ops-derived schema (shortcut):**

```ts
defineStepContract({
  id: "...",
  ops: { refine: ecology.ops.refineBiomeEdges }, // derive schema + defaults from op.config + op.defaultConfig
});
```

So: schema remains **conceptually required**, but in trivial steps we don’t force authors to manually write it.

### 7.4 What “public” means after this change

* **Only stages have `public`.**
* Steps do not.
* Ops do not.
  This eliminates the three-way confusion entirely.

---

## 8) Core variations (in full)

You asked for “all core variations in full,” not minimal outlines. Here are the complete variants and when you’d pick them.

### Variant A (Canonical): Stage-owned public schema

* **Public config exists per stage**
* Stage compiles to internal step configs
* Recipe composes stage publics

**Use when:** you want clean modder authoring UX and coherent knobs per stage (default case).

**Shape:**

* Author writes: `RecipePublicConfigOf<Stages>`
* Engine receives: `RecipeConfigOf<Stages>` (internal tree)

### Variant B (Power-user): No public schema, author writes internal config tree

* Stage has no `public` and no `compile`
* Recipe expects the internal config tree directly

**Use when:** internal-only recipes, tests, or “I know exactly what I’m doing” programmatic config.

### Variant C (Facade): Recipe-owned global public schema

* Recipe defines a single top-level `public` schema and compiler
* Recipe compiler maps global public → stage public → internal step configs

**Use when:** you want one unified UX surface that spans stages (e.g., “world style” presets) while still keeping stage compilation as the meaningful compilation unit.

**Important:** Even in Variant C, the stage remains the proper context for compiling knobs into step configs; recipe-level compile should mostly route into stages rather than pretending to do everything itself.

---

# Illustrative Examples (end-to-end, full chain)

These examples are written to align with real semantics from the existing codebase (ecology steps, op envelopes, etc.). The current engine’s step resolver behavior is visible in the snapshot; we’re replacing that with recipe/stage compilation. 

## Example 1: Simple end-to-end (“Biome Edge Refine”)

### 1) Domain op: `refineBiomeEdges`

```ts
// mods/mod-swooper-maps/src/domain/ecology/ops/refine-biome-edges/index.ts
export const refineBiomeEdgesContract = defineOpContract({
  id: "ecology/refineBiomeEdges",
  kind: "mutate",

  input: RefineBiomeEdgesInputSchema,
  output: RefineBiomeEdgesOutputSchema,

  strategies: {
    default: Type.Object({
      strength: Type.Number({ minimum: 0, maximum: 1, default: 0.5 }),
      passes: Type.Integer({ minimum: 1, maximum: 8, default: 2 }),
    }),
  },
});

// strategy
export const refineBiomeEdgesDefault = createStrategy(refineBiomeEdgesContract, "default", {
  normalize: (cfg, { env }) => {
    // example: if wrap is enabled, reduce strength slightly (value-only)
    const wrap = env.wrap.wrapX || env.wrap.wrapY;
    return { ...cfg, strength: wrap ? Math.min(cfg.strength, 0.6) : cfg.strength };
  },
  run: (input, cfg) => {
    /* ... */
  },
});

export const refineBiomeEdges = createOp(refineBiomeEdgesContract, {
  strategies: { default: refineBiomeEdgesDefault },
});
```

### 2) Step contract + step implementation (ops injected)

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biome-edge-refine/contract.ts
export const BiomeEdgeRefineStep = defineStep({
  contract: defineStepContract({
    id: "biome-edge-refine",
    phase: "ecology",
    requires: [/* ... */],
    provides: [/* ... */],

    // ops binding enables automatic op normalize + injected ops in run
    ops: { refine: ecology.ops.refineBiomeEdges },

    // schema can be derived from ops for trivial steps:
    // schema: derived => { refine: refineBiomeEdges.config }
    // defaults: derived => { refine: refineBiomeEdges.defaultConfig }
  }),

  impl: {
    run: (ctx, cfg, ops) => {
      const input = buildRefineInput(ctx);
      ops.refine.runValidated(input, cfg.refine);
    },
  },
});
```

### 3) Stage public schema + compilation

Stage authoring surface:

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/stage.ts
export const EcologyStage = createStage({
  id: "ecology",
  steps: [BiomeEdgeRefineStep, PlotVegetationStep /* ... */],

  // stage-level author-facing schema
  public: {
    biomeEdges: Type.Object({
      strength: Type.Number({ minimum: 0, maximum: 1, default: 0.5 }),
      passes: Type.Integer({ minimum: 1, maximum: 8, default: 2 }),
    }),
  },

  knobs: {
    // example knob that affects multiple steps
    style: Type.Union([Type.Literal("lush"), Type.Literal("standard"), Type.Literal("arid")], { default: "standard" }),
  },

  compile: ({ config, knobs }) => {
    return {
      "biome-edge-refine": {
        refine: {
          strategy: "default",
          config: {
            strength: knobs.style === "arid" ? Math.min(config.biomeEdges.strength, 0.4) : config.biomeEdges.strength,
            passes: config.biomeEdges.passes,
          },
        },
      },
    };
  },
});
```

### 4) Recipe run chain (explicit)

```ts
// mods/mod-swooper-maps/src/recipes/standard/recipe.ts
export const StandardRecipe = createRecipe({
  id: "standard",
  stages: [EcologyStage /* ... */],
});

// runtime entrypoint
const env = buildEnvFromCiv7(init);
const publicConfig = {
  ecology: { biomeEdges: { strength: 0.55, passes: 3 } },
};
const knobs = {
  ecology: { style: "lush" },
};

await StandardRecipe.run(context, env, publicConfig, knobs);
```

**What happens:**

1. stage public config validated/defaulted
2. stage compile produces internal config for `biome-edge-refine`
3. step schema validated/defaulted
4. op.normalize applied to `cfg.refine` envelope automatically
5. engine compiles plan without resolving anything
6. step runs, calling injected `ops.refine`

---

## Example 2: Full end-to-end (“Plot Vegetation” with multiple ops + variants)

This addresses your critique directly: I’m showing the **step contract first**, then the compilation chain, then multiple usage variants.

### 1) Domain ops: `planTreeVegetation` and `planShrubVegetation`

```ts
export const planTreeVegetationContract = defineOpContract({
  id: "ecology/planTreeVegetation",
  kind: "compute",
  input: PlanVegetationInputSchema,
  output: PlanVegetationOutputSchema,
  strategies: {
    default: Type.Object({
      density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
      jitter: Type.Number({ minimum: 0, maximum: 1, default: 0.1 }),
      // "auto" allowed inside stable schema (no shape mutation):
      maxCluster: Type.Optional(Type.Integer({ minimum: 1, maximum: 64 })),
    }),
    biomeWeighted: Type.Object({
      baseDensity: Type.Number({ minimum: 0, maximum: 1, default: 0.25 }),
      weightsByBiome: Type.Record(Type.String(), Type.Number({ minimum: 0, maximum: 2 }), { default: {} }),
    }),
  },
});

export const planTreeVegetationDefault = createStrategy(planTreeVegetationContract, "default", {
  normalize: (cfg, { env }) => {
    // runtime env affects defaults, but within same schema
    const mapArea = env.dimensions.width * env.dimensions.height;
    const autoMaxCluster = mapArea < 20000 ? 8 : 16;
    return { ...cfg, maxCluster: cfg.maxCluster ?? autoMaxCluster };
  },
  run: (input, cfg) => { /* ... */ },
});

export const planTreeVegetation = createOp(planTreeVegetationContract, {
  strategies: {
    default: planTreeVegetationDefault,
    biomeWeighted: createStrategy(planTreeVegetationContract, "biomeWeighted", {
      run: (input, cfg) => { /* ... */ },
    }),
  },
});

// shrubs similar
export const planShrubVegetation = /* ... */;
```

### 2) Step contract (internal schema) and impl (with ops injected)

This is the piece you said was “half-assed” in the earlier examples: here it is fully, with matching signatures.

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/step.ts
export const PlotVegetationStep = defineStep({
  contract: defineStepContract({
    id: "plot-vegetation",
    phase: "ecology",
    requires: [/* ... */],
    provides: [/* ... */],

    ops: {
      trees: ecology.ops.planTreeVegetation,
      shrubs: ecology.ops.planShrubVegetation,
    },

    // internal schema includes step-specific + op envelopes
    schema: {
      densityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
      trees: ecology.ops.planTreeVegetation.config,
      shrubs: ecology.ops.planShrubVegetation.config,
    },

    // default can be partial; ops defaults are derived automatically
    default: { densityBias: 0 },
  }),

  impl: {
    // value-only normalization (no public mapping here)
    normalize: (cfg, { knobs }) => {
      // clamp is redundant with schema but ok; normalization can also be derived from knobs:
      const bias = knobs.vegetationBias ?? cfg.densityBias;

      // apply bias to both op envelopes (shape unchanged)
      return {
        ...cfg,
        densityBias: bias,
        trees: applyDensityBiasToEnvelope(cfg.trees, bias),
        shrubs: applyDensityBiasToEnvelope(cfg.shrubs, bias),
      };
    },

    run: (ctx, cfg, ops) => {
      const input = buildVegetationInput(ctx);

      const trees = ops.trees.runValidated(input, cfg.trees);
      const shrubs = ops.shrubs.runValidated(input, cfg.shrubs);

      applyVegetationToWorld(ctx, { trees, shrubs });
    },
  },
});
```

### 3) Stage public schema + compilation (where authoring UX belongs)

```ts
export const EcologyStage = createStage({
  id: "ecology",
  steps: [BiomeEdgeRefineStep, PlotVegetationStep],

  public: {
    vegetation: Type.Object({
      // a coherent authoring surface that doesn’t expose envelopes unless needed
      density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),

      // optional advanced override for trees only
      treesStrategy: Type.Optional(Type.Union([Type.Literal("default"), Type.Literal("biomeWeighted")])),
      treesWeightsByBiome: Type.Optional(Type.Record(Type.String(), Type.Number({ minimum: 0, maximum: 2 }), { default: {} })),

      shrubsEnabled: Type.Boolean({ default: true }),
    }),
  },

  knobs: {
    vegetationBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
    vegetationScale: Type.Number({ minimum: 0.25, maximum: 2, default: 1 }),
  },

  compile: ({ config, knobs, env }) => {
    const area = env.dimensions.width * env.dimensions.height;

    // stage-level value logic: these are authoring semantics, not engine semantics
    const scaledDensity = clamp01(config.vegetation.density * knobs.vegetationScale);

    const treesEnvelope =
      config.vegetation.treesStrategy === "biomeWeighted"
        ? {
            strategy: "biomeWeighted",
            config: {
              baseDensity: scaledDensity,
              weightsByBiome: config.vegetation.treesWeightsByBiome ?? {},
            },
          }
        : {
            strategy: "default",
            config: { density: scaledDensity, jitter: 0.1 },
          };

    const shrubsEnvelope = config.vegetation.shrubsEnabled
      ? { strategy: "default", config: { density: clamp01(scaledDensity * 0.6) } }
      : { strategy: "default", config: { density: 0 } };

    return {
      "plot-vegetation": {
        densityBias: knobs.vegetationBias,
        trees: treesEnvelope,
        shrubs: shrubsEnvelope,
      },
    };
  },
});
```

### 4) Three author-facing variants (showing full extent)

#### Variant 2A — Simple authoring (no strategy exposure)

```ts
const publicConfig = {
  ecology: {
    vegetation: { density: 0.4, shrubsEnabled: true },
  },
};
const knobs = { ecology: { vegetationBias: 0.1, vegetationScale: 1 } };
```

#### Variant 2B — Advanced override (trees biome weighting)

```ts
const publicConfig = {
  ecology: {
    vegetation: {
      density: 0.35,
      treesStrategy: "biomeWeighted",
      treesWeightsByBiome: { TUNDRA: 0.2, GRASSLAND: 1.3, DESERT: 0.05 },
      shrubsEnabled: false,
    },
  },
};
```

#### Variant 2C — Runtime-scaled defaults using env (no shape change)

If `planTreeVegetationDefault.normalize` depends on env area to set `maxCluster`, that happens during recipe compilation (pre-engine) via op normalization. This is still deterministic and within schema shape.

---

# Addressing your specific numbered concerns

## 1) “Why schema required but ops optional? Why can’t schema be aggregated from ops? What’s public vs schema vs internal schema?”

**Resolved by design change:** Steps have only **internal `schema`** (required). Steps have **no public schema**. Stages own public.

* `schema` = internal runtime config contract for the step.
* `ops` = optional bindings to allow:

  * automatic op normalization (mechanical pass)
  * ops injection into the step run impl

**Why schema can’t always be inferred:** steps often include non-op fields; plus not all steps call ops. But we still support **ops-derived schema as a shortcut** when it’s truly just a wrapper step.

And: I fixed the example weakness by showing the plot vegetation step contract before showing compilation, so signatures and shapes are explicit.

## 2) “Maybe only stages should have public schema; steps should only normalize.”

**I agree, and I adopted it as canonical.**

It is safer, simpler, and aligns with “knobs live at stage.” It also prevents a proliferation of partially-useful public layers.

The only reason to keep step-level public would be if you want steps to be “independently authorable products.” That’s a different ecosystem direction than what you described, and it’s not necessary to unblock config resolution.

So: stage public schema is canonical; recipe public schema is optional Variant C.

## 3) “If steps list ops, should ops be directly available in run?”

**Yes, canonical.**

`createStep` wraps engine-facing `run(ctx, cfg)` and supplies `ops` into the impl:

```ts
run: (ctx, cfg) => impl.run(ctx, cfg, boundOps)
```

This is a pure DX improvement and reduces import duplication.

(Full contract/impl decoupling—where contracts reference op IDs and implementations bind via registry—is a possible future enhancement, but not required for the clean-cut refactor.)

## 4) “Inline schema helpers should default additionalProperties false; no standalone type.”

**Adopted.**

* `defineStepContract({ schema: { ...fields } })` wraps with `Type.Object(fields, { additionalProperties:false })`.
* Same pattern applies to `createStage({ public: { ...fields } })`, `knobs`, and `defineOpContract` when provided inline.

We do **not** introduce a new globally reusable schema builder type; the shorthand is only recognized inside these factories.

## 5) “Show full chain of thought/code”

I cannot provide hidden private reasoning, but I *did* provide the full **explicit semantic chain** (compile order, full code chain, and end-to-end examples) so the behavior is inspectable and mechanically checkable.

---

# Implementation Plan (risk-sliced, with parallelization)

This is organized by “risk slices” rather than file lists; you can parallelize most mechanical migrations with agents once the core APIs land.

## Slice 0 — Mechanical rename: `settings` → `env` (low risk, parallelizable)

**Work:**

* Rename RunRequest `settings` to `env`
* Rename ExecutionPlan fields
* Rename ExtendedMapContext `settings` to `env`
* Update runtime entrypoints that build settings and pass them

**Why low risk:** pure rename + compiler-guided.

**Grounding:** createRecipe today sets `context.settings = plan.settings`; this becomes `context.env = plan.env`.

Parallelize across packages and mods.

---

## Slice 1 — Introduce stage public schema + compile hooks (medium risk, localized)

**Work:**

* Extend `StageModule` type to include optional `public`, `knobs`, `compile`
* Extend `createStage` to return these fields

**Notes:**

* Keep backward compatibility temporarily by allowing stages without public/compile (Variant B). That’s a pragmatic migration lever; it’s not a “shim layer,” it’s optional capability.

Parallelize stage-by-stage implementation in mods.

---

## Slice 2 — Build recipe-owned compilation pipeline (higher semantic risk, core)

**Work:**

* Add `recipe.compileConfig(env, publicConfig, knobs)` implementing the canonical chain:

  * stage public normalize → stage compile
  * step schema normalize → step.normalize → op.normalize mechanical pass
* Update `recipe.runRequest` and `recipe.run` to call `compileConfig` and then instantiate

**Risk:** this changes where canonicalization happens.
**Mitigation:** port existing engine `normalizeStepConfig` semantics into recipe compiler (unknown key errors, defaults, etc.) so behavior matches. The engine code shows current normalization behavior including unknown key errors. 

This is not parallelizable until the compile pipeline API is finalized.

---

## Slice 3 — Remove engine-owned resolution (high leverage, medium risk)

**Work:**

* Remove `step.resolveConfig` invocation from engine compile
* Remove engine `Value.Default/Clean` mutation path if recipe compiler already canonicalizes
* Keep engine validation-only (recommended)

**Grounding:** engine currently calls `step.resolveConfig(value, settings)` and re-normalizes the returned config; we remove that. 

---

## Slice 4 — Migrate steps: `resolveConfig` → `normalize` or delete (parallelizable)

**Work:**

* For steps like “biome-edge-refine” that only delegate to ops:

  * delete step normalize entirely; rely on mechanical op normalization pass
* For steps like “plot-vegetation”:

  * move value logic into `step.normalize` but remove op.resolve calls (mechanical pass handles ops)

This is highly parallelizable across steps.

---

## Slice 5 — Migrate ops: `resolveConfig` → `normalize` (parallelizable)

**Work:**

* Rename strategy `resolveConfig` to `normalize`
* Ensure normalize uses `Env` (core type) if needed
* Ensure no shape changes

Parallelizable across domains.

---

## Slice 6 — Add inline schema shorthand + default additionalProperties false (parallelizable)

**Work:**

* Update factories to accept `{ field: schema }` inline and wrap
* Migrate call sites opportunistically; not required for correctness, but improves DX

---

# Summary of the “shape and scope” of the change

This is one coherent architectural change:

* **Engine** stops being the config canonicalizer/resolver.
* **Recipe compilation** becomes the single place where:

  * author-facing config is interpreted (stage compile),
  * internal step configs are fully canonicalized and op-normalized.
* **Stages** become the single public authoring unit (public schema + knobs + compile).
* **Steps** are internal-only units (schema required; optional normalize; ops injection).
* **Ops/strategies** retain normalization capability, but it runs under recipe compilation, not engine compilation.

This directly resolves:

* engine/domain coupling via config resolution,
* redundant/inconsistent normalization paths,
* and the “where do knobs/public schema belong?” ambiguity.

If you want, the next step is to pick one real stage (ecology) and apply Variant A fully, end-to-end, then we use it as the template for the rest.

---

## Post-V3 Clarifications (Lock-in Invariants)

These are explicit lock-ins derived from follow-up discussion. They do not change the intent of the architecture above; they remove ambiguity so V4 can treat them as hard invariants.

### A) Single stage surface (no parallel “knobs vs config” input)

* **Knobs are part of the stage config surface**, not a separate parallel input.
* Concretely: stage config is `knobs + whatever it composes from steps`.
* If a stage exposes knobs, those knobs live in the stage’s **public schema** (whether that public schema is explicitly authored or derived).
* **Invariant:** there is exactly **one** author-facing input surface per stage. No dual “knobs input” vs “config input” modes.

Additional lock-in detail (compatible with the above):

* Knobs live at `stageConfig.knobs` inside the stage config object.
* The recipe compiler extracts `knobs` once per stage (e.g. `const { knobs, ...rawStepMap } = stageConfig`) and passes `{ env, knobs }` into `step.normalize(...)` as compile-time context.
* Per-step config objects do not embed knobs fields; knobs are threaded via ctx.
* Reserved key rule: no step id may be `"knobs"`.

### B) `public === internal` still implies an always-on compile/normalize step

* “Public defaults to internal” does **not** mean “skip compilation.”
* **Invariant:** the recipe compiler always runs a compile/normalize step **before** handing anything to the engine — even when `public === internal` and the mapping is identity.
* That always-on compiler pass is responsible for:
  * mechanical normalization,
  * envelope creation,
  * the normalization pass (e.g. op/strategy normalize),
  * and producing the final internal step configs / execution plan inputs.
* Public→internal mapping is an **additional layer** (when present), not a replacement for compile/normalize.

### C) Consequence: removes runtime variant ambiguity + old branching/defaulting footguns

Given (A) and (B):

* The system no longer relies on runtime “mode detection” (no implicit Variant A/B/C branching at `run(...)` time).
* The engine is not used as a fallback config canonicalizer; it executes the **fully compiled** internal plan/config produced by the recipe compiler.
* This eliminates the specific failure mode where “power-user/internal config” behavior silently reappears as a runtime fallback via defaulting/cleaning and/or step-level resolution during engine compilation.
