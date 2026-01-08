You’re right to call that out — **in our locked O3 ruleset, `ops` + “extra top-level fields” is forbidden** because it creates two sources of truth for what the step config shape is.

The mistake in my “cleaned” example was mixing:

* `ops: { ... }` (which implies **ops-derived schema**)
  with
* `schema: { densityBias, trees, shrubs }` (which is “ops-derived schema + extras”)

That’s explicitly disallowed.

So we need to choose **one canonical path** and keep DX clean.

You have two viable options that preserve the architecture and the stage-level binding you just locked:

---

# Option 1 (canonical v1): **No extra fields** on ops-derived steps

This is the cleanest with O3 and should be the default.

### Rule

If a step declares `ops`, then **the step schema is derived from `ops` only**.
The step config is exactly:

```ts
{
  trees: OpEnvelope,
  shrubs: OpEnvelope
}
```

No `densityBias`. No extra toggles. If you need bias, it lives in **stage knobs** or in stage public config and gets compiled into the envelopes.

### Why it’s good DX

* Zero duplication.
* Step contract lists ops once, schema is derived automatically.
* Bias is expressed where it belongs: stage-level author surface.

### Updated example (plot-vegetation)

**contract.ts**

```ts
import { defineStepContract } from "@mapgen/authoring/step";
import { ecology } from "@mapgen/domain/ecology";

export const contract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:biomes", "artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],

  ops: {
    trees: ecology.contracts.planTreeVegetation,
    shrubs: ecology.contracts.planShrubVegetation,
  },

  // schema omitted => derived from ops (O3-compliant)
} as const);
```

**stage compile** bakes “bias” into the envelopes (or into knobs-driven density)

```ts
compile: ({ config, knobs }) => {
  const bias = knobs.vegetationBias ?? 0;
  return {
    "plot-vegetation": {
      trees: applyBias(makeDefaultTreesEnvelope(config.density), bias),
      shrubs: applyBias(makeDefaultShrubsEnvelope(config.density), bias),
    }
  }
}
```

**step run** just runs ops:

```ts
run: (ctx, cfg, ops) => {
  const input = buildVegetationInput(ctx);
  const trees = ops.trees.runValidated(input, cfg.trees);
  const shrubs = ops.shrubs.runValidated(input, cfg.shrubs);
  ...
}
```

This matches your “stage owns authoring knobs” worldview perfectly.

---

# Option 2 (allowed, but not v1 per O3): Explicit schema, **no `ops:`**

This is for steps that truly need bespoke step-level fields.

### Rule

If a step needs additional fields (like `densityBias`) it must:

* Provide explicit `schema`
* Not use `ops:` as a declaration mechanism
  And then you lose the “declare ops once” benefit. You’d have to declare which fields are op envelopes some other way (e.g., an explicit `opKeys: ['trees','shrubs']` list), which reintroduces double bookkeeping. That’s exactly why we set O3.

So for v1, I recommend **we do not use this** except in rare, explicitly justified cases.

---

# What I’m locking in (given your reaction)

**We stick with Option 1 as canonical for v1:**

* If `ops` exists → schema is derived and **no extra fields**
* Step-level “bias” / cross-op controls live in **stage knobs** (or stage public config)
* Stage compile composes those into per-op envelopes
* Step normalize stays optional but should be rare; stage compile is the right place for multi-op semantics.

That keeps DX clean and prevents schema/ops duplication.

---

## Quick check: does this break anything important?

No. It actually tightens the model:

* Step contract is purely “which ops are run + dependencies”
* Stage is the only authoring surface for controls that span multiple ops
* Compiler still can prefill envelopes and run op normalize
* Runtime stays clean

---

If you want, I’ll rewrite the full E2E example from the last message using the O3-compliant shape (no extra fields when ops are declared), with the same stage-level binding DX cleanups.

---------------------------------

Yes please do

----------------------------------

Some earlier uploads in this project have expired on my side (file_search is telling me that). It doesn’t block this rewrite, though—this is purely applying the O3 rule we just locked: **if a step declares `ops`, it cannot also have extra top-level fields**. If you want me to quote/patch specific existing doc text from the expired files later, re-upload them and I’ll do that pass.

Here’s the **full cleaned E2E example** with:

