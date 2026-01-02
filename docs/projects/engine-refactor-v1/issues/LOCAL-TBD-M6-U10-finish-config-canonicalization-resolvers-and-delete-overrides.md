---
id: LOCAL-TBD-M6-U10
title: "[M6] Finish config canonicalization (resolveConfig wiring + delete overrides translator)"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - ADR-ER1-035
  - ADR-ER1-030
  - ADR-ER1-034
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Finish the “config story” end-to-end for MapGen by implementing DD‑002’s compile-time config resolution wiring (`resolveConfig`) and deleting the remaining legacy authoring surface (`StandardRecipeOverrides` → `StandardRecipeConfig` translation).

## Target outcome (canonical)
- **Plan truth:** `compileExecutionPlan(...)` produces a fully schema-defaulted, cleaned, and **resolution-applied** `ExecutionPlan.nodes[].config` for every enabled step.
- **Fractal only at step boundaries:** the compiler calls `step.resolveConfig(stepConfig, settings)`; composite steps use that hook to delegate to op-local `op.resolveConfig(opConfig, settings)` and recompose.
- **Runtime steps do not branch:** steps treat `node.config` as “the config” and do not do meaning-level defaults/merges at runtime.
- **No legacy config translation:** remove `StandardRecipeOverrides` (DeepPartial global-ish override blob) and the translator that builds `StandardRecipeConfig` from it.
- **No legacy runner entrypoints:** delete overrides-shaped map runner wiring; map entrypoints supply `settings` and `config` directly and runner glue only wires adapter/context + `recipe.run(...)`.

## Deliverables
- Engine/runtime:
  - `compileExecutionPlan(...)` executes an optional `step.resolveConfig(...)` hook (pure; settings-only) and stores the result in `ExecutionPlan.nodes[].config`.
  - Compile errors are surfaced as pathful `ExecutionPlanCompileError` items (unknown keys + schema errors), including errors from resolver output.
- Authoring SDK:
  - `createOp(...)` supports an optional **compile-time** `resolveConfig(config, settings) -> config` hook (domain owns; compiler executes via step boundary).
  - Resolver output must remain valid under the existing schema (no plan-stored internal-only fields).
- Mod authoring (standard maps):
  - Delete `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` entirely:
    - no `DeepPartial<T>`,
    - no `StandardRecipeOverrides`,
    - no `buildStandardRecipeConfig(...)`,
    - no “defaults via `Value.Default`” that mutate/construct recipe config at runtime.
  - `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` no longer accepts overrides-shaped inputs:
    - no `overrides?: ...`,
    - no `safeOverrides` shells,
    - no config/setting derivation via override translation.
  - Standard map entrypoints no longer build a DeepPartial “global overrides” blob; they provide:
    - explicit `RunSettings` (seed/dimensions/wrap/trace/directionality), and
    - a direct `StandardRecipeConfig | null` (no runtime translation layer).
- Migration/cleanup:
  - Derived defaults that currently live as “meaning-level fixups” inside runtime code are moved into:
    - schema defaults (pure local defaults), or
    - `resolveConfig` (settings-aware compile-time normalization), or
    - explicit runtime param derivation (allowed, but must not mutate/merge config).

## Acceptance Criteria
- `packages/mapgen-core/src/engine/execution-plan.ts` calls `step.resolveConfig(config, settings)` (when defined) and validates the returned config against `step.configSchema` before writing to the plan.
- A composite resolver pattern is demonstrated in tests (canonical fan-out → delegate → recompose using op-local resolvers) and results in plan-truth config in `ExecutionPlan.nodes[].config`.
- `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` does not accept or mention overrides-shaped authoring:
  - no `StandardRecipeOverrides`,
  - no `buildStandardRecipeConfig`,
  - no `buildStandardRunSettings` that reads from overrides (the legacy builder is deleted with the overrides layer).
- `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` is deleted.
- `mods/mod-swooper-maps/src/maps/**` does not construct “global-ish overrides” objects as the author surface (no `StandardRecipeOverrides` usage).
- Guardrails (documented as zero-hit checks) pass:
  - `rg -n "StandardRecipeOverrides|buildStandardRecipeConfig|DeepPartial<" mods/mod-swooper-maps/src` is empty
  - `rg -n "\\bValue\\.Default\\(" mods/mod-swooper-maps/src/maps mods/mod-swooper-maps/src/maps/_runtime` is empty
