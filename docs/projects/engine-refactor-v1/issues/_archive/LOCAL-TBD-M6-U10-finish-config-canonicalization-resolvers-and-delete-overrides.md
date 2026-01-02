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
blocked_by: [LOCAL-TBD-M6-U09, LOCAL-TBD-M6-U06]
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
- **Plan truth:** `compileExecutionPlan(...)` produces a fully schema-defaulted, cleaned, and **resolution-applied** `ExecutionPlan.nodes[].config`.
- **Fractal only at step boundaries:** the compiler calls `step.resolveConfig(stepConfig, settings)`; composite steps use that hook to delegate to op-local `op.resolveConfig(opConfig, settings)` and recompose.
- **Runtime steps do not branch:** steps treat `node.config` as “the config” and do not do meaning-level defaults/merges at runtime.
- **No legacy config translation:** remove `StandardRecipeOverrides` (DeepPartial global-ish override blob) and the translator that builds `StandardRecipeConfig` from it.

## Deliverables
- Engine/runtime:
  - `compileExecutionPlan(...)` executes an optional `step.resolveConfig(...)` hook (pure; settings-only) and stores the result in `ExecutionPlan.nodes[].config`.
  - Compile errors are surfaced as pathful `ExecutionPlanCompileError` items (unknown keys + schema errors), including errors from resolver output.
- Authoring SDK:
  - `createOp(...)` supports an optional **compile-time** `resolveConfig(config, settings) -> config` hook (domain owns; compiler executes via step boundary).
  - Resolver output must remain valid under the existing schema (no plan-stored internal-only fields).
