# Configuration Model

This document defines how author configuration flows through the system and
transforms into runtime-ready configs.

### 1.5 Canonical configuration model (single mode, per-stage optional `public`)

There is exactly **one** configuration model:

- A recipe is composed of stages.
- Each stage always has an **internal** config surface derived from its steps (always exists).
- A stage may optionally define a **public** schema + `compile` function:
  - If present: stage config input is **public**, and `compile` maps public → internal step-id keyed configs.
  - If absent: stage config input is assumed to already be **internal** (*public = internal* for that stage).

Stage config surface shape (always):
- Stage config is a single object.
- `knobs` is always a field on that object (`stageConfig.knobs`).
- Stage `public` schema (when present) is the schema for the **non-knob** portion; the full author-facing schema is the computed stage surface schema (`knobs` + fields).

Explicitly deferred (not implemented now):
- **Recipe-owned global facade** (the old “Variant C”).

Resulting “variant” surface (compile-time only):
> “stage has explicit public schema” vs “stage uses internal schema as public schema.”

There is no recipe-wide mode flag and no runtime branching/mode detection.

---

Inline example: stage contract with an explicit `public` view (single author-facing surface).

```ts
import { Type } from "typebox";

import { createStage } from "@swooper/mapgen-core/authoring";

import { plotVegetationStep } from "./steps/plot-vegetation/index.js";
import { plotWetlandsStep } from "./steps/plot-wetlands/index.js";

export const ecologyStage = createStage({
  id: "ecology",

  steps: [plotVegetationStep, plotWetlandsStep] as const,

  knobsSchema: Type.Object(
    {
      vegetationDensityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
    },
    { additionalProperties: false, default: {} }
  ),

  // Public schema is the non-knob portion when a public view is present.
  public: Type.Object(
    {
      vegetation: Type.Object(
        {
          densityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
        },
        { additionalProperties: false, default: {} }
      ),
      wetlands: Type.Object({}, { additionalProperties: false, default: {} }),
    },
    { additionalProperties: false, default: {} }
  ),

  // `createStage` computes `surfaceSchema` (single author-facing schema) and provides `toInternal`.
  //
  // Stage authors provide only the public → internal mapping via `compile`.
  compile: ({ env, knobs, config }) => {
    void env;
    void knobs;
    return {
      // Important: stage compile outputs `StepConfigInputOf` values (partial; op envelopes may be omitted).
      "plot-vegetation": { densityBias: config.vegetation.densityBias },
      "plot-wetlands": {},
    };
  },
} as const);
```

### 1.6 Knobs model (single author surface, ctx-threaded to step normalization)

This section is a detailed mechanics expansion of invariants I4/I5 (knobs + stage surface).

#### K1 — Knobs are always a field in the stage config surface

- Knobs live at `stageConfig.knobs`.
- There is exactly **one** author-facing surface per stage: the stage config object contains:
  - `knobs` (optional), and
  - step configs keyed by step id (partial allowed), or stage public fields (if stage defines a public view).
- There is **no** separate “knobs input” at the recipe/engine API boundary.

#### K2 — The compiler extracts knobs once and threads them through normalization via ctx

- The compiler performs stage config normalization, extracts `knobs`, then runs step/op canonicalization.
- Steps receive `{ env, knobs }` via a normalization context argument (compile-time only).
- Knobs do not become a runtime execution surface; they are compile-time normalization context.

#### K3 — Step configs do not contain knobs fields

- Per-step configs do not embed a `knobs` field.

#### K4 — Reserved key rule

- No step id may be `"knobs"`.

Illustrative types:

```ts
type NormalizeCtx<Env, Knobs> = { env: Env; knobs: Knobs };

type StepNormalize<TConfig, Env, Knobs> =
  (config: TConfig, ctx: NormalizeCtx<Env, Knobs>) => TConfig;

type StageInternalInput<StepId extends string, Knobs> =
  Partial<Record<StepId, unknown>> & { knobs?: Knobs };
// invariant: no step id may be "knobs"
```

Mechanical extraction (always-on):

```ts
const { knobs = {}, ...rawStepMap } = stageConfig;
// rawStepMap keyed by step id
// step.normalize(stepConfig, { env, knobs })
```

Important clarification for *public === internal*:
- Identity only applies to the **step-map portion** of the stage config.
- Compilation is not “skipped”; the compiler still extracts knobs and runs canonicalization.

---

### 1.7 Hook semantics (compile vs normalize)

Terminology is intentionally strict:

- **`compile`** (shape-changing): maps a stage’s **public** view (non-knob portion) into an internal step-id keyed map (and may consult `knobs` and `env`).
  - Only required when `public !== internal` for that stage.
- **`normalize`** (shape-preserving): value-only canonicalization; must return the same shape it receives.
  - Used for step-level and op-level canonicalization inside the compiler pipeline.

Runtime handlers (`step.run`, `strategy.run`) must not default/clean/normalize; they execute with already-canonical configs.

Clarifications: “shape-preserving” normalization

- `normalize` may change values (including nested objects and array contents) and may fill optional fields, so long as the result still validates against the same schema (no unknown keys, correct types, etc.).
- `normalize` must not change the *structural model* of the config (e.g. it must not move op envelopes to different keys, introduce new top-level keys not present in the schema, or convert an object into a different shape).
- Schema defaults/cleaning are owned by strict normalization (`Value.Default` + `Value.Clean`); `normalize` is for value-only canonicalization and derived adjustments.

Inline example (shape-preserving vs non-shape-preserving):

```ts
// shape-preserving: edits values, preserves top-level op envelope topology, still validates
normalize: (cfg, ctx) => ({
  ...cfg,
  densityBias: Math.max(-1, Math.min(1, cfg.densityBias)),
});

// not shape-preserving (rejected): adds a new key not present in the schema
normalize: (cfg) => ({
  ...cfg,
  debug: true,
});
```

---