- No new runtime “meaning-level defaults” are introduced in step/op runtime paths (no “resolve during run”).

## Testing / Verification
- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm deploy:mods`

## Dependencies / Notes
- Assumes the U09 baseline exists: settings/trace plumbing and retirement of `context.config` and `foundation.diagnostics`.
- This issue implements the *documented* wiring from:
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md` (DD‑002)
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md` (op-entry validation + typed arrays)
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md` (strict kinds; ops are contracts)
  - `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md` (target spec projection)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### A) Implement `step.resolveConfig` and compile-time execution in `compileExecutionPlan`
**In scope**
- Extend the step type surface to optionally include:
  - `resolveConfig?: (config, settings) => config` (pure; settings-only; compile-time only).
- In `compileExecutionPlan(...)`:
  1) schema default + clean the authored step config (current behavior: `Value.Default` + `Value.Clean`),
  2) call `step.resolveConfig?.(cleaned, settings)`,
  3) reject unknown keys + validate the resolver output,
  4) schema default + clean the resolver output,
  5) store the resolved config in `ExecutionPlan.nodes[].config`.
- Ensure compile errors include pathful errors originating from resolver output.
  - Implementation target: `packages/mapgen-core/src/engine/execution-plan.ts`.
  - Step surface target: `packages/mapgen-core/src/engine/types.ts` (`MapGenStep`).

**Out of scope**
- Introducing plan-stored internal/derived fields (no dual author vs resolved config storage).
- Letting resolvers depend on adapters/buffers/artifacts/RNG (must remain pure).

**Rationale / context**
- DD‑002 requires “plan truth” for any normalization that can be decided from authored config + run settings.
- Composite steps need a single composition point where multiple op resolvers can be invoked deterministically.

**Acceptance Criteria**
- Compiler executes `resolveConfig` when present; runtime steps do not branch.
- Resolver output that violates schema/unknown-keys fails plan compilation with actionable errors.
- A step that defines `resolveConfig` must also define `configSchema`; otherwise plan compilation fails (no untyped resolver execution).
- `resolveConfig` must return a non-null POJO; `null` or non-object outputs fail plan compilation.
- Resolver-related failures are reported as `ExecutionPlanCompileErrorItem` with:
  - `code: "step.config.invalid"` (no new error code in this unit),
  - a `/recipe/steps/<index>/config...` path (same prefix as standard step-config validation),
  - `stepId` populated.

**Verification / tests**
- Extend `packages/mapgen-core/test/pipeline/execution-plan.test.ts`:
  - add one test asserting resolver output is stored in `nodes[].config`,
  - add one test asserting resolver output is re-validated for schema errors + unknown keys.

### B) Add `op.resolveConfig` authoring hook and document composition via steps
**In scope**
- Extend `createOp(...)` (authoring SDK) to accept optional:
  - `resolveConfig?: (config, settings) => config` (compile-time only).
- Ensure the op surface communicates “compile-time only” clearly (JSDoc; types).
- Implement a minimal exemplar and wire it through a composite step’s `step.resolveConfig` in tests.
  - Implementation target: `packages/mapgen-core/src/authoring/op.ts`.

**Out of scope**
- Making the engine/compiler call op resolvers directly (fractal remains only at step boundaries).

**Rationale / context**
- Domains own scaling/meaning semantics; steps compose multiple domain contracts; the compiler executes resolution.

**Acceptance Criteria**
- Op resolvers exist as first-class authoring options, but are only invoked via step resolvers.
- Resolver output stays schema-valid (no internal-only fields persisted in plan).

**Verification / tests**
- Extend the test from (A) to include composition: step resolver calls an op resolver.

### C) Audit and migrate “meaning-level” defaults into schema defaults or resolvers
**In scope**
- Inventory occurrences of:
  - `Value.Default(...)` usage inside runtime step/op code,
  - ad-hoc “fill missing config” patterns inside runtime step/op code (e.g., `?? {}`, `|| {}`, spreads/merges over config objects).
- For each, decide one of:
  - schema default (pure local),
  - `resolveConfig` (settings-aware meaning resolution),
  - runtime param derivation (allowed; must not mutate config).
