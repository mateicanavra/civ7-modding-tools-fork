### 1.15 Author input vs compiled typing

#### Purpose

Pin the exact type split and how it ties to the compiler pipeline and envelope prefill.

This must satisfy:

- Author config may omit op envelopes (`StepConfigInputOf`)
- Compiled config drops knobs (no runtime knob channel)
- O3: ops-derived schema cannot have extra fields (extras require explicit schema)
- No step `inputSchema` concept required

#### Canonical types

Step-level types:

- Runtime config type (strict, canonical): `StepConfigOf<C> = Static<C["schema"]>`
- Author input type: treat op envelope keys as optional:

```ts
type StepConfigInputOf<C extends StepContractAny> =
  OmitPartialOps<Static<C["schema"]>, keyof C["ops"]>;

type OmitPartialOps<T, K extends PropertyKey> =
  T extends object ? Omit<T, Extract<K, keyof T>> & Partial<Pick<T, Extract<K, keyof T>>> : T;
```

Stage config input:

- Single author-facing object per stage
- Always has optional `knobs`
- Has either:
  - stage public fields (if stage defines public), or
  - internal step-id keyed configs (if not)

Recipe input vs compiled output:

- Author input (partial, ergonomic): `RecipeConfigInputOf<T>`
- Compiled output (total, canonical, no knobs): `CompiledRecipeConfigOf<T>`

If observability is needed, compiler can return a separate trace artifact:

```ts
type CompilationTrace = {
  stages: Record<string, { knobs: unknown; warnings: string[] }>;
};
```

#### Prefill + strict validation interaction (mechanics)

Compiler pipeline order (per step):

1. Start with raw step config input (may omit op keys)
2. Prefill op envelopes for each `opKey` in `step.contract.ops`
3. Run strict `normalizeStrict(step.schema)` (unknown keys error + default/clean)
4. Run `step.normalize(cfg, ctx)` if present (shape-preserving)
5. Run op normalization pass for each opKey:
   - normalize envelope using compile op surface
6. Re-run strict `normalizeStrict(step.schema)`
7. Output is `StepConfigOf` (canonical runtime config)

This guarantees:

- author can omit envelopes (`StepConfigInputOf`)
- runtime sees fully concrete config (`StepConfigOf`)
- no runtime defaulting needed

---