* **Stage-level binding** (domain imported once per stage)
* **Step declares ops as contracts** (no OpRef)
* **O3 respected**: ops-derived schema only, **no extra fields**
* **Bias / cross-op controls** live in **stage knobs/public config**
* **Compiler prefills envelopes** + runs op normalize
* **Runtime ops are structurally stripped** (no normalize/defaults)

---

# E2E Example (O3-compliant): Ecology stage + Plot Vegetation step

## 0) Canonical rule recap

If a step declares `ops`, then:

* `schema` is **derived from ops only**
* the step config is exactly:

```ts
{
  trees: OpEnvelope,
  shrubs: OpEnvelope
}
```

No extra top-level fields. Cross-op tuning lives in stage `knobs` and is compiled into envelopes.

---

# 1) Domain: ecology public surface (barrel import)

## 1.1 Domain index exports (contracts + compile ops by id)

```ts
// src/domain/ecology/index.ts
import { planTreeVegetationContract, planTreeVegetationOp } from "./ops/plan-tree-vegetation";
import { planShrubVegetationContract, planShrubVegetationOp } from "./ops/plan-shrub-vegetation";

export const ecology = {
  id: "ecology",

  // Step contracts import from here (DX rule: no deep imports)
  contracts: {
    planTreeVegetation: planTreeVegetationContract,
    planShrubVegetation: planShrubVegetationContract,
  },

  // Stage imports domain once; compiler + runtime bind through this
  opsById: {
    [planTreeVegetationOp.id]: planTreeVegetationOp,
    [planShrubVegetationOp.id]: planShrubVegetationOp,
  },
} as const;
```

---

# 2) Operation module (one op folder)

## 2.1 Contract

```ts
// src/domain/ecology/ops/plan-tree-vegetation/contract.ts
import { Type } from "typebox";
import { defineOpContract } from "@mapgen/authoring/op";

export const planTreeVegetationContract = defineOpContract({
  id: "ecology/planTreeVegetation",
  kind: "plan",

  input: Type.Object(
    { width: Type.Number(), height: Type.Number(), biomes: Type.Any() },
    { additionalProperties: false }
  ),

  output: Type.Object(
    { placements: Type.Array(Type.Any()) },
    { additionalProperties: false }
  ),

  strategies: {
    default: Type.Object(
      {
        density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
        jitter: Type.Number({ minimum: 0, maximum: 1, default: 0.1 }),
      },
      { additionalProperties: false, default: {} }
    ),
  },
} as const);
```

## 2.2 Implementation (compile-surface op; normalize is compile-time only)

```ts
// src/domain/ecology/ops/plan-tree-vegetation/index.ts
import { createOp } from "@mapgen/authoring/op";
import { planTreeVegetationContract } from "./contract";

export const planTreeVegetationOp = createOp(planTreeVegetationContract, {
  strategies: {
    default: {
      // compile-time only; never exposed to runtime ops surface
      normalize: (cfg, { env, knobs }) => cfg,

      run: (input, cfg) => {
        return { placements: [] };
      },
    },
  },
});

export { planTreeVegetationContract };
```

(Repeat similarly for shrubs.)

---

# 3) Step module: plot-vegetation (O3-compliant)

## 3.1 Step contract (ops only, schema omitted => derived)

```ts
// stages/ecology/steps/plot-vegetation/contract.ts
import { defineStepContract } from "@mapgen/authoring/step";
import { ecology } from "@mapgen/domain/ecology";

export const contract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:biomes", "artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],

  // O3-compliant: ops declared, schema omitted => derived schema is:
  // { trees: EnvelopeSchema(planTreeVegetation), shrubs: EnvelopeSchema(planShrubVegetation) }
  ops: {
    trees: ecology.contracts.planTreeVegetation,
    shrubs: ecology.contracts.planShrubVegetation,
  },
} as const);
```

Resulting step config shape (author input allows omission, compiler prefills):

```ts
type PlotVegetationConfig = {
  trees: { strategy: "default"; config: { density: number; jitter: number } };
  shrubs: { strategy: "default"; config: { density: number; jitter: number } };
}
```

## 3.2 Step implementation (unbound StepDef; no domain impl import)