- Implement the migrations for:
  - `mods/mod-swooper-maps/src/recipes/standard/**`
  - `mods/mod-swooper-maps/src/domain/**`

**Out of scope**
- Algorithmic changes unrelated to config meaning (no behavior changes beyond moving equivalent defaults).

**Rationale / context**
- Runtime “fixups” are invisible to plan-truth and hard to reproduce; this work makes normalization explicit and testable.

**Acceptance Criteria**
- No config meaning-level defaults remain in runtime call paths for the in-scope steps/ops.
- Guardrails (documented as zero-hit checks) are added to prevent regression:
  - `rg -n "\\bValue\\.Default\\(" mods/mod-swooper-maps/src/domain mods/mod-swooper-maps/src/recipes/standard` is empty
  - `rg -n "StandardRecipeOverrides|buildStandardRecipeConfig|DeepPartial<" mods/mod-swooper-maps/src` is empty

**Verification / tests**
- Existing pipeline tests + the new plan compile tests added in (A) must pass; configs still behave as before (modulo intended deterministic normalization).

### D) Delete `StandardRecipeOverrides` translation and move maps to direct `StandardRecipeConfig`
**In scope**
- Remove:
  - `DeepPartial<T>` override typing,
  - `StandardRecipeOverrides`,
  - `buildStandardRecipeConfig(...)` translation.
- Update the standard map runtime glue and maps to remove the overrides-shaped authoring surface entirely:
  - `runStandardRecipe(...)` accepts `settings` and `config` directly (no `overrides` parameter),
  - maps supply `settings` and `config` directly (no translation layer),
  - maps do not depend on any map-runtime “settings builder” helper (duplication is acceptable here; `LOCAL-TBD-M7-U12` introduces an authoring factory that can dedupe later).
- Keep settings explicit at the boundary:
  - delete `buildStandardRunSettings(...)` (it is part of the overrides translation layer).
  - no replacement “settings builder” helper is introduced in this unit.

**Out of scope**
- Re-introducing a config loader or JSON ingestion surface as part of this cleanup.
- Any map metadata/XML automation (if needed, track separately).

**Rationale / context**
- The override translator is the remaining major legacy surface that creates “missing config / irrelevant keys” ambiguity and forces casts.

**Acceptance Criteria**
- No `StandardRecipeOverrides` usage remains in `mods/mod-swooper-maps/src/maps/**`.
- Runtime maps supply `recipe.run(context, settings, config)` where `config` is a `StandardRecipeConfig | null` instance.
- The standard runner glue does not construct/translate config at runtime.
- No entrypoint accepts an overrides-shaped input “for compatibility”.
- The standard runner has a single canonical signature post-U10:
  - `runStandardRecipe({ recipe, init, settings, config, options? })` (no other overloads).

