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

