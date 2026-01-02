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
- **Diagnostics cleanup:** deprecate/remove `foundation.diagnostics` as the author-facing control plane for step logging; replace with settings-owned observability knobs (trace first; do not port DEV flags 1:1 as part of this issue).
- **Remove config loader tooling:** delete `@mapgen/config` loader/schemas/helpers; there are no external consumers.

## Sequencing (parent coordination)
1) **A (settings plumbing):** unblock all downstream cutovers by giving steps a stable `context.settings`.
2) **B (trace wiring):** land default console tracing once settings are visible and plan settings can be consumed.
3) **C (directionality):** migrate all reads to `context.settings.directionality`, then remove per-step duplication.
4) **D (retire `context.config` as global knobs):** remove the legacy global blob in `run-standard.ts` and update docs that still describe it.
5) **E (remove loader tooling):** delete `mods/mod-swooper-maps/src/config/loader.ts` and any remaining public surface; keep only TS-authored config.

## Acceptance Criteria
- `mods/mod-swooper-maps/src/recipes/**` contains **0** reads of `context.config.foundation.dynamics.directionality` (or any `context.config.*` reads for cross-cutting policies).
- Standard runtime entrypoints no longer cast overrides into `context.config` as a “global config object”.
- A run with `settings.trace.steps = { "<stepId>": "verbose" }` emits trace events for that step via the trace sink; steps do not perform `if (settings.trace...)` checks.
- The default trace sink is **console**; enabling `settings.trace` produces visible console output without requiring extra wiring at call sites.
- `mods/mod-swooper-maps/src/config/loader.ts` is deleted and there are **0** imports of `config loader module` and **0** usages of `safe-parse helper` across the repo.
- The only code that interprets `settings.trace.steps` lives at the runtime boundary (trace session creation + executor step-scoping), not inside domain/step logic.

## Testing / Verification
- `pnpm check`
- `pnpm build`
- `pnpm deploy:mods`
- `pnpm test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U06](./LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md)
- Directionality policy is already decided: ADR-ER1-019 (`RunRequest.settings`, not per-step config duplication).
- Run boundary is already decided: ADR-ER1-003 (`RunRequest = { recipe, settings }`, not monolithic `MapGenConfig`).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### A) Settings plumbing: `RunRequest.settings` → `ExecutionPlan.settings` → `context.settings`
**In scope**
- Add `context.settings: RunSettings` (full `RunSettings`) to the runtime context surface used by steps.
- Plumb settings once per run from `ExecutionPlan.settings` (plan is the source of truth at runtime).
- Keep step config shape unchanged (step still receives `stepConfig` as the second arg to `step.run`).

**Out of scope**
- Reworking how step config schemas are authored/normalized (this issue only exposes run settings).

**Rationale / context**
- Directionality and trace are run-global policies, already represented in `RunRequest.settings` and normalized onto the plan; steps currently lack a supported way to read settings and have been using `context.config` as a global blob.

**Acceptance criteria**
- Steps can read `context.settings` with correct typing (no `as any` at call sites for settings).
- All `createExtendedMapContext(...)` call sites and tests compile with the new required/optional shape.

**Verification / tests**
- `pnpm check`
- `pnpm build`
- `pnpm -C packages/mapgen-core check`
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`

### B) Trace wiring: settings-owned + boundary-enforced, default sink = console
**In scope**
- Continue to treat trace configuration as `RunRequest.settings.trace` (already in schema).
- Ensure the runtime boundary creates a `TraceSession` from the compiled plan and applies per-step scopes.
- Implement a **default console sink** used when tracing is enabled (no silent no-op).
- Allow overrides at the boundary (e.g., caller passes `traceSink` or a full `TraceSession`).

**Out of scope**
- FireTuner/file sinks, sampling, advanced sinks, or long-term structured log routing.
- Step/domain code checking flags (still forbidden).

**Rationale / context**
- Authors should not enable trace and see “nothing happened”; default console output keeps behavior visible and debuggable. Runtime toggle interpretation stays at the boundary; step/domain logic only emits to `context.trace`.

**Acceptance criteria**
- Trace config interpretation is confined to runner/session creation + executor scoping; there are no `if (context.settings.trace...)` checks in step/domain code.
- When `settings.trace` is enabled, trace events are visibly emitted to console by default.
- Run fingerprints remain stable across trace enablement changes (preserve `stripTraceSettings(...)` behavior).

**Verification / tests**
- `pnpm check`
- `pnpm -C packages/mapgen-core test` (add/extend tests as needed; see B3 below)
  - Add a runner-level test that enables `settings.trace` and asserts the default console sink is used when no `traceSink` is provided (spy on `console.*`).