**Verification / tests**
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm deploy:mods`
- Smoke run at least one map entrypoint (local harness or existing tests).

---

## Pre-work

### Pre-work for A (step resolver + compiler execution)

### Pre-work for B (op resolver authoring surface)

### Pre-work for C (derived defaults migration)
- “Identify any cases where defaults depend on run settings (dimensions/wrap/seed/directionality/trace) vs only local config.”

### Pre-work for D (delete overrides translator)
- “Inventory current authored config surfaces in `mods/mod-swooper-maps/src/maps/*.ts` (what they currently return) and map each top-level override fragment to the target `StandardRecipeConfig` keys.”
- “Rewrite each map to directly author a `StandardRecipeConfig | null` (use `satisfies StandardRecipeConfig` on the top-level config literal); do not introduce a new ‘config builder’ that recreates the overrides translation layer. (Ergonomics follow-up is tracked in `LOCAL-TBD-M7-U12`.)”
- “List all call sites/types that depend on `StandardRecipeOverrides` and plan a mechanical migration.”
- “List all runner entrypoints that currently accept overrides-shaped inputs and define the new canonical signature(s) that accept `settings` + `config` only.”
- “Identify and delete any remaining runtime config-defaulting in the map entrypoint path (e.g., `Value.Default` in `maps/_runtime/**`).”

---

## Pre-work Findings

### A1) Insertion point for `step.resolveConfig` in `compileExecutionPlan(...)`

**Primary entrypoint:** `packages/mapgen-core/src/engine/execution-plan.ts`

**Current compile flow (relevant checkpoints)**
- `parseRunRequest(...)` performs run-request normalization and validation:
  - collects unknown-key errors via `findUnknownKeyErrors(RunRequestSchema, input, "")`
  - applies schema defaults/cleaning via `Value.Default` + `Value.Clean` (`buildValue`)
  - formats `Value.Errors(...)` into `ExecutionPlanCompileErrorItem` with paths rooted at `""`
- `compileExecutionPlan(...)` iterates `recipe.steps` and, for each enabled step:
  - validates uniqueness and registry existence
  - builds per-node config via `buildNodeConfig(...)`
    - if the step has `configSchema`: `normalizeStepConfig(schema, rawConfig, configPath)`:
      - treats `undefined` as `{}` and validates `null` as an error case (no coercion)
      - unknown-key detection uses the same `findUnknownKeyErrors(schema, value, configPath)`
      - schema validation uses `Value.Errors(schema, converted)` with errors formatted at `configPath`
      - returns the **cleaned** value (`Value.Clean`) as the plan candidate
    - if the step has **no** `configSchema`: returns `recipeStep.config ?? {}` with **no** validation/defaulting/unknown-key detection
  - pushes a node with `config` as currently computed

**Exact insertion point (matches the prompt’s “after normalization, before node storage”)**
- In `compileExecutionPlan(...)`, after:
  - `const { config, errors: configErrors } = buildNodeConfig(...)` and
  - the `configErrors` early-return gate
- …and immediately before:
  - `nodes.push({ ..., config })`

This is the only point where we have:
- the concrete `registryStep` (future owner of `resolveConfig`)
- the fully normalized/cleaned step config (when `configSchema` exists)
- the step’s `configPath` for stable, user-facing error paths
- all compile-time-only inputs (`settings`) available without mixing runtime execution concerns

**Practical guidance for implementation (to avoid drift)**
- Prefer factoring this into a small helper (conceptual):
  - `applyStepResolver(registryStep, config, settings, configPath) -> { config, errors }`
  - which:
    1) calls `registryStep.resolveConfig?.(...)`
    2) re-validates the resolver output using the **same** `normalizeStepConfig(...)` pathing and unknown-key detection logic
    3) returns the final plan-stored config for `nodes.push(...)`
- If `configSchema` is undefined, there is no existing validation surface to “re-run”; the current system behavior is “accept unknown config”. That constraint should be made explicit in the implementation (either: require schema for resolver support, or accept unvalidated output for schema-less steps).

### A2) Compile error surface for resolver failures (`step.resolveConfig`)

**Current compile error contract (existing behavior)**
- Compiler throws `ExecutionPlanCompileError`, which carries `errors: ExecutionPlanCompileErrorItem[]`.
- `ExecutionPlanCompileErrorItem` is:
  - `code: "runRequest.invalid" | "step.unknown" | "step.config.invalid"`
  - `path: string` (JSON-pointer-like, rooted at `/`)
  - `message: string`
  - `stepId?: string` (populated by `compileExecutionPlan(...)` for step-local errors)
- Per-step config errors are reported with:
  - `code: "step.config.invalid"`
  - `path` rooted at the authored config location (e.g., `/recipe/steps/0/config/extra`)
  - messages coming from either:
    - `findUnknownKeyErrors(...)` (`"Unknown key"`), or
    - `Value.Errors(...)` (`typebox` validation messages)

**Canonical resolver error policy (non-optional; keep it mechanical)**
- Resolver output is treated as **untrusted** and is always validated before storing into `ExecutionPlan.nodes[].config`.
- Add **one** new compile error code to precisely represent resolver execution failures:
  - `code: "step.resolveConfig.failed"`
  - (requires extending `ExecutionPlanCompileErrorCode` in `packages/mapgen-core/src/engine/execution-plan.ts`)
- Paths for resolver failures should match the per-step config surface (stable UX and matches existing tests):
  - `path: /recipe/steps/<index>/config` (the same `configPath` used by `normalizeStepConfig`)
  - `stepId: <step.id>`

**Resolver failure cases and how they surface**
- If `step.resolveConfig(...)` throws:
  - emit one `ExecutionPlanCompileErrorItem` with:
    - `code: "step.resolveConfig.failed"`
    - `path: configPath`
    - `message: <error name/message, no stack>` (e.g., `resolveConfig threw: RangeError: ...`)
- If resolver returns `undefined` or `null`:
  - treat as a resolver failure (do **not** coerce to `{}`):
    - `code: "step.resolveConfig.failed"`
    - `path: configPath`
    - `message: resolveConfig returned null/undefined`
- If resolver returns an object that fails schema validation or includes unknown keys:
  - reuse the existing step-config error surface (do **not** introduce new codes here):
    - `code: "step.config.invalid"`
    - `path: configPath + <subpath>` (unknown keys and schema paths)
    - `message: "Unknown key"` or the typebox error message
  - Implementation note: validation should be done by reusing the existing `normalizeStepConfig(...)` machinery, *but* the resolver-return path must guard against the current `undefined -> {}` coercion (so resolver-return `undefined` stays an error, not a silently-defaulted config).

**Schema-less steps**
- If `registryStep.configSchema` is absent, the compiler currently cannot do unknown-key detection or schema validation.
- Canonical (strong) constraint for U10 to preserve “plan-truth config” and strictness:
  - `step.resolveConfig` must be treated as invalid without `configSchema`.
  - Surface as `code: "step.resolveConfig.failed"`, `path: configPath`, `message: resolveConfig requires configSchema`.

**Test touchpoints (to keep future changes predictable)**
- Existing compile-error expectations live in `packages/mapgen-core/test/pipeline/execution-plan.test.ts` and assert `code` and `path` strings.
- Resolver failure coverage should add:
  - a “resolver throws” test asserting `step.resolveConfig.failed` at `/recipe/steps/0/config`
  - a “resolver returns invalid config” test asserting `step.config.invalid` with the nested path(s)

### B1) Minimal `op.resolveConfig` authoring surface (type-safe; runtime signature unchanged)

**Primary entrypoint:** `packages/mapgen-core/src/authoring/op.ts`

**Current authoring surface (what exists today)**
- `createOp(...)` returns a `DomainOp<...>` object with:
  - `kind`, `id`, `input`, `output`
  - `config` schema and `defaultConfig` value (computed via `Value.Default` + `Value.Convert` + `Value.Clean`)
  - runtime executor: `run(input, config) -> output`
  - validation surface added by `attachValidationSurface(...)`: `validate(...)` and `runValidated(...)`
- The op config “shape modes”:
  - **no strategies:** `config` is `ConfigSchema` and `run(input, Static<ConfigSchema>)`
  - **strategies:** `config` is a union schema of `{ strategy, config }` selections, and `run(...)` dispatches to `strategies[selectedId].run(input, cfg.config ?? {})`
- `attachValidationSurface(...)` (via `packages/mapgen-core/src/authoring/validation.ts`) validates `(input, config)` but does **not** apply schema defaults/cleaning; many ops currently apply `Value.Default(...)` inside `run(...)` to compensate.

**Minimal, spec-aligned addition (no runtime signature change)**
- Add a compile-time-only hook on the op object:
  - `resolveConfig?: (config, settings) => config`
  - It must be *pure* and must return a value that still validates against the op’s existing config schema (no plan-stored internal fields).
- Type-level shape that matches the existing `DomainOp` generics:
  - Define a single generic helper (conceptual):
    - `export type OpResolveConfig<TConfig> = (config: TConfig, settings: RunSettings) => TConfig;`
    - `RunSettings` is already an authoring-level concept (imported elsewhere under `packages/mapgen-core/src/authoring/**`), so `op.ts` can `import type { RunSettings } from "@mapgen/engine/index.js";` without introducing runtime coupling.
  - Extend `DomainOp<...>` to include:
    - `resolveConfig?: OpResolveConfig<Static<ConfigSchema>>` for non-strategy ops
    - `resolveConfig?: OpResolveConfig<StrategySelection<Strategies, DefaultStrategy>>` for strategy ops

**Implementation notes (mechanical, low-risk)**
- For non-strategy ops, `createOp` already returns `{ ...(rest as any), defaultConfig }`; if `resolveConfig` is included in `op` input, it is already preserved by that spread. The required change is primarily types (overload + `DomainOp`).
- For strategy ops, `createOp` constructs `domainOp` explicitly; `resolveConfig` would need to be explicitly forwarded (e.g., `resolveConfig: op.resolveConfig`) to avoid silently dropping it.
- No runtime behavior change is required (the compiler never calls op resolvers directly; step resolvers do).

**Compatibility note (important for C and for resolver expectations)**
- Today, many ops perform runtime defaulting via `Value.Default(schema, cfg)` inside `run(...)` even when step schemas already specify defaults.
- After U10, the intended posture is: step schemas + compiler normalization + `step.resolveConfig` own config shaping; op runtime should treat config as already canonical.

### B2) Step-side resolver composition pattern (step delegates to op resolvers)

**Why this prework matters**
- U10’s “compiler executes resolution” rule is explicitly **step-scoped**:
  - compiler calls `step.resolveConfig(stepConfig, settings)`
  - step resolver may compose multiple op resolvers (`op.resolveConfig(opConfig, settings)`) and recompose a final step config
- This preserves the boundary: the compiler never needs to understand op structure or call op hooks directly.

**Current state (what must change to enable composition)**
- Engine step type (`packages/mapgen-core/src/engine/types.ts`) currently defines `MapGenStep` with:
  - `configSchema?: TSchema` and `run(context, config)`
  - **no** `resolveConfig` hook
- Authoring step type (`packages/mapgen-core/src/authoring/types.ts`) defines `Step` with:
  - `schema: TSchema` (required via `createStep` assertion in `packages/mapgen-core/src/authoring/step.ts`)
  - **no** `resolveConfig` hook
- Authoring recipe assembly (`packages/mapgen-core/src/authoring/recipe.ts`) maps authored steps into engine steps in `finalizeOccurrences(...)`:
  - sets `configSchema: authored.schema`
  - sets `run: authored.run`
  - would need to forward `resolveConfig` once it exists on the authored step type

**Concrete composition example in current code (shows the problem clearly)**
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`:
  - Step schema already defaults `classify` to `ecology.ops.classifyBiomes.defaultConfig`.
  - Runtime step still re-defaults/cleans op config via:
    - `Value.Default(ecology.ops.classifyBiomes.config, config.classify ?? ecology.ops.classifyBiomes.defaultConfig)`
  - This is exactly the “runtime meaning-level defaults” posture U10 is deleting.

**Canonical composition pattern (what to implement later, but the rule is important now)**
- Step owns a resolver:
  - `resolveConfig: (cfg, settings) => cfg'`
- Inside the step resolver, delegate only through op objects:
  - Example shape for the biomes step:
    - `cfg.classify = ecology.ops.classifyBiomes.resolveConfig ? ecology.ops.classifyBiomes.resolveConfig(cfg.classify, settings) : cfg.classify`
    - `cfg.bindings` stays as-is (bindings are adapter-owned IDs; not settings-derived)
- For a multi-op step, the resolver is fan-out → delegate → recompose:
  - `cfg = { ...cfg, opA: resolveA(cfg.opA), opB: resolveB(cfg.opB) }`
- Runtime rule for steps after this change:
  - runtime `run(...)` must treat `config` as already resolved and must not call `Value.Default` / `?? defaultConfig` on meaning-level config again.

**Key invariants to preserve**
- The compiler remains op-agnostic: only sees `step.resolveConfig`.
- Op resolvers remain compile-time-only helpers and are never called from engine/compiler directly.
- Step schemas remain the single plan-stored config schema; resolver output must remain schema-valid (enforced by compiler re-validation per A2).

### C1) Inventory of “meaning-level defaults” in `mods/mod-swooper-maps` (classified)

**Scan scope**
- Included:
  - `mods/mod-swooper-maps/src/domain/**`
  - `mods/mod-swooper-maps/src/recipes/**`
- Searched for the explicit “meaning-level default” patterns called out in the prompt:
  - `Value.Default(...)`
  - `?? {}`
  - `|| {}`
- Note: many files also contain non-`{}` numeric fallbacks (e.g. `cfg.foo ?? 5`, `Number.isFinite(x) ? x : 12`). Those follow the same classification rules below, but this prework section focuses on the explicitly requested patterns.

**Classification rubric (used below)**
- **Schema default**: the value should always be present post-compile because it is represented as a schema default (step schema or op config schema) and the plan compiler already applies `Value.Default + Value.Clean`.
- **Resolver**: the “default” is actually semantic normalization beyond schema defaults (composition, derived defaults, or non-trivial normalization that must happen at compile-time to satisfy “plan truth”).
- **Runtime params**: runtime-derived computation that is allowed to depend on runtime data (adapter, artifacts, etc.) and does not mutate/merge config; it should remain in runtime code (but stop using `config ?? {}` once the schema guarantees presence).

#### C1.a) `Value.Default(...)` usage (meaning-level defaults happening at runtime today)

**1) Domain hydrology baseline**
- `mods/mod-swooper-maps/src/domain/hydrology/climate/baseline.ts` (`applyClimateBaseline`):
  - `Value.Default(ClimateConfigSchema, config)` plus repeated `Value.Default(...)` into nested `baseline/bands/edges/...`.
  - **Classification:** schema default.
  - **Why:** the calling step schema already models `climate.baseline` with schema defaults, and U10’s compiler will hand runtime a plan-stored `node.config` that is already defaulted/cleaned. The domain function should treat config as canonical and stop defaulting/branching.

**2) Domain ecology ops**
- `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`:
  - `Value.Default(BiomeClassificationConfigSchema, cfg)` and defaulting `vegetation.biomeModifiers`.
  - **Classification:** schema default.
  - **Why:** the biomes step’s schema references `classifyBiomes.config` and defaults to `classifyBiomes.defaultConfig`; post-U10, the plan compiler is the defaulting/cleaning phase.
- `mods/mod-swooper-maps/src/domain/ecology/ops/features-embellishments/index.ts`:
  - `Value.Default(FeaturesEmbellishmentsConfigSchema, config)` and then nested `Value.Default` for `FeaturesConfigSchema` / `FeaturesDensityConfigSchema`.
  - **Classification:** schema default.
  - **Why:** steps already author `story` and `featuresDensity` with schema defaults; the op should stop re-defaulting at runtime.
- `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/index.ts`:
  - `Value.Default(FeaturesPlacementConfigSchema, config)` and `resolvedConfig.config ?? {}`.
  - **Classification:** schema default (plus a schema-shape bug).
  - **Why:** op config should be fully schema-defaulted pre-run; the `config ?? {}` indicates the schema currently permits `config` to be missing and the implementation compensates at runtime.

**3) Step-level runtime defaulting**
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`:
  - `Value.Default(ecology.ops.classifyBiomes.config, config.classify ?? ecology.ops.classifyBiomes.defaultConfig)`
  - **Classification:** schema default.
  - **Why:** the step schema already defaults `classify` to `defaultConfig`. Runtime re-defaulting is redundant and violates “no meaning-level defaults at runtime”.

#### C1.b) “Resolver-like” config resolution helpers in schema modules (runtime today; should be compile-time)

These are the highest-risk defaulting sites because they are already doing non-trivial normalization and are called from runtime ops/steps.

**1) Plot effects**
- `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/schema.ts`:
  - `resolvePlotEffectsConfig(input?: PlotEffectsConfig): ResolvedPlotEffectsConfig`
  - Uses `Value.Default(...)` and manual spreads to force nested selector objects into a fully-populated structure.
  - Call sites:
    - `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/index.ts` (`plotEffects.run` calls `resolvePlotEffectsConfig(config)`).
    - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/index.ts` (verbose logging).
  - **Classification:** resolver.
  - **Why:** this is effectively compile-time normalization (turning partially-present optional objects into a canonical shape). Under U10 it should move behind `resolveConfig` so runtime code doesn’t need “config fixing”.

**2) Owned feature placement**
- `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/schema.ts`:
  - `resolveFeaturesPlacementOwnedConfig(input?: FeaturesPlacementOwnedConfig): ResolvedFeaturesPlacementOwnedConfig`
  - Uses `Value.Default(...)`, explicit unknown-key checks, and value normalization (clamp, rounding, non-empty array fallbacks).
  - Call sites:
    - `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/strategies/owned.ts` (`planOwnedFeaturePlacements` calls `resolveFeaturesPlacementOwnedConfig(config)`).
    - `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/index.ts` passes `resolvedConfig.config ?? {}` into `planOwnedFeaturePlacements`.
  - **Classification:** resolver.
  - **Why:** this function is performing “DD‑002 style” normalization beyond schema defaults. Under U10, this belongs in `resolveConfig` (op-level or step-level) so the plan stores already-canonical config and runtime stays branch-free.

#### C1.c) `?? {}` occurrences (quick classification)

**Schema default (remove once compiler owns defaults)**
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyHotspots.ts`:
  - `config.story?.hotspot ?? {}` (step schema already defaults `story.hotspot`).
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`:
  - `config.landmass ?? {}`, `config.oceanSeparation ?? {}` (step schema defaults both).
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`:
  - `config.volcanoes ?? {}` (step schema defaults).
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts`:
  - `config.mountains ?? {}` (step schema defaults).
- `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`:
  - `resolvedConfig.vegetation.biomeModifiers ?? {}` (should be defaulted by schema/compile-time normalization).
- `mods/mod-swooper-maps/src/domain/ecology/ops/features-embellishments/index.ts`:
  - `resolvedConfig.story?.features ?? {}`, `resolvedConfig.featuresDensity ?? {}` (schema/compile-time normalization).
- `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/index.ts`:
  - `resolvedConfig.config ?? {}` (schema should default `config` to `{}`; runtime fallback should be removed).
- `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/schema.ts` and `mods/mod-swooper-maps/src/domain/ecology/ops/features-placement/schema.ts`:
  - `input?.<field> ?? {}` patterns inside resolver-like helpers (should move to compile-time via resolver; once config is canonical, these are unnecessary).

**Runtime params (not config-defaulting; keep as runtime, but stop pretending “maybe missing” if schema guarantees it)**
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derivePlacementInputs.ts`:
  - `config.placement ?? {}` (schema defaults it); merging `starts` is runtime param derivation (uses `getBaseStarts(context)`).
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement.ts`:
  - `derivedInputs.placementConfig ?? {}` (artifact should already carry an object; keep runtime behavior but remove defensive fallback once artifact shape is guaranteed).
- `mods/mod-swooper-maps/src/recipes/standard/runtime.ts`:
  - `adapter.lookupMapInfo(...) ?? {}` (engine boundary; unrelated to recipe config).

#### C1.d) `|| {}` occurrences (quick classification)

Most of these are legacy “defensive config shells” caused by optional/untyped config entrypoints. Under U10, they should disappear once the canonical config surface is: map authors provide explicit `settings` + typed recipe config, the compiler defaults/cleans, and runtime receives plan-truth configs.

**Schema default (remove defensive `|| {}` once typed configs are guaranteed)**
- Foundation stage config fan-out: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts`:
  - `config.plates || {}`, `config.dynamics?.mantle || {}`, `config.dynamics?.wind || {}`, etc. (the step schema already uses `FoundationConfigSchema`).
- Domain morphology/coastlines: `mods/mod-swooper-maps/src/domain/morphology/coastlines/rugged-coasts.ts` and `.../corridor-policy.ts`
- Domain morphology/landmass: `mods/mod-swooper-maps/src/domain/morphology/landmass/index.ts` and `.../ocean-separation/apply.ts`
- Domain morphology/islands: `mods/mod-swooper-maps/src/domain/morphology/islands/placement.ts`
- Domain hydrology/climate swatches: `mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/index.ts` (e.g., `cfg.types || {}`, `cfg.sizeScaling || {}`)

**Resolver (semantic normalization currently happening via `|| {}` + hard-coded fallbacks)**
- Legacy hydrology refinement knobs: `mods/mod-swooper-maps/src/domain/hydrology/climate/refine/*.ts`
  - use raw `Record<string, unknown>` configs with pervasive `|| {}` and numeric fallbacks (`?? 5`, etc).
  - these should be replaced by a typed schema surface + compile-time normalization (resolver) so runtime doesn’t branch on missing keys.
- Plate seed semantics: `mods/mod-swooper-maps/src/domain/foundation/plate-seed.ts`
  - `normalizeSeedConfig(config || {})` turns invalid “fixed” inputs into “engine” mode.
  - this is semantic policy; under U10 strictness it should be made explicit either as schema validation (reject invalid) or a documented resolver rule (normalize).

**Runtime params**
- Placement orchestration: `mods/mod-swooper-maps/src/domain/placement/index.ts`
  - mixes `options.*` with `options.placementConfig.*` and local defaults.
  - this is boundary-level param selection; once maps author a single canonical config object, this merging should be removed from runtime and moved to compile-time/boundary assembly.
