# Op + Config Design (Reference)

This is the reference for:
- op contract design (ids, kinds, schemas, strategies),
- config ownership + defaulting + compile-time resolution (`resolveConfig`),
- and the hard boundaries that prevent config “fixups” from creeping back into runtime.

Canonical references:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`

## Target op surface design (fixed rule set)

Define the target op catalog for the domain, with **no optionality**:
- Each op has an explicit `kind`: `plan | compute | score | select` (ADR-ER1-034).
- Each op lives in its own module under `mods/mod-swooper-maps/src/domain/<domain>/ops/**` (one op per module).
- Each op owns:
  - an op `schema` object that contains `input`, `config`, and `output` schemas
  - `defaultConfig` (derived from schema defaults)
  - optional `resolveConfig(config, settings)` (compile-time only)
- Steps call `op.runValidated(input, resolvedConfig)`; steps do not call internal rules directly.

If an op needs randomness, model it explicitly:
- add `rngSeed: Type.Integer(...)` to the op `input` schema (not an RNG callback),
- derive deterministic draws inside the op from `rngSeed`,
- derive `rngSeed` in the step using `ctxRandom(...)` (see `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`), with a stable label string (canonical pattern: `<stepId>:<opName>:rngSeed`).

Naming constraints:
- Op ids are stable and verb-forward (e.g., `compute*`, `plan*`, `score*`, `select*`).
- Strategy selection exists only when there are truly multiple implementations; otherwise keep config flat.

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

Illustrative skeleton (trimmed; do not invent extra surfaces):
```ts
export const myOpSchema = Type.Object(
  {
    input: Type.Object(
      { width: Type.Integer(), height: Type.Integer(), field: TypedArraySchemas.u8() },
      { additionalProperties: false }
    ),
    config: Type.Object(
      { knob: Type.Optional(Type.Number({ default: 1 })) },
      { additionalProperties: false, default: {} }
    ),
    output: Type.Object({ out: TypedArraySchemas.u8() }, { additionalProperties: false }),
  },
  { additionalProperties: false }
);

export const myOp = createOp({
  kind: "compute",
  id: "<domain>/<area>/<verb>",
  schema: myOpSchema,
  resolveConfig: (cfg, settings) => ({ ...cfg }), // compile-time only
  customValidate: (input, cfg) => [],             // optional, returns pathful errors
  run: (input, cfg) => ({ out: input.field }),
} as const);
```

## Config canonicalization rules (post-U10)

This is the mandatory pipeline; do not invent a parallel system.

### Defaults and cleaning: TypeBox-native

Plan compilation defaults and cleans config via TypeBox `Value.*` utilities (ADR-ER1-035).

Rules:
- Put **local, unconditional defaults** in the schema (TypeBox `default`).
- Put **settings-derived defaults** in `resolveConfig` (op-level, composed by step-level `resolveConfig`).
- Do not implement meaning-level defaults in runtime step or op `run(...)` (`?? {}` merges and `Value.Default(...)` in runtime paths are migration smells).

### Resolution location (colocation + composition)

Domain-owned scaling semantics live with the op:
- `mods/mod-swooper-maps/src/domain/<domain>/ops/**` exports `resolveConfig` (optional) next to `config` and `defaultConfig`.

Step-level composition is the only place ops are combined:
- `step.resolveConfig(stepConfig, settings)` fans out to each op’s `resolveConfig` and recomposes a step config that still validates against the step schema.

Hard rule:
- Resolvers and schemas are not centralized in recipe roots or shared “resolver registries”; they live with the domain operations that own the semantics.

### Compile-time enforcement reality (must match engine behavior)

- `step.resolveConfig` is executed during plan compilation in `packages/mapgen-core/src/engine/execution-plan.ts`.
- If a step defines `resolveConfig` it must also define a schema (`createStep({ schema: ... })`), otherwise plan compilation produces `step.resolveConfig.failed` with message `resolveConfig requires configSchema`.
- The engine normalizes the resolver output through the same schema again (defaults/cleaning + unknown-key checks). Resolver output must remain schema-valid and must not add internal-only fields.

### Allowed vs forbidden merges (resolver vs runtime)

- Allowed: object spread/merge inside `resolveConfig` (compile-time shaping).
- Forbidden: object spread/merge used to “default” config in runtime `run(...)` paths (step or op).