```ts
// stages/ecology/steps/plot-vegetation/index.ts
import { createStep } from "@mapgen/authoring/step";
import { contract } from "./contract";

export const plotVegetation = createStep(contract, {
  // optional step-level normalize (compile-time only); rare for O3 steps
  normalize: (cfg, { env, knobs }) => cfg,

  // runtime handler receives runtime ops injected by stage binding
  run: (ctx, cfg, ops) => {
    const input = {
      width: ctx.env.dimensions.width,
      height: ctx.env.dimensions.height,
      biomes: ctx.artifacts.get("artifact:biomes"),
    };

    const trees = ops.trees.runValidated(input, cfg.trees);
    const shrubs = ops.shrubs.runValidated(input, cfg.shrubs);

    ctx.artifacts.set("artifact:vegetationIntents", { trees, shrubs });
  },
});
```

Note: step does not import ecology ops; it only uses injected `ops`.

---

# 4) Stage: ecology (imports domain once, binds steps, owns knobs/public)

This is where the “extra fields” like density bias / scaling belong.

## 4.1 Stage config surface (single object, knobs inside)

We’ll use **internal-as-public** here (no separate public schema), but knobs still exist.

Stage config input shape:

```ts
ecology: {
  knobs: {
    vegetationDensityScale?: number;  // cross-op control
    vegetationJitterScale?: number;   // cross-op control
  },

  // internal step map (since no stage public schema)
  "plot-vegetation"?: {
    trees?: Envelope;   // can omit; compiler prefills
    shrubs?: Envelope;  // can omit; compiler prefills
  }
}
```

## 4.2 Stage assembly (DX-clean: no manual runtimeOpsById)

```ts
// stages/ecology/index.ts
import { createStage } from "@mapgen/authoring/stage";
import { ecology } from "@mapgen/domain/ecology";

import { plotVegetation } from "./steps/plot-vegetation";

export const ecologyStage = createStage({
  id: "ecology",

  // canonical DX: stage imports domain once
  domains: [ecology],

  // unbound step defs
  steps: [plotVegetation],

  // stage knobs schema (optional but recommended)
  knobs: {
    vegetationDensityScale: { type: "number", default: 1.0, min: 0.25, max: 2.0 },
    vegetationJitterScale: { type: "number", default: 1.0, min: 0.0, max: 2.0 },
  },
});
```

### What createStage does internally (important mechanics)

* merges `domains[].opsById` into a single `compileOpsById` registry
* creates `runtimeOpsById` by calling `runtimeOp(...)` on each compile op (structural strip)
* binds each StepDef:

  * `boundOps = bindRuntimeOps(step.contract.ops, runtimeOpsById)`
  * engine step `run(ctx,cfg)` closes over `boundOps` and calls `step.run(ctx,cfg,boundOps)`
* stores `compileOpsById` on the stage for the compiler pipeline

No stage author boilerplate.

---

# 5) Recipe: standard

```ts
// recipes/standard/recipe.ts
import { createRecipe } from "@mapgen/authoring/recipe";
import { ecologyStage } from "../stages/ecology";

export const standardRecipe = createRecipe({
  id: "standard",
  stages: [ecologyStage],
});
```

---

# 6) Runtime entry (author input + run)

Here’s the author input (note we can omit envelopes; compiler prefills).

```ts
const env = buildEnvFromCiv7(init);

const config = {
  ecology: {
    knobs: {
      vegetationDensityScale: 1.2,
      vegetationJitterScale: 0.8,
    },

    "plot-vegetation": {
      // optional; omit trees/shrubs => compiler will prefill from op default envelopes
      // trees: { strategy: "default", config: { density: 0.5 } },
    },
  },
};

await standardRecipe.run({ context, env, config });
```

---

# 7) How knobs actually influence the op envelopes (without violating O3)

Since the step config has *only* envelopes, the knobs must influence compilation by **transforming envelopes**, not by adding extra step fields.

There are two canonical places knobs apply:

### A) Op-level normalize (compile-time)

Ops can read `ctx.knobs` and adjust the inner strategy config (shape-preserving):

* clamp density
* scale density
* etc.

### B) Step-level normalize (compile-time)

The step `normalize(cfg, ctx)` may adjust multiple envelopes at once. This is allowed and still O3-compliant because it’s only modifying existing envelope values.

Example (step normalize scales both trees + shrubs):

```ts
normalize: (cfg, { knobs }) => {
  const d = knobs.vegetationDensityScale ?? 1;
  return {
    ...cfg,
    trees: scaleDensity(cfg.trees, d),
    shrubs: scaleDensity(cfg.shrubs, d),
  };
}
```