- `pnpm -C mods/mod-swooper-maps test`

### C) Directionality cutover: settings-owned only (no per-step duplication)
**In scope**
- Migrate all directionality consumers to `context.settings.directionality`.
- After reads are migrated, stop duplicating directionality into per-step configs (single source of truth is `RunRequest.settings`).

**Out of scope**
- Redesigning the shape of `directionality` itself (it remains settings-owned; internal schema refinement can happen later).

**Rationale / context**
- ADR-ER1-019 locks directionality as a cross-cutting run policy; duplicating it into per-step config creates drift and confusion.

**Acceptance criteria**
- `mods/mod-swooper-maps/src/recipes/**` contains 0 reads of `context.config.*` for directionality.
- No step config schemas include directionality solely to carry run-global policy.

**Verification / tests**
- `rg -n \"context\\.config\\..*directionality\" mods/mod-swooper-maps/src/recipes` returns no matches.
- `pnpm check`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`

### D) Retire `context.config` as a “global knobs blob” (keep `runStandard`, remove legacy usage)
**In scope**
- Keep `runStandard` as the runtime entrypoint, but remove its use of `ExtendedMapContext.config` as a global cross-cutting store.
- Remove `context.config = safeOverrides` pattern from `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`.
- Remove config-owned `foundation.diagnostics` control plane + `initDevFlags(...)` call from that entry boundary (no replacement in this issue).
- Update docs that still describe “runtime overrides live in `context.config`”.

**Out of scope**
- Introducing a new DEV-flag system under settings (explicitly deferred).
- Removing `StandardRecipeOverrides` translation layer (this issue only removes the “global knobs” justification for it).

**Rationale / context**
- The target boundary is `RunRequest = { recipe, settings }`; `context.config` as a global blob is legacy/accidental and creates “missing config / irrelevant keys” complexity elsewhere.

**Acceptance criteria**
- Standard runtime entrypoints do not cast/store overrides into `context.config` for cross-cutting policies.
- `docs/system/mods/swooper-maps/architecture.md`, `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`, and `docs/projects/engine-refactor-v1/triage.md` no longer claim runtime overrides live in `context.config`.

**Verification / tests**
- `pnpm check`
- `pnpm build`
- `pnpm deploy:mods`
- `pnpm -C mods/mod-swooper-maps deploy`

### E) Remove loader tooling completely (`@mapgen/config` / `safe-parse helper`)
**In scope**
- Delete `mods/mod-swooper-maps/src/config/loader.ts` and any associated public exports/re-exports (e.g. `mods/mod-swooper-maps/src/config/index.ts`).
- Delete or migrate any tests/tooling that depend on `safe-parse helper` (do not replace with a new loader in this issue).
  - Example: rewrite `mods/mod-swooper-maps/test/ecology/features-owned-unknown-chance-key.test.ts` to validate the relevant config schema directly (or assert runtime validation behavior via existing step/op validation paths).
- Remove any docs that describe the loader as a supported surface.

**Out of scope**
- Reintroducing JSON ingestion/schema export as a first-class public surface (explicitly deferred until there is a real consumer).

**Rationale / context**
- There are no external consumers today; keeping unused public surfaces adds maintenance and confusion. If/when JSON ingestion becomes required, reintroduce it with an intentional design and ownership model.

**Acceptance criteria**
- `mods/mod-swooper-maps/src/config/loader.ts` is deleted.
- `rg -n \"config loader module|safe-parse helper|json-schema helper|public-schema helper|default-config helper\" .` returns no matches.

**Verification / tests**
- `pnpm check`
- `pnpm build`
- `pnpm deploy:mods`
- `pnpm test`

---

## Implementation Decisions

### Put full `RunSettings` on `context.settings`
- **Context:** Steps need a supported way to read run-global policies (directionality, trace) without smuggling global knobs through `context.config`.
- **Options:** Expose a subset type vs expose the full `RunSettings` schema type.
- **Choice:** Expose full `RunSettings` on `context.settings`.
- **Rationale:** Keeps `ExecutionPlan.settings` and `context.settings` aligned; avoids duplicating a “subset settings” type that will drift as settings evolve.
- **Risk:** Wider type surface on `context` than strictly necessary, but still settings-owned and stable per ADR boundary.

