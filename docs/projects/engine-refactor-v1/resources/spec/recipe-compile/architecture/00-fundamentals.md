# Fundamentals

This document establishes the foundational rules, mental models, and
boundaries for the composition-first recipe compiler architecture.

# Proposal: Composition-first recipe compiler (canonical architecture)

This document is a **canonical consolidation pass** for the “composition-first recipe compiler” work. It is intended to replace “read 3–4 versions and reconcile mentally” with **one** coherent read.

**Primary sources (verbatim or near-verbatim, selectively merged):**
- `gpt-pro-recipe-compile-v4.md` (single-mode stage `public`, mechanical op envelope normalization, ops-derived step schema, “no runtime defaulting”, knobs lock-in)
- `gpt-pro-recipe-compile-v3.md` (layering diagram, type surfaces, end-to-end examples, risk-sliced implementation outline)
- `gpt-pro-recipe-compile-v2.md` (ground-truth baseline references + “what changes where” file mapping)

---

## Canonical Architecture


Spec package structure:

- `00-fundamentals.md` (this file) — Goals, invariants, mental model, layering, and the locked O1/O2/O3 statements
- `01-config-model.md` — Configuration model, knobs, and hook semantics
- `02-compilation.md` — Compilation pipeline, op envelopes, ops-derived schema, and normalization rules
- `03-authoring-patterns.md` — Step module pattern, bindings, and type flow
- `04-type-surfaces.md` — Canonical TypeScript definitions (includes Appendix A surfaces)
- `05-file-reconciliation.md` — What changes where in the repo
- `06-enforcement.md` — DX rules and lint boundaries
- `../examples/EXAMPLES.md` — End-to-end illustrative examples
### 1.1 Goals (what this architecture is for)

- **Composition-first**: recipe/stage composition produces a fully canonical internal execution shape.
- **No engine-time config resolution**: engine plan compilation validates; it does not default/clean/mutate configs and does not call any config “resolver”.
- **No runtime schema defaulting/cleaning**: runtime handlers (`step.run`, `strategy.run`) treat configs as already canonical.
- **One canonical internal config shape** at runtime:
  - stage boundary uses **step-id keyed internal step config maps**
  - op envelopes are **top-level properties** in step configs (keyed by `step.contract.ops`)
- **Incremental adoption is per-stage**, without recipe-wide “modes” and without runtime branching/mode detection.

Non-goals for this landing:
- A recipe-level global “public facade” schema (deferred).
- A step-level “public input schema pass” (e.g. `inputSchema`, or “canonical schema but everything Optional”) (deferred).
- Nested op-envelope discovery (“op AST”, nested paths, arrays) (explicitly out of model).

---

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

### 1.3 Four channels (mental model)

This architecture becomes tractable once these are treated as distinct channels:

1. **`env`** — runtime envelope (Civ7 / runner supplied; not author config)
2. **`knobs`** — author-facing, cross-cutting tuning used during compilation/normalization
3. **`config`** — canonical internal configs (stable shapes; value-only normalization)
4. **`inputs`** — runtime artifacts (maps, buffers, intermediates) produced/consumed by steps and ops

---

### 1.4 Layering and dependency boundaries

```
Domain (ops + strategies + contracts)
  └── exports a domain public surface (`src/domain/<domain>/index.ts`):
      - `contracts` (contract-only; safe for step contracts)
      - `ops` (compile-surface implementations; developer convenience)
      - `compileOpsById` (compile-surface registry by `op.id`; deterministic; built, not hand-maintained)
      - `runtimeOpsById` (runtime-surface registry by `op.id`; deterministic; built, not hand-maintained)
  └── cross-module consumers import only from:
      - `@mapgen/domain/<domain>` (domain public surface), and
      - `@mapgen/domain/<domain>/contracts` (contract-only; safe narrow import),
      - with no deep imports into `ops/**` or `strategies/**`

Step (internal node; orchestration)
  └── defines internal schema (required)
  └── declares which op envelopes exist (optional; declared as op contracts, derived to op refs)
  └── optional value-only normalize hook
  └── runtime run handler can call ops (injected), without importing implementations directly

Stage (author-facing unit)
  └── owns optional stage-level public view (schema + compile hook)
  └── otherwise stage input is internal-as-public

Recipe (composition + compilation orchestrator)
  └── composes stages
  └── owns the compile pipeline (stage public→internal if present, then step/op canonicalization)
  └── instantiates engine recipe only from compiled internal configs

Engine (execution plan + executor)
  └── validates runtime envelope + compiled step configs
  └── builds plan + executes
  └── must not default/clean/mutate config
```

Hard boundary:
- Domain code must not import engine plan compilation internals. `env` must live in a shared runtime module, not in engine-only types.
- Domain code must not import from `recipes/**` or `maps/**`.
- Recipe wiring may import domain modules, but must not import from `maps/**`.

---
## Open Questions / Ambiguities (remaining)

O1/O2/O3 were previously tracked as “known unknowns”, but are now **locked in** and should not be treated as open:

- **O1 (closed)**: shared op envelope derivation is implemented and used by both `createOp(...)` and `opRef(...)` via `packages/mapgen-core/src/authoring/op/envelope.ts`.
- **O2 (closed)**: recipe config typing is split into author input vs compiled output via `RecipeConfigInputOf<...>` and `CompiledRecipeConfigOf<...>` in `packages/mapgen-core/src/authoring/types.ts` (baseline note: `CompiledRecipeConfigOf` is currently an alias; the split is a locked design requirement for v1).
- **O3 (closed)**: no “derive ops schema + add extra top-level fields implicitly” hybrid. If you want non-op fields, you must provide an explicit step schema (op-key schemas are still overwritten from `ops` contracts so authors don’t duplicate envelope schemas).

No additional open questions are tracked in this document yet.

---