- Mod authoring (standard maps):
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` no longer exports `StandardRecipeOverrides` or `buildStandardRecipeConfig(...)`.
  - Standard map entrypoints no longer build a DeepPartial “global overrides” blob; they provide a direct `StandardRecipeConfig` (or a typed helper that produces one without reintroducing a global override layer).
  - Run settings remain explicitly authored at the boundary (seed/dimensions/wrap/trace/directionality), not smuggled through config.
- Migration/cleanup:
  - Derived defaults that currently live as “meaning-level fixups” inside runtime code are moved into:
    - schema defaults (pure local defaults), or
    - `resolveConfig` (settings-aware compile-time normalization), or
    - explicit runtime param derivation (allowed, but must not mutate/merge config).

## Acceptance Criteria
- `packages/mapgen-core/src/engine/execution-plan.ts` calls `step.resolveConfig(config, settings)` (when defined) and validates the returned config against `step.configSchema` before writing to the plan.
- At least one composite step demonstrates the canonical fan-out → delegate → recompose pattern using op-local resolvers (and compiles into plan-truth config).
- `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` no longer:
  - defines `DeepPartial<T>`,
  - exports `StandardRecipeOverrides`,
  - or exports `buildStandardRecipeConfig(...)`.
- `mods/mod-swooper-maps/src/maps/**` no longer constructs “global-ish overrides” objects as the author surface (no `StandardRecipeOverrides` usage).
- No new runtime “meaning-level defaults” are introduced in step/op runtime paths (no “resolve during run”).

## Testing / Verification
- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm deploy:mods`

## Dependencies / Notes
- Depends on U09 baseline: settings/trace plumbing and retirement of `context.config` and `foundation.diagnostics` (already in flight/landing).
- This issue implements the *documented* wiring from:
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md` (DD‑002)
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md` (op-entry validation + typed arrays)
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md` (strict kinds; ops are contracts)
  - `docs/projects/engine-refactor-v1/resources/spec/SPEC-pending-step-domain-operation-modules.md` (target spec projection)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### A) Implement `step.resolveConfig` and compile-time execution in `compileExecutionPlan`
**In scope**
- Extend the step type surface to optionally include:
  - `resolveConfig?: (config, settings) => config` (pure; settings-only; compile-time only).
- In `compileExecutionPlan(...)`:
  1) schema `Default/Convert/Clean` the authored step config (current behavior),
  2) call `step.resolveConfig?.(cleaned, settings)`,
  3) re-validate/clean and reject unknown keys on the resolver output,
  4) store the resolved config in `ExecutionPlan.nodes[].config`.
- Ensure compile errors include pathful errors originating from resolver output.

**Out of scope**
- Introducing plan-stored internal/derived fields (no dual author vs resolved config storage).
- Letting resolvers depend on adapters/buffers/artifacts/RNG (must remain pure).

**Rationale / context**
- DD‑002 requires “plan truth” for any normalization that can be decided from authored config + run settings.
- Composite steps need a single composition point where multiple op resolvers can be invoked deterministically.

**Acceptance Criteria**
- Compiler executes `resolveConfig` when present; runtime steps do not branch.
- Resolver output that violates schema/unknown-keys fails plan compilation with actionable errors.

**Verification / tests**
- Add/extend a unit test that compiles a plan with a step resolver and asserts `ExecutionPlan.nodes[].config` is resolved.

### B) Add `op.resolveConfig` authoring hook and document composition via steps
**In scope**
- Extend `createOp(...)` (authoring SDK) to accept optional:
  - `resolveConfig?: (config, settings) => config` (compile-time only).
- Ensure the op surface communicates “compile-time only” clearly (JSDoc; types).
- Implement at least one real op resolver (or a minimal exemplar) and wire it through a composite step’s `step.resolveConfig`.

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
  - `Value.Default(...)` / `?? {}` shells / ad hoc “fill missing config” inside runtime step/op code.
- For each, decide one of:
  - schema default (pure local),
  - `resolveConfig` (settings-aware meaning resolution),
  - runtime param derivation (allowed; must not mutate config).
- Implement the migrations for the MapGen areas in scope (standard recipe + domains it uses).

**Out of scope**
- Algorithmic changes unrelated to config meaning (no behavior changes beyond moving equivalent defaults).

**Rationale / context**
- Runtime “fixups” are invisible to plan-truth and hard to reproduce; this work makes normalization explicit and testable.

**Acceptance Criteria**
- No config meaning-level defaults remain in runtime call paths for the targeted steps/ops.
- A grep-based guardrail is added or documented (e.g., avoid `Value.Default` in op runtime for config).

**Verification / tests**
- Existing pipeline tests + any new plan compile tests should pass; configs still behave as before (modulo intended deterministic normalization).

### D) Delete `StandardRecipeOverrides` translation and move maps to direct `StandardRecipeConfig`
**In scope**
- Remove:
  - `DeepPartial<T>` override typing,
  - `StandardRecipeOverrides`,
  - `buildStandardRecipeConfig(...)` translation.
- Update standard maps to directly provide `StandardRecipeConfig` (or a typed helper that produces it without reintroducing a global override blob).
- Keep settings explicit at the boundary:
  - `buildStandardRunSettings(...)` may remain, but must not depend on a global config blob shape.

**Out of scope**
- Re-introducing a config loader or JSON ingestion surface as part of this cleanup.
- Any map metadata/XML automation (if needed, track separately).

**Rationale / context**
- The override translator is the remaining major legacy surface that creates “missing config / irrelevant keys” ambiguity and forces casts.

**Acceptance Criteria**
- No `StandardRecipeOverrides` usage remains in `mods/mod-swooper-maps/src/maps/**`.
- Runtime maps supply `recipe.run(context, settings, config)` where `config` is a `StandardRecipeConfig | null` instance.

**Verification / tests**
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm deploy:mods`
- Smoke run at least one map entrypoint (local harness or existing tests).

### E) (Optional but recommended) Introduce a `createMap()` / `defineMap()` helper to package settings + config + metadata
**In scope**
- Provide a single-file authoring pattern where each map entry exports a map definition containing:
  - id/name/metadata,
  - `settings` (or `buildSettings(init)`),
  - `config` (direct recipe config),
  - and a `run()` that uses the standard recipe runtime glue.
- Ensure this helper does not reintroduce a legacy “global overrides blob”.

**Out of scope**
- Generating Civ7 XML/modinfo automatically (track separately unless it becomes a trivial follow-up).

**Rationale / context**
- Improves author DX: a single place to set `settings.trace`, directionality, map seed policy, and recipe config without scattering boundary knowledge.

**Acceptance Criteria**
- At least one standard map entrypoint uses the helper and remains small/declarative.

**Verification / tests**
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm deploy:mods`

---

## Pre-work

### Pre-work for A (step resolver + compiler execution)
- “List all `MapGenStep` definitions that should gain `resolveConfig` (or remain without it). Identify at least one composite step suitable for the canonical example.”
- “Inspect `packages/mapgen-core/src/engine/execution-plan.ts` and propose the exact insertion point for resolver execution + re-validation + unknown-key detection.”
- “Design the compile error surface for resolver failures (paths, codes), consistent with existing `ExecutionPlanCompileError` items.”

### Pre-work for B (op resolver authoring surface)
- “Inspect `packages/mapgen-core/src/authoring/op.ts` and propose a minimal type-safe `resolveConfig` addition that does not affect runtime `run(...)` signature.”
- “Identify 2–3 real places in the standard pipeline where settings-aware resolution would live naturally as op resolvers (e.g., scaling knobs by map dimensions).”

### Pre-work for C (derived defaults migration)
- “Search for all ‘meaning-level defaults’ in `mods/mod-swooper-maps/src/recipes/**` and `mods/mod-swooper-maps/src/domain/**` (e.g., `Value.Default`, `?? {}`, `|| {}` on config). Classify each as schema default vs resolver vs runtime params.”
- “Identify any cases where defaults depend on run settings (dimensions/wrap/seed/directionality/trace) vs only local config.”

### Pre-work for D (delete overrides translator)
- “Inventory current authored config surfaces in `mods/mod-swooper-maps/src/maps/*.ts` (what they currently return) and map each top-level override fragment to the target `StandardRecipeConfig` keys.”
- “Propose an author-friendly, type-safe replacement for `buildStandardRecipeConfig` that does not reintroduce a global overrides blob (direct config authoring or a typed helper).”
- “List all call sites/types that depend on `StandardRecipeOverrides` and plan a mechanical migration.”

### Pre-work for E (`createMap()` helper)
- “Sketch the minimal `createMap()` API (types + file location) that packages map metadata + settings + config and calls `runStandardRecipe`, without introducing new implicit defaults.”
- “Confirm which metadata fields are needed later for Civ7 XML/modinfo generation so the helper doesn’t paint us into a corner.”
