# Op + Config Design (Reference)

This is the reference for:
- op contract design (ids, kinds, schemas, strategies),
- config ownership + defaulting + compile-time normalization (`normalize`),
- and the hard boundaries that prevent config “fixups” from creeping back into runtime.

Canonical references:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`
- `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`

## Target op surface design (fixed rule set)

Define the target op catalog for the domain, with **no optionality**:
- Each op has an explicit `kind`: `plan | compute | score | select` (ADR-ER1-034).
- Each op lives in its own module under `mods/mod-swooper-maps/src/domain/<domain>/ops/**` (one op per module).
- Each op is contract-first and owns:
  - `input` schema (shared across all strategies),
  - `output` schema (shared across all strategies),
  - `strategies` schema map (must include `"default"`).
- Strategy implementations are authored with `createStrategy(contract, strategyId, { normalize?, run })`.
- `createOp(contract, { strategies })` derives and exposes:
  - `op.config`: a union schema for `{ strategy, config }`,
  - `op.defaultConfig`: always `{ strategy: "default", config: <defaulted inner> }`,
  - `op.normalize(envelope, ctx)`: dispatcher over `strategy.normalize` (compile-time only; executed by the compiler).
- Steps call injected runtime ops (typed from contracts): `ops.<key>(input, config.<key>)`.
  - Steps must not call internal rules directly.
  - Steps must not import op implementations; runtime ops are injected by `createRecipe` based on the step contract’s declared op contracts.

If an op needs randomness, model it explicitly:
- add `rngSeed: Type.Integer(...)` to the op `input` schema (not an RNG callback),
- derive deterministic draws inside the op from `rngSeed`,
- derive `rngSeed` in the step using `ctxRandom(...)` (see the spec for the canonical pattern).

## Atomic ops (strict rule set)

Ops are **atomic** by design:
- An op implementation must not call another op (no `otherOp.run(...)` / `otherOp(...)` / nested op orchestration).
- Composition belongs in steps/stages: steps may call multiple ops and compose their results.
- “Shared logic” belongs in `rules/**` (policy-style logic), not in calling other ops.

This rule is intentionally strict: it keeps op contracts small, makes op ids meaningful, and makes later re-wiring (or reuse) tractable.

## Rules as policies (avoid generic helper drift)

Within an op, use rules as **policy units**:
- A rule should encode a domain decision/policy (thresholds, heuristics, filters, scoring), not just a generic utility.
- Ops/strategies import rules to make decisions; rules should not reach out to step/stage code or other ops.
- If a rule needs injected behavior (RNG draws, adapter reads, external data), inject it via parameters at the op boundary (or as explicit inputs in the op contract), never via ambient globals.

Naming constraints:
- Op ids are stable and verb-forward (e.g., `compute*`, `plan*`, `score*`, `select*`).
- Strategy selection is always explicit in plan truth (`{ strategy, config }`). Single-strategy ops still use `strategies: { default: ... }`.

## Op sizing and naming guardrails (avoid noun-first buckets)

These guardrails exist to prevent “mega ops” and loss of granularity (a common failure mode in messy domains).

Hard rules:
- Op ids must be verb-forward and action-specific. If the id reads like a noun/category (`placement`, `terrain`, `features`), it is probably too broad.
- Prefer multiple small ops over one “bucket op” that does multiple distinct jobs.
- If a change can be expressed as “compute X”, “plan Y”, “score Z”, or “select W”, it should usually be its own op.

Heuristics for splitting:
- Split by **different responsibilities** even if they share inputs (e.g., compute a field vs plan placements).
- Split by **different kinds** (a `plan` should not also be a `compute`).
- If an op’s config starts to look like multiple unrelated knobs, you likely need multiple ops or strategy modules.

Heuristics for using strategies vs ops:
- Use strategies when the op’s contract stays stable but the internal implementation changes by strategy (same kind, same input/output shape).
- Avoid strategies as a way to hide unrelated responsibilities under one op id.

Step sizing note:
- Refactors should not collapse multiple legacy steps into one mega-step; preserve step granularity and extract shared logic into ops/rules instead.

## Contract-first skeleton (trimmed; do not invent extra surfaces)

```ts
// src/domain/<domain>/ops/<op>/contract.ts
import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

export const MyOpContract = defineOp({
  kind: "compute",
  id: "<domain>/<area>/<verb>",
  input: Type.Object(
    { width: Type.Integer(), height: Type.Integer(), field: TypedArraySchemas.u8() },
    { additionalProperties: false }
  ),
  output: Type.Object({ out: TypedArraySchemas.u8() }, { additionalProperties: false }),
  strategies: {
    default: Type.Object(
      { knob: Type.Optional(Type.Number({ default: 1 })) },
      { additionalProperties: false, default: {} }
    ),
  },
} as const);
```

```ts
// src/domain/<domain>/ops/<op>/strategies/default.ts
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { MyOpContract } from "../contract.js";

export const defaultStrategy = createStrategy(MyOpContract, "default", {
  normalize: (cfg) => ({ ...cfg }),
  run: (input, cfg) => ({ out: input.field }),
});
```

```ts
// src/domain/<domain>/ops/<op>/index.ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { MyOpContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const myOp = createOp(MyOpContract, {
  strategies: { default: defaultStrategy },
});

export * from "./contract.js";
export type * from "./types.js";
```

## Op type surface (single type bag)

`types.ts` is the only shared type surface for an op. Do not export types from rules or helpers.

```ts
// src/domain/<domain>/ops/<op>/types.ts
import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").MyOpContract;

export type MyOpTypes = OpTypeBag<Contract>;
```

## Config canonicalization rules (post-U10)

This is the mandatory pipeline; do not invent a parallel system.

### Defaults and cleaning: TypeBox-native

Plan compilation defaults and cleans config via TypeBox `Value.*` utilities (ADR-ER1-035).

Rules:
- Put **local, unconditional defaults** in the schema (TypeBox `default`).
- Put **env/knobs-derived defaults** in `strategy.normalize` (composed via `op.normalize` and executed by the compiler).
- Do not implement meaning-level defaults in runtime step or op `run(...)` (`?? {}` merges and `Value.Default(...)` in runtime paths are migration smells).

### Semantic knobs must have a contract (meaning, defaults, empty/null, determinism)

If a config field is “semantic” (it encodes meaning, not just a scalar):
- concatenated lists/pairs/bands,
- weights/probabilities,
- “modes” that change behavior,
- fields whose absence/emptiness is itself meaningful,

then it must have an explicit contract recorded in Phase 2 and enforced by tests.

Minimum contract fields (write them down; do not infer ad hoc during implementation):
- **Meaning:** what the field represents in the model.
- **Defaulting policy:** what “missing” means (inherit evolving defaults vs freeze behavior).
- **Empty/null policy:** what `[]`/`null` means (disable, explicit no-op, or “use defaults”).
- **Determinism policy:** if the field implies randomness (weights), define seed/RNG expectations and where randomness is allowed to live.

Recommended deliverable (Phase 2 spike): a “config semantics table”:

| Field | Meaning | Missing default | Empty/null | Determinism | Examples | Test that locks it |
|---|---|---|---|---|---|---|
| `<field>` | `<...>` | `<...>` | `<...>` | `<...>` | `<...>` | `<...>` |

### Prefer normalization as the stable “interpretation boundary”

For any complex config semantics, prefer an explicit “interpret config → normalized internal form” function authored in `normalize`:
- it centralizes meaning-level interpretation,
- it is a stable anchor point for later fixes (survivability across slices),
- it makes tests tighter (assert on normalized form and downstream behavior).

### Resolution location (colocation + composition)

Domain-owned scaling semantics live with the op:
- `mods/mod-swooper-maps/src/domain/<domain>/ops/**` exports an op implementation with `config`, `defaultConfig`, and `normalize` (strategy `normalize` is optional).

Step-level composition is the only place ops are combined:
- Step contracts declare op contracts (`contract.ops`), and the compiler fans out `op.normalize(...)` across those declared op envelopes.
- Step modules may optionally provide `step.normalize(...)` for step-owned shaping, but should not manually normalize op envelopes.

Hard rule:
- Resolvers and schemas are not centralized in recipe roots or shared “resolver registries”; they live with the domain operations that own the semantics.

### Compile-time enforcement reality (must match engine behavior)

- Step config normalization happens during plan compilation in:
  - `packages/mapgen-core/src/compiler/recipe-compile.ts`
  - `packages/mapgen-core/src/compiler/normalize.ts`
- The compiler pipeline is (conceptually):
  1) prefill op defaults for declared ops (from op contracts)
  2) strict schema normalization (defaults + unknown-key rejection)
  3) optional `step.normalize(config, { env, knobs })`
  4) op normalization fanout (`op.normalize(envelope, { env, knobs })`) for each declared op
  5) strict schema normalization again (shape-preserving enforcement)
- `step.normalize` must be shape-preserving: it must return a value that still validates against the step schema and must not inject internal-only fields.

### Allowed vs forbidden merges (resolver vs runtime)

- Allowed: object spread/merge inside `step.normalize` or `strategy.normalize` (compile-time shaping).
- Forbidden: object spread/merge used to “default” config in runtime `run(...)` paths (step or op).
