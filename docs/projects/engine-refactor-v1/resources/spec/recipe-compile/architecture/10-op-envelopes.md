### 1.10 Mechanical op envelopes (discovery rules, helpers, and “top-level only”)

Non-negotiable invariants:

- Op envelopes are discovered **only** via `step.contract.ops`.
- Op envelopes are **top-level properties** in the step config object: `stepConfig[opKey]`.
- “Mega-ops” are treated as single ops (internal composition is domain-private).

Strict schema normalization helper (compiler-only) mirrors existing engine behavior (default + clean + unknown-key errors), but runs in compilation, not engine planning:

```ts
// NEW (planned): compiler-only helper.
//
// Baseline today: `normalizeStepConfig(...)` in `packages/mapgen-core/src/engine/execution-plan.ts`
// (uses `findUnknownKeyErrors(...)` + `Value.Default(...)` + `Value.Clean(...)` + `Value.Errors(...)`).
//
// NEW (planned): `CompileErrorItem` is a compiler-owned error surface (no baseline type exists today;
// baseline uses `ExecutionPlanCompileErrorItem` in `packages/mapgen-core/src/engine/execution-plan.ts`).
function normalizeStrict<T>(schema: TSchema, rawValue: unknown, path: string): { value: T; errors: CompileErrorItem[] } { /* ... */ }
```

Prefill op defaults (compiler-only; not schema defaulting):

```ts
// NEW (planned): `StepModuleAny` is a future step-module surface for the compiler pipeline.
// Baseline today:
// - authoring step module type: `StepModule` in `packages/mapgen-core/src/authoring/types.ts`
// - engine step type: `MapGenStep` in `packages/mapgen-core/src/engine/types.ts`
function prefillOpDefaults(step: StepModuleAny, rawStepConfig: unknown, path: string): { value: Record<string, unknown>; errors: CompileErrorItem[] } { /* ... */ }
```

Mechanical op normalization pass (strategy-selected, schema-driven):

```ts
function normalizeOpsTopLevel(
  step: StepModuleAny,
  stepConfig: Record<string, unknown>,
  ctx: NormalizeCtx<Env, Knobs>,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } { /* ... */ }
```

Why “top-level only” is a hard model constraint:
- The normalization layer is a wiring layer, not an AST layer.
- Nested traversal encourages config DSL creep and mega-op patterns; it is out-of-scope by design.

---

