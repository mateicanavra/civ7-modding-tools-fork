### 1.2 Invariants (must not be violated)

This section is the **curated “rules of the road”**. If a future change violates one of these, it must be treated as a design change (not a refactor) and re-justified explicitly.

#### I1 — Single-mode configuration (no recipe-wide modes)

- There is exactly **one** configuration model:
  - per-stage optional `public` view + `compile` hook, otherwise internal-as-public
  - no recipe-wide variant flags, and no runtime mode detection/branching
- Recipe-owned global facade (“Variant C”) is explicitly **deferred**.

#### I2 — No runtime config resolution/defaulting

- Runtime handlers (`step.run`, `strategy.run`) must not default/clean/normalize configs.
- Engine plan compilation validates; it must not mutate config objects and must not call any step/op “resolver”.
- All schema defaulting/cleaning lives in compiler-only modules, owned by the recipe compiler pipeline.

#### I3 — `compile` vs `normalize` semantics are strict

- `compile` is **shape-changing** and exists only to map **stage public → internal step-id keyed map**.
- `normalize` is **shape-preserving** (value-only canonicalization) and must return a value validating against the same schema shape.
- The compiler always runs the full canonicalization pipeline; “public === internal” never means “skip compilation”.

#### I4 — Stage surface + knobs (single author-facing surface, compiler-threaded)

- Knobs are always a field on the stage config object: `stageConfig.knobs`.
- The compiler extracts knobs **once** and threads them into step/op normalization via ctx: `{ env, knobs }`.
- Step configs do not embed a `knobs` field.
- Reserved key rule: `"knobs"` cannot be a step id and cannot be a stage public field name.

#### I5 — Stage public vs stage surface schema

- If a stage defines a `public` view, it defines the schema for the **non-knob** portion of the stage surface.
- The stage’s single author-facing schema is a computed **stage surface schema** that includes:
  - `knobs` (validated by the stage’s knobs schema, defaulting to `{}`), and
  - either stage public fields (when `public` is present) or step-id keys (for internal-as-public stages).
- Internal-as-public stage surface validation must not validate step configs (step fields are `unknown`); strict step validation happens later during step canonicalization (after op-prefill).
- Stage exposes a deterministic `toInternal(...)` plumbing hook: no “shape detection”.

#### I6 — Op envelope discovery is contract-driven and top-level only

- Op envelopes are discovered **only** via `step.contract.ops`.
- Op envelopes are top-level properties in step configs: `stepConfig[opKey]`.
- No nested traversal, arrays, or scanning config shapes to infer ops.

#### I7 — Inline schema strictness + ops-derived step schema (DX)

- Inline schema field-map shorthands are supported only inside definition factories, and default to `additionalProperties: false`.
- If a step contract declares `ops` and omits `schema`, the factory may derive a strict step schema from op envelope schemas.
- There is no separate “input schema” for step configs in v1; author-input partiality is handled by the compiler pipeline (op-prefill before strict validation) plus type-level author input types (O2).
- This landing does **not** support adding “extra” top-level keys on top of an ops-derived schema; authors must provide an explicit schema (and include any op envelope keys they want) if they need extra keys.

---