No extra top-level fields are introduced.

---

# 8) Compiler behavior in this O3-compliant model (exact)

For a step with `ops` and derived schema:

1. Raw input may omit `trees`/`shrubs`
2. Compiler prefills each missing envelope using shared envelope builder default for that op contract
3. Strict normalize against step schema (now required keys exist)
4. Run `step.normalize` (if present)
5. Run op normalize per envelope using compile ops from stage domain registry
6. Strict normalize again
7. Persist compiled step config into compiled recipe config (no knobs included)

---

If you want, I can now also rewrite the “Canonical Step Module Pattern” section wording in the style of your architecture doc, but the above is the complete O3-compliant E2E example with stage-level binding and the DX cleaned up.

---------------------

Why does op still need normalize if step does it? And if decoupled, how does OP even define the knobs it needs? Are they selected from the domain knobs? knobs are defined in the domain right? 

---------------------

Some of the earlier spec files I previously read have expired on my side. It doesn’t block answering this, but if you want me to quote exact legacy wording about “domain knobs” and their ownership, re-upload those spec files and I’ll ground it precisely.

Now, to your questions:

## 1) Why does an op still need `normalize` if the step can do it?

It **doesn’t always**. `op.normalize` is optional. The reason we keep it as a first-class hook is because it solves a different problem than step normalization, and it keeps responsibilities clean.

### Step `normalize` is orchestration-level

Use it when the normalization logic:

* depends on *multiple ops at once* (cross-op coupling),
* depends on the step’s own semantics (how it wires artifacts/inputs),
* is best expressed “at the point of composition.”

Example: apply a shared “vegetationScale” knob to both `trees` and `shrubs` envelopes.

### Op `normalize` is contract-level (portable, reuse-friendly)

Use it when the normalization logic:

* is intrinsic to the op’s contract (clamping, derived defaults, invariants),
* should be applied consistently in *every* step/stage that uses the op,
* is likely to be duplicated otherwise.

Example: `planTreeVegetation` wants `density` clamped to [0,1] and default `jitter` applied and maybe an env-derived default like “maxCluster based on map area”.

If you rely only on step normalize, every step that uses `planTreeVegetation` must remember those rules. That’s brittle and violates “contract owns its invariants.”

### Canonical rule (simple)

* **Keep `op.normalize` for op-local invariants and defaults.**
* **Use `step.normalize` for cross-op composition logic.**
* It is always legal for a step to do “extra” normalization, but it should not be the only place invariants live.

And if an op has *no* invariants beyond schema defaults, it simply omits `normalize`.

---

## 2) If decoupled, how does an op define the knobs it needs?

It **should not** directly depend on a global knob bag shape. That would reintroduce coupling and make the op less reusable.

Instead, there are two clean options. The “best” one depends on whether you want knob selection to be a domain responsibility or a stage responsibility.

### Option A (recommended): ops don’t “declare knobs”; stage passes a typed knob slice

* Domains define the knob schema (or multiple knob schemas) at the **domain level**.
* Stages own the author-facing config surface and thus own `stageConfig.knobs`.
* During compilation, the compiler passes **a stage-scoped knob slice** into op.normalize.

Mechanically:

* `NormalizeCtx` contains `knobs: unknown` at the lowest level
* Each domain provides a typed selector function `selectKnobs(knobs)` that returns the slice for that op/domain.

So the op “defines” knobs it needs by defining how to **select** them from the stage’s knobs object.

Example:

```ts
// domain/ecology/knobs.ts
export const EcologyKnobsSchema = Type.Object({
  vegetationDensityScale: Type.Number({ default: 1 }),
  vegetationJitterScale: Type.Number({ default: 1 }),
});

export type EcologyKnobs = Static<typeof EcologyKnobsSchema>;

export function selectEcologyKnobs(stageKnobs: unknown): EcologyKnobs {
  // compiler ensures stageKnobs already normalized against stage.knobs schema
  return stageKnobs as EcologyKnobs;
}
```

Then op.normalize uses:

```ts
normalize: (cfg, ctx) => {
  const k = selectEcologyKnobs(ctx.knobs);
  return { ...cfg, density: clamp01(cfg.density * k.vegetationDensityScale) };
}
```