### Make directionality settings-owned only (remove per-step duplication)
- **Context:** Directionality is currently duplicated into some per-step configs via `buildStandardRecipeConfig`, even though ADR-ER1-019 declares it a cross-cutting run setting.
- **Options:** Keep duplication temporarily vs remove duplication after migrating reads to `context.settings.directionality`.
- **Choice:** Remove per-step directionality duplication once reads have been migrated to `context.settings.directionality`.
- **Rationale:** Eliminates drift/confusion between “step config directionality” and “run settings directionality”; makes `RunRequest.settings` the single source of truth.
- **Risk:** Any callers relying on per-step directionality config will break; mitigate by migrating all known consumers (see Implementation step C) before removing writers.

### Default trace sink is console (allow overrides)
- **Context:** `settings.trace.steps` is the contract for what to emit, and a `TraceSink` is the delivery mechanism.
- **Options:** Default to console vs require an explicit sink.
- **Choice:** Default to a console sink when `settings.trace` is enabled; allow overriding via `traceSink` (or supplying a pre-built `TraceSession`).
- **Rationale:** Avoids “trace enabled but nothing happened” confusion; keeps trace behavior visible and explicit in the architecture.
- **Risk:** Console output may be noisy if authors enable trace broadly; mitigate via per-step levels in `settings.trace.steps` and by keeping tracing disabled by default unless enabled in settings.

### Treat `trace.steps` as an implicit enable signal
- **Context:** `TraceConfigSchema` previously defaulted `enabled` to `false`, which disabled tracing even when `trace.steps` was populated.
- **Options:** Keep default `enabled: false` (require explicit enable) vs remove the default and let step mappings activate tracing unless explicitly disabled.
- **Choice:** Remove the default for `enabled` so `trace.steps` alone enables tracing when provided.
- **Rationale:** Aligns runtime behavior with the issue contract: per-step trace settings should be sufficient to activate trace output.
- **Risk:** Callers relying on defaulted `enabled: false` may now see trace output if they already provide `trace.steps`; mitigated by allowing explicit `enabled: false` to force disable.

### Do not re-home `foundation.diagnostics`/`DEV.*` flags in this issue
- **Context:** `foundation.diagnostics` + `DEV.*` gating is legacy “global knobs” behavior threaded via `context.config`.
- **Options:** Port DEV flags into a new `settings.dev`/`settings.diagnostics` model now vs deprecate config-owned DEV flags and rely on trace for step-level observability.
- **Choice:** Deprecate/remove config-owned diagnostics control in this issue; do not introduce a new settings-owned DEV-flag system yet.
- **Rationale:** Keeps this issue scoped to the agreed boundary-first trace model; avoids introducing a new settings surface without a dedicated decision/ADR.
- **Risk:** Some legacy debug outputs may be harder to enable until a follow-up defines the replacement (if needed).

### Delete loader tooling surface (`@mapgen/config`)
- **Context:** The loader is tooling/test-only and has no external consumers today; it also introduces a “second config ingestion path” that is not part of the target boundary model.
- **Options:** Keep as tooling-only vs delete entirely and reintroduce later if needed.
- **Choice:** Delete it entirely (code + exports + tests that depend on it).
- **Rationale:** Prefer removing unused surfaces and reintroducing intentionally when there is a real consumer.
- **Risk:** If someone was relying on these exports out-of-tree, this is a breaking change; mitigate by confirming no external consumers before merging and by documenting the replacement story (“TS-authored config only”).

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
- “Implement the chosen model: default console sink when `settings.trace` is enabled; allow override via `recipe.run(..., { traceSink })`.”
- “Audit `PipelineExecutor` and step wrappers to ensure no one needs to check `settings.trace` directly; list any needed helper APIs for emitting step events.”
- “Write a small end-to-end test that sets `settings.trace.steps[stepId] = 'verbose'` and asserts sink receives step events for that step only.”

#### B1 Findings: TraceSink source in normal runs
- `TraceSink` is only instantiated in tests today (e.g. in-memory sink in `packages/mapgen-core/test/pipeline/tracing.test.ts`). The normal mod runtime (`mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`) does not pass a sink or `TraceSession` into `recipe.run`, so tracing is effectively disabled today.
- This issue’s target behavior removes that “silent disabled” default by introducing a **default console sink** in the core runner when `settings.trace` is enabled (with optional override via `traceSink` / `TraceSession`).

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

