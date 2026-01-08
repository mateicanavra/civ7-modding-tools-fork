### 1.17 Exact compile op shape vs runtime op shape

Compile op shape (compiler-visible) must include:

- `id`, `kind`
- `config` envelope schema
- `defaultConfig` envelope value
- `strategies` including optional `normalize` hooks per strategy
- `validate`, `runValidated`, `run`

Runtime op shape (step.run-visible) must include only:

- `id`, `kind`
- `run` and/or `runValidated` and `validate`
- must not include `normalize`, `defaultConfig`, or `strategies`

Canonical TS (shape intent):

```ts
export type DomainOpCompile = {
  id: string;
  kind: string;
  config: TSchema;
  defaultConfig: unknown;
  strategies: Record<string, { config: TSchema; normalize?: Function; run: Function }>;
  normalize?: (envelope: unknown, ctx: { env: Env; knobs: unknown }) => unknown;
  validate: Function;
  runValidated: Function;
  run: Function;
};

export type DomainOpRuntime = Pick<DomainOpCompile, "id" | "kind" | "validate" | "runValidated" | "run">;
```

Structural stripping is via `runtimeOp(op)` (see §1.14).

---