**Key property:** the op doesn’t import the stage. It only imports its domain knob selector/type.

### Option B: op normalize receives already-selected knobs (strongest typing)

The compiler (or stage compile) is responsible for passing the correct knob slice into each op.normalize:

```ts
op.normalize(envelope, { env, knobs: ecologyKnobs })
```

This is the most type-safe (op.normalize can be typed to `EcologyKnobs`), but it requires the compiler to know per-op knob typing. That’s more plumbing.

In practice, Option A is simpler and still safe.

---

## 3) Are knobs defined in the domain? Or in the stage? Which is canonical?

**Both exist, but in different roles.**

### Domain knobs (definition/meaning)

Domains should define the **meaningful knob schema** they understand. This is where:

* names are curated (`vegetationDensityScale`, `reefWarmBias`)
* defaults and constraints live
* docs live

This is the “domain-owned knobs contract.”

### Stage knobs (author-facing surface / wiring)

Stages decide:

* which domain knobs they expose,
* how they group them,
* whether they rename/re-export them,
* and how they compose multiple domains’ knobs.

This is the “composition-owned knobs surface.”

Given we locked “single author-facing surface per stage (`stageConfig.knobs`),” the stage is the place knobs are *entered*. But domains are the place knobs are *defined*.

### Minimal, non-magical canonical rule

* **Domains define knob schemas and types.**
* **Stages expose a knobs object that may include one or many domain knob groups.**
* The compiler passes the whole stage knobs object into normalize ctx.
* Ops select what they need via domain selector functions (Option A).

---

## Putting it together: why we keep both step and op normalize

* Stage compile and/or step normalize handles *cross-op composition* and “author UX mapping.”
* Op normalize handles *op invariants* and reusable defaults.
* Knobs are defined by domains but surfaced by stages; ops do not hard-couple to a global knob shape—they select.

---

## One crisp refinement to lock in (so implementers don’t get confused)

Add this to the spec:

1. `op.normalize` is optional and must only implement invariants/local defaults.
2. `step.normalize` is optional and is only for cross-op adjustments.
3. Knob values are always stage-scoped in `stageConfig.knobs`.
4. Domains may publish:

   * `KnobsSchema`
   * `selectKnobs(stageKnobs): DomainKnobs`
     so ops can read knobs without importing stage code.

If you confirm that’s the model you want, I’ll write the exact canonical “domain knobs export + stage knobs composition” file layout and the typing pattern we should standardize on (including naming conventions for grouping, e.g. `knobs.ecology.*` vs `knobs.domains.ecology.*`).


-----------------------

Some earlier uploaded spec files have expired on my side (tooling says so). It doesn’t block this decision; it’s self-contained. If you want me to quote the exact legacy wording on “domain knobs,” re-upload those legacy SPEC files and I’ll ground it.

Now: **yes** — your suggestion is the cleanest version of this:

> **Domain knobs are a domain-owned slice; ops receive that slice.**
> Compiler knows exactly what to normalize and can guarantee the knobs exist.

This is strictly better than “op picks knobs from a big unknown object” because it gives you:

* a concrete schema to normalize against
* an explicit guarantee about existence/shape
* a predictable compiler algorithm
* great TS inference with minimal boilerplate

Here’s the locked-in shape I recommend (minimal change, no new modes).

---

# Lock-in: domain knobs slice passed to ops

## 1) Domain owns knobs schema (single slice per domain)

Each domain exports:

* `id` (string literal)
* `knobsSchema` (TypeBox object schema for that domain’s knobs)
* ops/contracts as before

Example:

```ts
// src/domain/ecology/index.ts
export const ecology = {
  id: "ecology",
  knobsSchema: Type.Object(
    {
      vegetationDensityScale: Type.Number({ default: 1, minimum: 0.25, maximum: 2 }),
      vegetationJitterScale: Type.Number({ default: 1, minimum: 0, maximum: 2 }),
    },
    { additionalProperties: false, default: {} }
  ),

  contracts: { /* ... */ },
  opsById: { /* compile-surface ops */ },
} as const;

export type EcologyKnobs = Static<typeof ecology.knobsSchema>;
```

**Interpretation:** “domain knobs” are a stable contract. Ops don’t invent knobs; they consume this slice.

---

## 2) Stage composes knobs schema from domains (still single author surface)

