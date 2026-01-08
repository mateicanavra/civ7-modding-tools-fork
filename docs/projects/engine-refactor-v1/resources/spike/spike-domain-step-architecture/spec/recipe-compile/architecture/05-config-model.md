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

