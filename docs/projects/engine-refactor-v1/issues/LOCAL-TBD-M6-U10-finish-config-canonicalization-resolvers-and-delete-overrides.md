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
- Existing pipeline tests + any new plan compile tests should pass; configs still behave as before (modulo intended deterministic normalization).

### D) Delete `StandardRecipeOverrides` translation and move maps to direct `StandardRecipeConfig`
**In scope**
- Remove:
  - `DeepPartial<T>` override typing,
  - `StandardRecipeOverrides`,
  - `buildStandardRecipeConfig(...)` translation.
- Update the standard map runtime glue and maps to remove the overrides-shaped authoring surface entirely:
  - `runStandardRecipe(...)` accepts `settings` and `config` directly (no `overrides` parameter),
  - maps supply `settings` and `config` directly (no translation layer).
- Keep settings explicit at the boundary:
  - delete `buildStandardRunSettings(...)` (it is part of the overrides translation layer).
  - if any helper remains, it must not accept “overrides” or any global config blob; it can only derive missing run-envelope fields from `MapInitResolution` + explicit authored inputs.

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

**Verification / tests**
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm deploy:mods`
- Smoke run at least one map entrypoint (local harness or existing tests).

---

## Pre-work

### Pre-work for A (step resolver + compiler execution)
- “Inspect `packages/mapgen-core/src/engine/execution-plan.ts` and pick the exact insertion point for resolver execution + re-validation + unknown-key detection (after initial config normalization, before node storage).”
- “Design the compile error surface for resolver failures (paths, codes), consistent with existing `ExecutionPlanCompileError` items.”

### Pre-work for B (op resolver authoring surface)
- “Inspect `packages/mapgen-core/src/authoring/op.ts` and propose a minimal type-safe `resolveConfig` addition that does not affect runtime `run(...)` signature.”
- “Decide how step resolvers should call op resolvers in practice (direct property access on the op object; no engine/compiler calling op resolvers directly).”

### Pre-work for C (derived defaults migration)
- “Search for all ‘meaning-level defaults’ in `mods/mod-swooper-maps/src/recipes/**` and `mods/mod-swooper-maps/src/domain/**` (e.g., `Value.Default`, `?? {}`, `|| {}` on config). Classify each as schema default vs resolver vs runtime params.”
- “Identify any cases where defaults depend on run settings (dimensions/wrap/seed/directionality/trace) vs only local config.”

### Pre-work for D (delete overrides translator)
- “Inventory current authored config surfaces in `mods/mod-swooper-maps/src/maps/*.ts` (what they currently return) and map each top-level override fragment to the target `StandardRecipeConfig` keys.”
- “Rewrite each map to directly author a `StandardRecipeConfig | null` (using `satisfies StandardRecipeConfig` where helpful); do not introduce a new ‘config builder’ that recreates the overrides translation layer. (Ergonomics follow-up is tracked in `LOCAL-TBD-M7-U10`.)”
- “List all call sites/types that depend on `StandardRecipeOverrides` and plan a mechanical migration.”
- “List all runner entrypoints that currently accept overrides-shaped inputs and define the new canonical signature(s) that accept `settings` + `config` only.”
- “Identify and delete any remaining runtime config-defaulting in the map entrypoint path (e.g., `Value.Default` in `maps/_runtime/**`).”