Stage config remains one object:

```ts
stageConfig = {
  knobs: {
    ecology: { vegetationDensityScale: 1.2 },
    hydrology: { riverDensity: 0.8 },
  },
  ...public fields OR stepId map...
}
```

Stage factory does:

* `stage.knobsSchema` = `Type.Object({ [domain.id]: domain.knobsSchema, ... }, { additionalProperties:false })`
* `stageConfig.knobs` normalized once against that schema

So the stage doesn’t “define” domain knobs; it **exposes** them.

No parallel knobs input. No mode.

---

## 3) Compiler threads knobs in two forms (simple and typed)

### Step.normalize gets full stage knobs

Because step.normalize is cross-op/cross-domain.

```ts
type StageKnobs = Static<typeof stage.knobsSchema>;

step.normalize(cfg, { env, knobs: stageKnobs })
```

### Op.normalize gets *domain slice*

Because op.normalize is domain-local invariants/defaults.

```ts
const domainId = opContract.domainId; // derived from contract location or explicit field
const domainKnobs = stageKnobs[domainId];

op.normalize(envelope, { env, knobs: domainKnobs })
```

That’s the “slice they receive.”

---

## 4) How does the compiler know which domain slice to pass?

Two minimal options; I recommend the first:

### Option A (recommended): contract carries `domainId` explicitly

Add one required field to `defineOpContract`:

```ts
defineOpContract({
  domainId: "ecology",
  id: "ecology/planTreeVegetation",
  ...
})
```

Then the compiler can always do:

```ts
const domainKnobs = stageKnobs[contract.domainId];
```

This is explicit, non-magical, and survives refactors.

### Option B: infer domainId from op id prefix

If your op ids always start with `<domain>/...`, you can parse it.
This is slightly magical and easier to break.

So: **Option A**.

---

# Why this is better than “op selects knobs from domain knobs”

Because “select” usually implies one of:

* arbitrary function selector (harder typing, more magic)
* ad hoc key picking (no schema guarantee)

Your approach uses:

* **domain-owned schema** (guarantees existence/shape/defaults)
* **compiler-owned threading** (deterministic)
* **op-owned meaning** (op knows how to interpret domain knobs)

And it stays consistent with:

* single stage author surface (`stageConfig.knobs`)
* compiled configs drop knobs
* op normalize remains optional but precise

---

# Concrete compiler mechanics (exactly what happens)

1. **Stage config normalize**:

   * Normalize entire stage surface schema
   * Extract `stageKnobsRaw = stageConfig.knobs ?? {}`
   * Normalize `stageKnobs = normalizeStrict(stage.knobsSchema, stageKnobsRaw)`

2. **Step compile / canonicalization**:

   * Prefill envelopes from op contracts
   * Strict normalize step schema
   * Call `step.normalize(cfg, { env, knobs: stageKnobs })` (optional)

3. **Op normalization pass (per opKey in step.contract.ops)**:

   * `contract = step.contract.ops[opKey]`
   * `compileOp = bindCompileOps(step.contract.ops, stage.compileOpsById)[opKey]`
   * `domainKnobs = stageKnobs[contract.domainId]`
   * `compileOp.normalize(envelope, { env, knobs: domainKnobs })` (optional)

4. Strict normalize step schema again

Knobs never persist to runtime configs.

---

# What changes elsewhere as a result

### A) `defineOpContract` gets `domainId`

Small addition, big clarity.

### B) `createStage` builds knobs schema automatically from `domains[]`

Stage files don’t manually define domain knobs, they just list domains.

### C) NormalizeCtx becomes generic

So op normalize can be strongly typed:

```ts
type NormalizeCtx<Knobs> = { env: Env; knobs: Knobs };
```

Step normalize uses `NormalizeCtx<StageKnobs>`.
Op normalize uses `NormalizeCtx<EcologyKnobs>`.

That’s high DX with no extra work at callsites.

---

If you confirm you want **explicit `domainId` on every op contract** (I strongly recommend it), I’ll write the exact TypeScript signatures for:

* `defineOpContract` (updated)
* `DomainOpCompile.normalize` signature (typed knobs slice)
* `createStage({ domains })` knobs schema composition logic
* `compileRecipeConfig` knob threading logic

…so this is fully pinned and copy-pasteable in the canonical doc.
