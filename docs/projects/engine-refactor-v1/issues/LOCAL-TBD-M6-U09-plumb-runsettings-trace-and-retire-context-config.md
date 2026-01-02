---
id: LOCAL-TBD-M6-U09
title: "[M6] Plumb RunRequest.settings (directionality + trace) to runtime; retire context.config as global knobs"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U06]
blocked: []
related_to:
  - M5-U09-DEF-016-schema-ownership-split-settings
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Finish the target run-boundary wiring so cross-cutting runtime knobs live in `RunRequest.settings` (not in `ExtendedMapContext.config`), and make tracing boundary-first via `settings.trace.steps` without scattering toggle checks throughout step/domain logic.

## Deliverables
- **Settings plumbing:** steps can read per-run settings via a typed `context.settings` surface (at least `directionality`, `trace`, `metadata`).
- **Directionality cutover:** migrate remaining consumers away from `context.config.*` to `context.settings.directionality`, aligned with ADR-ER1-019.
- **Boundary-first tracing:** `RunRequest.settings.trace` controls per-step trace level (`off/basic/verbose`) using `TraceSession` + per-step scopes, without step code checking flags directly.
- **Retire legacy “global knobs” pattern:** stop using `ExtendedMapContext.config` as a “global runtime MapGenConfig blob” in mod runtime entrypoints.
- **Diagnostics cleanup:** deprecate/remove `foundation.diagnostics` as the author-facing control plane for step logging; replace with settings-owned observability knobs (trace first; optional dev flags via settings if needed).

## Acceptance Criteria
- `mods/mod-swooper-maps/src/recipes/**` contains **0** reads of `context.config.foundation.dynamics.directionality` (or any `context.config.*` reads for cross-cutting policies).
- Standard runtime entrypoints no longer cast overrides into `context.config` as a “global config object”.
- A run with `settings.trace.steps = { "<stepId>": "verbose" }` emits trace events for that step via the trace sink; steps do not perform `if (settings.trace...)` checks.
- The only code that interprets `settings.trace.steps` lives at the runtime boundary (trace session creation + executor step-scoping), not inside domain/step logic.