#### C1 Findings: directionality reads + replacement path
- **Recipe/step-level reads (all replaceable with `context.settings.directionality`):**
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` (reads `context.config.foundation.dynamics.directionality`).
  - `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-mid/steps/storyCorridorsPre.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-swatches/steps/storySwatches.ts` (read `config.foundation.dynamics.directionality` from step config).
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts` (reads `config.dynamics?.directionality`).
- **Domain-level reads (all fed via step/config options today, can be fed from `context.settings.directionality`):**
  - Hydrology refine/swatches: `mods/mod-swooper-maps/src/domain/hydrology/climate/refine/index.ts`, `mods/mod-swooper-maps/src/domain/hydrology/climate/refine/orographic-shadow.ts`, `mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/index.ts`, `mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/chooser.ts`, `mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/monsoon-bias.ts`.
  - Narrative corridors: `mods/mod-swooper-maps/src/domain/narrative/corridors/index.ts`, `mods/mod-swooper-maps/src/domain/narrative/corridors/land-corridors.ts`, `mods/mod-swooper-maps/src/domain/narrative/corridors/sea-lanes.ts`.
- Narrative rifts tagging reads from `ctx.config`: `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts` → replace with `context.settings.directionality` plumbed into helper calls.

#### C2 Findings: directionality writers
- `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (`buildStandardRunSettings`) is the only writer of `RunSettings.directionality`.
- Directionality is also written into **step configs** via `buildStandardRecipeConfig` (same file) from overrides, and **authored in map definitions** (`mods/mod-swooper-maps/src/maps/*.ts`) as `overrides.foundation.dynamics.directionality`. Those are config-level writers, not runtime settings writers.

### Pre-work for D (retire global config blob)
- “Identify all remaining reasons `run-standard.ts` sets `context.config` today (directionality, diagnostics, other). For each, list the replacement (settings vs artifacts vs step config).”
- “Locate any tests/docs that still assume ‘runtime overrides live in `ExtendedMapContext.config`’ and list required updates.”

#### D1 Findings: `run-standard.ts` global config reasons + replacements
- `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` sets `context.config = safeOverrides` primarily to:
  - **Diagnostics/DEV flags:** reads `context.config.foundation.diagnostics` to call `initDevFlags(...)`. Replacement: settings-owned tracing (`settings.trace` + boundary-provided sink) and removal of the config-owned DEV-flag control plane (no 1:1 DEV flag port in this issue).
  - **Directionality reads in runtime code:** `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` and `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts` read `context.config.foundation.dynamics.directionality`. Replacement: `context.settings.directionality` passed into those steps/domain helpers.
- No other `context.config` consumers exist in `mods/mod-swooper-maps/src` beyond the two directionality reads above.

#### D2 Findings: docs/tests assuming runtime overrides live in `context.config`
- **Active docs to update:**
  - `docs/system/mods/swooper-maps/architecture.md` (explicitly says runtime overrides live in `ExtendedMapContext.config`).
  - `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md` (lists “Embed `MapGenConfig` into `MapGenContext` consistently (`context.config`)”).
  - `docs/projects/engine-refactor-v1/triage.md` (notes overrides mapped directly to recipe config and passed into `ExtendedMapContext.config`).
- **Archived references (likely no change needed unless reactivated):**
  - `docs/system/libs/mapgen/_archive/architecture-legacy.md`
  - `docs/projects/engine-refactor-v1/resources/_archive/*` and `docs/projects/engine-refactor-v1/reviews/_archive/*` that document the older `context.config` model.
- **Tests:** no test files currently mention `context.config` (`rg -n "context\\.config" packages mods -g "*test*"` returned none).

### Pre-work for E (loader removal)
- “Enumerate all imports of `config loader module` and `safe-parse helper` and confirm they are only internal/test usage.”
- “Confirm there are no external consumers (search repo docs + exports).”
- “Delete the loader and remove/replace any tests/docs that reference it.”

#### E1 Findings: `config loader module` + `safe-parse helper` usage
- **Imports of `config loader module`:**
  - `mods/mod-swooper-maps/src/config/index.ts` re-exports `parseConfig/safe-parse helper/default-config helper/json-schema helper/public-schema helper` for external consumers. This is a tooling-facing surface, not used in runtime entrypoints.
- **`safe-parse helper` usage:**
  - `mods/mod-swooper-maps/test/ecology/features-owned-unknown-chance-key.test.ts` (test-only).
  - The implementation lives in `mods/mod-swooper-maps/src/config/loader.ts` and is not imported by runtime code.
- **Conclusion:** current usages are tooling/test-only; no runtime-critical dependency on the loader.

#### E2 Decision: delete loader tooling surface
- **Decision:** delete `mods/mod-swooper-maps/src/config/loader.ts` and remove the `@mapgen/config` loader/schema export surface entirely.
- **Rationale:** There are no external consumers today; removing unused public surfaces keeps the boundary model simpler. If JSON ingestion/schema export becomes required later, reintroduce it intentionally with a dedicated spec/ADR and a real consumer.
