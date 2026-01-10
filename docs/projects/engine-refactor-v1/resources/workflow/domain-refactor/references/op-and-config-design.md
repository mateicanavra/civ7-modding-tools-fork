# Op + Config Design (Reference)

This is the reference for:
- op contract design (ids, kinds, schemas, strategies),
- config ownership + defaulting + compile-time resolution (`resolveConfig`),
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
- Strategy implementations are authored with `createStrategy(contract, strategyId, { resolveConfig?, run })`.
- `createOp(contract, { strategies })` derives and exposes:
  - `op.config`: a union schema for `{ strategy, config }`,
  - `op.defaultConfig`: always `{ strategy: "default", config: <defaulted inner> }`,
  - `op.resolveConfig(envelope, settings)`: dispatcher over `strategy.resolveConfig`.
- Steps call `op.runValidated(input, config)`; steps do not call internal rules directly.

If an op needs randomness, model it explicitly:
- add `rngSeed: Type.Integer(...)` to the op `input` schema (not an RNG callback),
- derive deterministic draws inside the op from `rngSeed`,
- derive `rngSeed` in the step using `ctxRandom(...)` (see the spec for the canonical pattern).

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
  resolveConfig: (cfg) => ({ ...cfg }),
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
- Put **settings-derived defaults** in `strategy.resolveConfig` (composed via `op.resolveConfig` at the step boundary).
- Do not implement meaning-level defaults in runtime step or op `run(...)` (`?? {}` merges and `Value.Default(...)` in runtime paths are migration smells).

### Resolution location (colocation + composition)

Domain-owned scaling semantics live with the op:
- `mods/mod-swooper-maps/src/domain/<domain>/ops/**` exports `resolveConfig` (optional) next to `config` and `defaultConfig`.

Step-level composition is the only place ops are combined:
- `step.resolveConfig(stepConfig, settings)` fans out to each op’s derived `resolveConfig` and recomposes a step config that still validates against the step schema.

Hard rule:
- Resolvers and schemas are not centralized in recipe roots or shared “resolver registries”; they live with the domain operations that own the semantics.

### Compile-time enforcement reality (must match engine behavior)

- `step.resolveConfig` is executed during plan compilation in `packages/mapgen-core/src/engine/execution-plan.ts`.
- If a step defines `resolveConfig` it must also define a schema (`defineStep({ schema: ... })`), otherwise plan compilation produces `step.resolveConfig.failed` with message `resolveConfig requires configSchema`.
- The engine normalizes the resolver output through the same schema again (defaults/cleaning + unknown-key checks). Resolver output must remain schema-valid and must not add internal-only fields.

### Allowed vs forbidden merges (resolver vs runtime)

- Allowed: object spread/merge inside `resolveConfig` (compile-time shaping).
- Forbidden: object spread/merge used to “default” config in runtime `run(...)` paths (step or op).