## Testing / Verification
- `pnpm -F @swooper/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U06](./LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md)
- Directionality policy is already decided: ADR-ER1-019 (`RunRequest.settings`, not per-step config duplication).
- Run boundary is already decided: ADR-ER1-003 (`RunRequest = { recipe, settings }`, not monolithic `MapGenConfig`).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Trace configuration shape (locked by existing schema)
The target trace authoring surface is part of run settings:
- `RunRequest.settings.trace?: TraceConfig`
- `TraceConfig = { enabled?: boolean; steps?: Record<string, "off" | "basic" | "verbose"> }`

Source of truth (already present today):
- `TraceConfigSchema` + `RunSettingsSchema.trace`: `packages/mapgen-core/src/engine/execution-plan.ts`
- Trace model: `packages/mapgen-core/src/trace/index.ts`
- Plan-driven session helper: `createTraceSessionFromPlan(plan, sink)`: `packages/mapgen-core/src/engine/observability.ts`

### Trace wiring model (boundary-first, no scattered checks)
Goal: step/domain code should not read `settings.trace` directly.

Mechanics:
1) `compileExecutionPlan(runRequest, registry)` normalizes the run request and stores settings on the plan: `plan.settings`.
2) Runtime creates a `TraceSession` using the plan:
   - `createTraceSessionFromPlan(plan, sink)` uses `plan.settings.trace` to set per-step levels.
3) `PipelineExecutor.executePlan(context, plan, { trace })` runs with that session.
4) The executor sets `context.trace = trace.createStepScope({ stepId, phase })` around each step.
   - `TraceSession.resolveTraceLevel(config, stepId)` enforces `settings.trace.steps[stepId]`.
   - Off/basic/verbose is enforced by the trace session and scopes (events are no-op when disabled).

Step author rules:
- ✅ Allowed: emit trace events through `context.trace` (or helpers that emit to `context.trace`).
- ❌ Forbidden: `if (context.settings.trace...)` / `if (settings.trace.steps[...])` checks in step/domain logic.
- ❌ Forbidden: interpreting `settings.trace` inside ops/domains to change semantics.

### Directionality model (locked by ADR)
Directionality is a cross-cutting runtime policy and belongs in `RunRequest.settings.directionality`:
- Decision: `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-019-cross-cutting-directionality-policy-is-runrequest-settings-not-per-step-config-duplication.md`

In code, `RunSettingsSchema` already contains:
- `directionality?: Record<string, unknown>` (`packages/mapgen-core/src/engine/execution-plan.ts`)

Gap to close:
- Steps need a supported way to read settings (not by smuggling a global `MapGenConfig` blob into `context.config`).

### Diagnostics / DEV flags: what we are deprecating
Deprecate/remove the pattern:
- “Enable diagnostics via `context.config.foundation.diagnostics` and thread a global ‘dev logging’ config through `ExtendedMapContext.config`”.

Today’s stable-slice behavior (legacy):
- `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` reads `context.config.foundation?.diagnostics` and calls `initDevFlags(...)`.
- Steps and domain helpers use `DEV.*` gating (console logs, ascii dumps, summaries).

Target direction:
- Observability knobs are settings-owned (trace first).
- If DEV-style debug flags must remain temporarily, they should also be settings-owned (not config-owned) and applied at the entry boundary only.

### Implementation steps (A–E)

#### A) Plumb `RunRequest.settings` onto context (make settings visible to steps)
- Introduce a typed settings surface on the runtime context (e.g. `context.settings: RunSettings`).
- Set it once per execution from `plan.settings` (source of truth: `ExecutionPlan.settings`).
- Keep step config unchanged (still passed as the second argument to `step.run`).

Touchpoints (expected):
- `packages/mapgen-core/src/core/types.ts` (extend `ExtendedMapContext` contract)
- `packages/mapgen-core/src/engine/PipelineExecutor.ts` (assign settings at runtime start)
- Any tests that assert context shape

#### B) Wire tracing to `settings.trace.steps` via `TraceSession` at the boundary
- Ensure the default runtime path creates a `TraceSession` from the plan when trace is enabled.
- Avoid scattering: the only consumer of `settings.trace.steps` should be trace session creation + executor scoping.
- Provide a minimal default sink strategy (implementation choice):
  - Option 1: add a `traceSink?: TraceSink` option to recipe execution (or mod runtime wrapper) and create the session inside the runner.
  - Option 2: keep tracing opt-in by supplying an explicit `TraceSession` from the entrypoint (compile plan first, then create session, then execute).

Touchpoints (expected):
- `packages/mapgen-core/src/engine/observability.ts` (already has `createTraceSessionFromPlan`)
- `packages/mapgen-core/src/authoring/recipe.ts` (runner API) and/or mod runtime glue `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`
- Add a trivial sink implementation in mod runtime if needed (e.g. console sink) to validate end-to-end behavior

#### C) Directionality cutover: stop reading it from `context.config`
- Migrate any step consumers to `context.settings.directionality`.
  - Known current consumer: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
- Ensure standard runtime wiring sets `settings.directionality` once (already done in `buildStandardRunSettings`).

#### D) Retire the “global config blob” entrypoint pattern
- Stop casting overrides/config blobs into `ExtendedMapContext.config` as a substitute for settings.
- Replace reads that currently use `context.config` as a cross-cutting store with:
  - `context.settings` (for cross-cutting policies), and/or
  - explicit artifacts (for runtime-derived products), and/or
  - step config (for semantic knobs).

This is the primary prerequisite for cleanly removing `StandardRecipeOverrides` translation later, because the remaining reason it exists is “we needed somewhere to stick global knobs”.

#### E) Optional: config loader de-scope (do not commit without explicit confirmation)
- Assess whether `mods/mod-swooper-maps/src/config/loader.ts` is required for current workflows:
  - It is currently used by tests via `safeParseConfig` and exported by `@mapgen/config`.
- Options:
  - Keep it as tooling-only and ensure runtime entrypoints do not depend on it.
  - Remove it only if we are explicitly dropping JSON config ingestion + schema export workflows for the standard content package.

---

## Pre-work

### Pre-work for A (settings plumbing)
- “Find every place steps need run-global values (seed/dimensions/wrap/latitude/directionality/trace) and confirm whether each belongs in `settings`, per-step config, or artifacts.”
- “Locate all consumers of `context.config` in `mods/mod-swooper-maps/src/recipes/**` and classify each as legacy vs legitimate.”
- “Decide the minimal type surface for `context.settings` (full `RunSettings` vs a smaller subset) and list impacted TypeScript types/tests.”

#### A1 Findings: run-global values in steps (scope + placement)
- **Dimensions** (`context.dimensions`) are read across the standard recipe steps: `mods/mod-swooper-maps/src/recipes/standard/tags.ts`, `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts`, `mods/mod-swooper-maps/src/recipes/standard/runtime.ts`, and most step files under `mods/mod-swooper-maps/src/recipes/standard/stages/**` (morphology, hydrology, narrative, ecology, placement). These are run-global and should remain on context, with `RunSettings.dimensions` as the source of truth (not per-step config or artifacts).
- **Latitude** is derived via the adapter in step helpers: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/helpers/inputs.ts` uses `context.adapter.getLatitude`, and narrative helpers like `mods/mod-swooper-maps/src/domain/narrative/utils/latitude.ts` consume adapter-backed data. This is run-global from `RunSettings.latitudeBounds`, but steps should keep consuming adapter/derived artifacts (not per-step config).
- **Directionality** is currently supplied as step config in recipe config builders and used in steps like `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` and `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-*/steps/storyCorridors*.ts`. It is a cross-cutting run policy → should live in `RunSettings.directionality` and be read via `context.settings`, not step config.
- **Seed** (`RunSettings.seed`) is only set at runtime (`mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`) and not read by steps directly. Steps rely on `ctxRandom`/domain RNG flows, so seed should stay in settings with boundary ownership (not per-step config/artifacts).
- **Wrap** (`RunSettings.wrap`) is currently assembled in `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` and `mods/mod-swooper-maps/src/maps/_runtime/map-init.ts`, with no direct step reads. It should remain a settings-level knob and be enforced by adapter/grid helpers (not per-step config).
- **Trace** (`RunSettings.trace`) has no step-level reads in `mods/mod-swooper-maps/src/recipes/**` today. Steps should emit via `context.trace` only; trace config interpretation belongs at the runtime boundary (settings-owned, not per-step config/artifacts).

#### A2 Findings: `context.config` consumers in recipes
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` reads `context.config` to access `foundation.dynamics.directionality`. This is legacy/global-knob usage and should move to `context.settings.directionality` (not a legitimate per-step config read).

#### A3 Findings: `context.settings` type surface + impacted types/tests
- **Minimal surface choice:** use full `RunSettings` on `context.settings`. The runtime already normalizes `RunRequest.settings` into `ExecutionPlan.settings`, and step needs are a subset of that schema; keeping the full type avoids inventing a duplicate “subset settings” type and keeps settings/plan aligned.
- **Primary type touchpoints:** `packages/mapgen-core/src/core/types.ts` (`ExtendedMapContext` interface and `createExtendedMapContext` factory) and `packages/mapgen-core/src/engine/PipelineExecutor.ts` (assign `context.settings` from `plan.settings`).
- **Tests likely impacted (context construction):** `packages/mapgen-core/test/pipeline/hello-mod.smoke.test.ts`, `packages/mapgen-core/test/pipeline/execution-plan.test.ts`, `packages/mapgen-core/test/pipeline/tag-registry.test.ts`, `packages/mapgen-core/test/pipeline/tracing.test.ts`, `packages/mapgen-core/test/pipeline/placement-gating.test.ts` (all call `createExtendedMapContext` and may need a default/placeholder for `settings` if it becomes required).

### Pre-work for B (trace wiring)
- “Confirm the intended default sink strategy: where does `TraceSink` come from in a normal mod run (console, file, FireTuner, in-memory test sink)?”
- “Audit `PipelineExecutor` and step wrappers to ensure no one needs to check `settings.trace` directly; list any needed helper APIs for emitting step events.”
- “Write a small end-to-end test that sets `settings.trace.steps[stepId] = 'verbose'` and asserts sink receives step events for that step only.”

#### B1 Findings: TraceSink source in normal runs
- `TraceSink` is only instantiated in tests today (e.g. in-memory sink in `packages/mapgen-core/test/pipeline/tracing.test.ts`). The normal mod runtime (`mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`) does not pass a sink or `TraceSession` into `recipe.run`, so tracing is effectively disabled by default.
- There is no existing runtime surface for a sink in `MapRuntimeOptions` (`mods/mod-swooper-maps/src/maps/_runtime/types.ts`), so a default strategy is currently undefined. Any runtime tracing will need an explicit boundary choice (e.g., optional console sink, FireTuner sink, or a caller-provided sink).

#### B2 Findings: trace usage in executor + helpers
- `PipelineExecutor` already scopes tracing per-step by assigning `context.trace = trace.createStepScope({ stepId, phase })` and emits run/step start/finish events (`packages/mapgen-core/src/engine/PipelineExecutor.ts`). No step code reads `settings.trace` directly today.
- `EngineContext` only exposes `trace: TraceScope` (`packages/mapgen-core/src/engine/types.ts`), so step authors already have the correct surface (`context.trace.event(...)`, `isVerbose`, `isEnabled`). That implies no new helper API is strictly required, though a small convenience helper for structured step events could be added later if desired.

#### B3 Plan: trace steps verbosity test
- **Location:** extend `packages/mapgen-core/test/pipeline/tracing.test.ts` (already exercises `createTraceSessionFromPlan`).
- **Setup:** register two steps (`alpha`, `beta`) that call `context.trace.event({ step: "<id>" })` inside `run`.
- **Settings:** build plan with `settings.trace.steps = { alpha: "verbose", beta: "off" }` (or `beta` omitted + `enabled: true` if we want only step-event gating) so only `alpha` should emit `kind: "step.event"`.
- **Assertions:** collect emitted events via an in-memory sink; filter `kind === "step.event"` and assert all are `stepId === "alpha"` and count matches expected calls. (Run/step start/finish can still be asserted separately if desired.)

### Pre-work for C (directionality cutover)
- “Enumerate all directionality reads across steps/domains (`rg -n 'directionality' mods/mod-swooper-maps/src/recipes`) and ensure they can be replaced by `context.settings.directionality`.”
- “Confirm that `buildStandardRunSettings` is the only writer of directionality (or list others).”

### Pre-work for D (retire global config blob)
- “Identify all remaining reasons `run-standard.ts` sets `context.config` today (directionality, diagnostics, other). For each, list the replacement (settings vs artifacts vs step config).”
- “Locate any tests/docs that still assume ‘runtime overrides live in `ExtendedMapContext.config`’ and list required updates.”

### Pre-work for E (loader optional)
- “Enumerate all imports of `@mapgen/config/loader` and `safeParseConfig` and determine whether they are runtime-critical or tooling/test-only.”
- “Decide whether schema export (`getJsonSchema` / `getPublicJsonSchema`) is a required public surface for the standard content package in M6.”
