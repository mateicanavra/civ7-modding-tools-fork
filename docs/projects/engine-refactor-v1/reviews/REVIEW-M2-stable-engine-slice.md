---
id: M2-stable-engine-slice-review
milestone: M2-stable-engine-slice
title: "M2: Stable Engine Slice – Aggregate Review"
status: draft
reviewer: AI agent (Codex CLI)
---

## Milestone M2 – Final Analysis & Path Forward

M2 is effectively concluded as a **“config + foundation slice is stable, documented, and test-backed”** milestone, implemented on the current `MapOrchestrator`-centric architecture. It **does not** include a fully generic `PipelineExecutor` / `MapGenStep` / `StepRegistry`; those pipeline primitives are now explicitly planned for early M3+ on top of the stabilized data products.

**Milestone boundary note:** M2 owns config parity/wiring and behavioral correctness for the **current stable slice** (foundation + minimal story + diagnostics) where those configs are meaningful today and unlikely to change under the Task Graph design. Config/behavior work that depends on `MapGenStep`/`PipelineExecutor` or canonical data‑product boundaries is deferred to M3 to avoid double‑refactoring.

Before calling M2 fully done, we will land a small, concrete cleanup/stabilization batch:

- **Docs alignment**
  - Update M2 docs and relevant issue files so they accurately describe the real flow: `bootstrap() → validated MapGenConfig → tunables → MapOrchestrator → FoundationContext`.
  - Remove or clearly mark as “future” any remaining references to `globalThis.__EPIC_MAP_CONFIG__` and the old global-config pattern.
  - Soften or relocate language that assumes a currently implemented generic `PipelineExecutor` / `MapGenStep` / `StepRegistry`, making clear that these land in M3+.
- **Stable‑slice config surface**
  - Align schema/docs with stable‑slice keys already meaningful in M2 (foundation diagnostics flags, story‑driven rainfall knobs) and decide parity vs. deprecate for any diagnostics aliases.
- **Contract stabilization**
  - Make the `FoundationContext` contract explicit: what it guarantees to downstream consumers and which data products exist at the end of the M2 slice (captured in `resources/CONTRACT-foundation-context.md` as a working contract doc).
  - Clarify the role of tunables as a derived, read-only view over validated `MapGenConfig`, not a primary config store.
- **Tests**
  - Add at least one end-to-end `MapOrchestrator.generateMap` smoke test using a minimal/default `MapGenConfig` and a stub adapter, asserting that:
    - Foundation data products are populated as expected.
    - The stage flow does not regress under the current M2 slice.

These cleanup items will become a small set of discrete M2 follow-up issues (to be created in Linear later), for example:

- “Align M2 docs and status with the actual config/orchestrator implementation.”
- “Document the `FoundationContext` contract and the config → tunables → world-model flow.”
- “Add `MapOrchestrator.generateMap` smoke tests over the current slice.”

Looking forward, M3 and M4 are realigned at a high level as follows:

- **M3**
  - Introduce `PipelineExecutor` / `MapGenStep` / `StepRegistry` *on top of* the now-stable data products, rather than in parallel to them.
  - Canonicalize core engine data products, including:
    - `ClimateField` and basic hydrology/river products.
    - `StoryOverlays` and their relationship to `StoryTags`.
  - Start migrating key clusters (foundation extensions, climate, remaining story overlays after M2 minimal parity) into `MapGenStep`s with clear `requires` / `provides` contracts.
- **M4**
  - Focus on validation, contracts, and robustness:
    - Data-product and `StageManifest` validation (requires/provides checks, manifest consistency).
    - Orchestrator/pipeline integration tests and diagnostics.
    - Final cleanup of legacy paths and shims as the new architecture becomes the default.

# M2: Stable Engine Slice – Aggregate Review (Running Log)

This running log captures task-level reviews for milestone M2. Entries focus on
correctness, completeness, and forward-looking risks for the engine refactor.

---

## CIV-27 – MapGenConfig TypeBox Schema

**Quick Take**  
Satisfied for M2: schema + loader + defaults are in place and type-safe. Public/internal tagging and a public-schema guard exist as groundwork for future cleanup, but we intentionally **do not** wire the public schema into any tooling yet.

**Intent & Assumptions**  
- Establish `MapGenConfigSchema` as the canonical TypeBox schema with inferred `MapGenConfig`.  
- Apply defaults/normalization via loader helpers; keep legacy nesting/back-compat.  
- Mark internal-only controls for later hiding/removal without blocking this milestone.

**What’s Strong**  
- Broad coverage of landmass, foundation, climate, story, corridors, ocean separation, etc., with sensible defaults and ranges.  
- Loader (`parseConfig`/`safeParseConfig`) clones→defaults→converts→cleans and surfaces structured errors; `getDefaultConfig`/`getJsonSchema` exported.  
- Public exports wired in `config/index.ts`; type checks green across the repo.  
- Tests cover defaults, type/range failures, and safe parse paths.

**High-Leverage Issues**  
- Public vs. internal knobs were previously only noted via `[tag]` markers. In this slice we introduced a schema-level metadata flag (`xInternal`) and a **public-schema guard** (`getPublicJsonSchema` + `filterInternalFields`) that can hide those internals in the future, without changing the current config surface.  
- Optional-wrapper metadata was stripped to satisfy TypeBox v1 signatures; reattaching descriptions/defaults at the property schema level remains a nice-to-have but is not required to close M2.  
- `UnknownRecord` escape hatches keep validation loose (notably climate knobs); we’ve already narrowed several of these (baseline/refine sub-schemas) and explicitly scoped the remaining pockets for later tightening.

**Fit Within the Milestone**  
Delivers the schema/loader backbone needed for M2’s config hygiene goals. It also lays **non-breaking groundwork** (internal tagging + public-schema guard) for a future public/internal schema split without committing to structural changes or new call sites in this milestone.

**Recommended Next Moves (Future Work, Not M2)**  
1. Decide, in a later config/CLI/docs pass, which consumers should call `getPublicJsonSchema()` instead of `getJsonSchema()` and curate the truly public surface there.  
2. Continue narrowing the remaining `UnknownRecord` sections using historical JS docs and real usage as guides.  
3. Reattach property-level descriptions/defaults that were dropped during the TypeBox v1 migration where they materially improve generated docs or tooling.

**Follow-ups / Checklist**  
- [x] TypeBox v1 compatibility and typechecks fixed (dependency bumped; loader/schema updated).  
- [x] Public/internal boundary tagged via `xInternal` and guarded by `getPublicJsonSchema` (prep only; no current callers).  
- [x] Narrowed several `UnknownRecord` escape hatches to typed schemas (climate baseline/refine).  
- [ ] Reattach property-level descriptions/defaults removed from `Type.Optional` wrappers (nice-to-have).  
- [ ] Decide how/where to actually consume the public schema in tooling/docs (explicitly deferred to a future milestone).

---

## CIV-28 – parseConfig Loader & Validation Helpers

**Quick Take**  
Yes for M2: the loader is fully implemented and tested on top of `MapGenConfigSchema`, with clear error reporting and JSON Schema export. The remaining hygiene work is in downstream wiring (CIV‑29/30/31), not in the loader itself.

**Intent & Assumptions**  
- Provide a single runtime entrypoint that takes arbitrary config, applies schema defaults, validates against `MapGenConfigSchema`, and fails fast on invalid inputs.  
- Expose helpers via `@swooper/mapgen-core/config` for both engine code and external tooling.  
- Defer actual integration into the orchestrator/tunables/global-removal to sibling tasks in the M2 config-hygiene epic.

**What’s Strong**  
- `packages/mapgen-core/src/config/loader.ts` implements `parseConfig`, `safeParseConfig`, `getDefaultConfig`, and `getJsonSchema` using the Clone→Default→Convert→Clean pipeline on `MapGenConfigSchema`.  
- Validation uses the compiled TypeBox schema and aggregates errors into an `Invalid MapGenConfig: …` message while also exposing a structured `errors` array via `safeParseConfig`.  
- `config/index.ts` re-exports both schema/types and loader helpers, matching the intended `@swooper/mapgen-core/config` surface.  
- `packages/mapgen-core/test/config/loader.test.ts` covers defaults, type/range failures, safe-parse behavior, and the internal vs public JSON Schema guard.

**High-Leverage Issues**
- The loader is not yet the canonical runtime entrypoint: production code still reads config via the legacy global store (`bootstrap/runtime.ts`) and does not call `parseConfig` on input. This is squarely in CIV‑29/30/31 scope but worth calling out so we don't assume hygiene is "done" just because the loader exists.
- ~~Tests currently import the loader via its internal path (`../../src/config/loader.js`) instead of the public `config` entrypoint, which slightly weakens guarantees that the exported surface matches what's tested (low risk given the thin index, but an easy future improvement).~~ **Resolved**: tests now import via `config/index.js`.
- ~~Documentation for CIV‑28 refers to `TypeCompiler` while the implementation uses TypeBox's `Compile` API; functionally correct but mildly confusing when cross-referencing tickets.~~ **Resolved**: docs updated to reference `Compile` API and `getPublicJsonSchema`.

**Fit Within the Milestone**  
Together with CIV‑27, this task delivers the backbone of M2’s config hygiene story: a schema-backed, defaulting, and validating loader with clear errors and JSON Schema export. It intentionally stops short of removing globals or rewiring the orchestrator/tunables, which are addressed in later tasks. For M2’s “stable slice” goal, this is an appropriate and complete step.

**Recommended Next Moves (Future Work, Not M2)**
1. As part of CIV‑29/30/31, route all engine configuration through `parseConfig` and eliminate direct dependence on `globalThis.__EPIC_MAP_CONFIG__` in runtime paths.
2. ~~Update `loader.test.ts` (or add an integration-style test) to import from `@swooper/mapgen-core/config` to validate the exported surface end to end.~~ **Done.**
3. ~~Refresh CIV‑27/CIV‑28 docs to reference the current TypeBox compile API and call out the existence of `getPublicJsonSchema` for public tooling.~~ **Done.**

**Follow-ups / Checklist**
- [x] `packages/mapgen-core/src/config/loader.ts` implements `parseConfig`, `safeParseConfig`, `getDefaultConfig`, and `getJsonSchema` on top of `MapGenConfigSchema`.
- [x] Helpers are re-exported via `packages/mapgen-core/src/config/index.ts` and usable from `@swooper/mapgen-core/config`.
- [x] Unit tests cover defaults, type/range errors, safe-parse behavior, and the public vs internal JSON Schema guard.
- [x] Tests import from `config/index.js` entrypoint (validates exported surface).
- [x] CIV‑28 documentation aligned with actual TypeBox `Compile` API and `getPublicJsonSchema` helper.
- [ ] Wire `parseConfig` into orchestrator/tunables and remove reliance on the global config store (CIV‑29/30/31 scope).

---

## CIV-29 – Remove Global Config Stores

**Quick Take**  
Satisfied for M2: `mapgen-core` no longer uses `globalThis`-backed config stores in either `src/` or `dist`, and `bootstrap()` now routes through `parseConfig` and returns a validated `MapGenConfig`. Remaining work is around how that validated config is consumed (orchestrator/tunables) and aligning tests with the new model, which is explicitly sequenced into CIV‑30/31 rather than a gap in CIV‑29 itself.

**Intent & Assumptions**  
- Remove `globalThis.__EPIC_MAP_CONFIG__` and similar global config slots from the engine library.  
- Ensure `bootstrap()` returns a validated `MapGenConfig` instead of only mutating hidden state, while keeping the public `bootstrap(options)` signature stable for Swooper maps.  
- Treat module-scoped, shallow-frozen config as a transitional step toward full injection (CIV‑30) and tunables-as-view (CIV‑31), not as a new long-term global pattern.

**What's Strong**
- ~~`packages/mapgen-core/src/bootstrap/runtime.ts` is rewritten as a module-scoped store (`_validatedConfig`) with `setValidatedConfig`/`getValidatedConfig`/`hasConfig`/`resetConfig`, completely removing `globalThis` from runtime config paths in the engine library.~~

  **Update (2025‑12):** The module-scoped config store and `setConfig`/`getConfig`/`setValidatedConfig`/`getValidatedConfig`/`hasConfig`/`resetConfig` have been removed. `runtime.ts` now only exports a type alias. Configuration flows exclusively through `bootstrap(...) → MapGenConfig → bindTunables(config) → getTunables()`.

- ~~`packages/mapgen-core/src/bootstrap/entry.ts` (and its `dist` counterpart) now build a `rawConfig`, resolve `stageConfig` into a `stageManifest`, validate via `parseConfig(rawConfig)`, store via `setValidatedConfig`, and return the resulting `MapGenConfig`.~~

  **Update (2025‑12):** `entry.ts` no longer calls `setValidatedConfig`. It validates via `parseConfig(rawConfig)`, calls `bindTunables(validatedConfig)`, and returns the `MapGenConfig`. There is no longer a separate runtime config store.

- ~~The public surface remains compatible: `bootstrap(options)` still accepts the same options, `MapConfig` is aliased to `MapGenConfig`, and deprecated `setConfig`/`getConfig` shims exist only as a non-global, strongly-typed compatibility layer.~~

  **Update (2025‑12):** The deprecated `setConfig`/`getConfig` shims have been removed. The public surface is now `bootstrap(options) → MapGenConfig` plus the tunables API (`getTunables`, `bindTunables`, `resetTunables`, `stageEnabled`).

**High-Leverage Issues (Deferred / Covered Elsewhere)**
- ~~**Consumption still goes through tunables and legacy getters (CIV‑30/31 scope).**~~
  ~~`MapOrchestrator` and most layers still read configuration via `getTunables()` (which in turn calls `getConfig()`), rather than using `getValidatedConfig()` or constructor injection. This is by design for M2: CIV‑30 and CIV‑31 already cover wiring `MapOrchestrator` to `MapGenConfig` and refactoring tunables as a view over validated config. No new issue is needed; we should just verify those tasks close the loop.~~

  **Update (2025‑12):** `getTunables()` now reads from a bound validated `MapGenConfig` and throws when tunables have not been bound. There is no legacy fallback to `getConfig()` or module state; callers must go through `bootstrap()` or `bindTunables(config)`.

- ~~**Deprecated `setConfig`/`getConfig` remain exported (CIV‑26 / later cleanup).**~~
  ~~The deprecated APIs are now safe (no globals) but still visible on the bootstrap entry. They're clearly marked `@deprecated` and can be treated as transitional. Cleanup/removal is best handled once CIV‑30/31 are complete; this is already conceptually covered by the CIV‑26 parent ("no global config stores" + injected config) and does not require a separate ticket unless we want a dedicated "remove legacy runtime APIs" task.~~

  **Update (2025‑12):** The deprecated `setConfig`/`getConfig` APIs have been removed from the codebase entirely.

- ~~**Tests still reflect the pre-refactor runtime shape (low-risk hygiene).**~~
  ~~Some bootstrap/runtime tests still assert the old `getConfig()` semantics (e.g., instance identity, always-present object) instead of focusing on `getValidatedConfig()`/`hasConfig` and the failure mode when called before `bootstrap()`. This doesn't affect runtime behavior but slightly weakens the guardrails around the new model. It's reasonable to either:~~
  - ~~Update these tests as part of CIV‑30/31 when we touch orchestrator/tunables, or~~
  - ~~Treat it as a small follow-up checklist item under CIV‑29/CIV‑26 without filing a dedicated issue.~~

  **Update (2025‑12):** Tests have been updated to reflect the new model. `runtime.test.ts` was deleted (tested removed APIs). Bootstrap and tunables tests now use `bootstrap()` or `bindTunables()` and assert the fail-fast behavior when tunables are not initialized.

**Fit Within the Milestone**  
For M2’s “stable engine slice” goal, CIV‑29 delivers the key hygiene step: the engine library now uses a validated, module-scoped config store instead of `globalThis`, and `bootstrap()` is a proper entrypoint into the CIV‑27/28 schema & loader. The remaining responsibilities—making `MapOrchestrator` and tunables consume that validated config explicitly, and tightening tests around the new invariants—are intentionally scoped into CIV‑30/31 and the broader CIV‑26 epic rather than being missing work here.

**Recommended Next Moves (Future Work, Not M2)**  
1. As part of CIV‑30, inject `MapGenConfig` into `MapOrchestrator` (constructor or equivalent) and have it rely on `getValidatedConfig()` only as a temporary fallback, if at all.  
2. As part of CIV‑31, refactor `bootstrap/tunables.ts` to build its snapshot directly from a provided `MapGenConfig` (or a bound validated config), keeping the public tunables surface stable while removing dependence on the legacy `getConfig()` path.  
3. When touching bootstrap/runtime tests next, shift expectations to the fail-fast model (`getValidatedConfig()` throws before bootstrap, `hasConfig` gates access) and treat `setConfig`/`getConfig` strictly as deprecated shims.

---

## CIV-30 – Wire MapOrchestrator to Validated Config

**Quick Take**  
Mostly, with notable gaps: `MapOrchestrator` now takes a validated `MapGenConfig` via constructor, fails fast when it’s missing, and all mod entry points pass config from `bootstrap()`. However, the orchestrator still bridges to the tunables/global-style view via side effects, and the existing `requestMapData` tests and top-of-file usage docs still assume the pre-injection constructor shape.

**Intent & Assumptions**  
- Make configuration at the orchestration boundary explicit: `new MapOrchestrator(config, options)` with a validated `MapGenConfig` from `bootstrap()`.  
- Eliminate direct reads from legacy config globals inside `MapOrchestrator`, treating the constructor-injected config as the single source of truth for the pipeline.  
- Keep tunables and world model wiring working for M2, with deeper refactors (tunables as a view on `MapGenConfig`) pushed into CIV‑31 rather than blocking this slice.

**What’s Strong**  
- `packages/mapgen-core/src/MapOrchestrator.ts` now defines `constructor(config: MapGenConfig, options: OrchestratorConfig = {})`, stores `config` on `this.mapGenConfig`, and exposes `getMapGenConfig()` for downstream consumers.  
- The constructor performs a clear fail-fast check for missing/undefined configs and is used consistently from the Swooper entry point (`mods/mod-swooper-maps/src/swooper-desert-mountains.ts`), which now calls `bootstrap(...)` and passes the returned config into `MapOrchestrator`.  
- Direct calls to `getConfig()`/`getValidatedConfig()` were removed from the orchestrator; instead, it owns the config instance and relies on tunables/world-model hooks to derive per-stage views, which aligns with the CIV‑26/CIV‑29 direction.

**High-Leverage Issues**
- ~~**Constructor still has non-obvious side effects into the tunables runtime (CIV‑31 scope).**~~
  ~~`MapOrchestrator`'s constructor calls `setValidatedConfig(config)` and `rebindTunables()` behind the scenes. This keeps M2 working but means the orchestrator is not yet "pure" from the config perspective, and callers can still accidentally rely on "constructor as global-mutator". This bridging is appropriate for M2 but should be explicitly unwound in CIV‑31 when tunables are refactored to derive from injected config rather than hidden module state.~~

  **Update (2025‑12):** The `setValidatedConfig` and `rebindTunables` side effects have been removed from `MapOrchestrator`. The constructor no longer mutates module state. Configuration binding now happens explicitly via `bootstrap() → bindTunables(config)` before the orchestrator is constructed.  
- ~~**Tests still instantiate `MapOrchestrator` with options-shaped arguments, not `(config, options)`.**~~
  ~~`packages/mapgen-core/test/orchestrator/requestMapData.test.ts` still does `new MapOrchestrator({ mapSizeDefaults: { … } })`, which under the new signature is treated as a `MapGenConfig` rather than `OrchestratorConfig`. That means the `mapSizeDefaults` path is never exercised in these tests, and they instead fall back to engine globals and standard defaults. This doesn't block runtime behavior but weakens our guardrails around the new constructor contract; updating these tests to pass a simple dummy `MapGenConfig` plus `{ mapSizeDefaults }` as `options` is a worthwhile follow-up, and can reasonably ride with CIV‑31 or a small CIV‑26 hygiene task.~~

  **Update (2025‑12):** Resolved. Tests in `requestMapData.test.ts` now use `new MapOrchestrator(getDefaultConfig(), { mapSizeDefaults: ... })`. The integration test in `generateMap.integration.test.ts` uses the correct `(config, options)` signature and properly separates EngineAdapter (for layer operations) from the globals-based OrchestratorAdapter (for map-init operations).  
- **Top-of-file usage docs still show the pre-injection constructor.**  
  The header comment in `MapOrchestrator.ts` still advertises `const orchestrator = new MapOrchestrator();` without config, which no longer matches the implementation. This is low-risk but confusing for future entry point authors. It’s an easy cleanup to update the examples to the new pattern (`const config = bootstrap(opts); const orchestrator = new MapOrchestrator(config, options)`), ideally when CIV‑31 touches this file next.

**Fit Within the Milestone**  
CIV‑30 delivers the key boundary shift for M2: the orchestrator is now constructed with a validated `MapGenConfig`, direct global reads are gone from its implementation, and the primary mod entry point has been updated to flow `bootstrap()` → `MapOrchestrator(config, options)`. The remaining reliance on `setValidatedConfig`/tunables and the misaligned tests/docs represent transitional debt rather than blockers and are already conceptually covered by CIV‑31 (tunables refactor) and the broader CIV‑26 config hygiene epic.

**Recommended Next Moves (Future Work, Not M2)**  
1. As part of CIV‑31, move the `setValidatedConfig`/`rebindTunables` behavior out of the orchestrator constructor and into a clearer “bind config to tunables” layer, ideally driven directly from the injected `MapGenConfig`.  
2. Update `requestMapData` tests to use a minimal `MapGenConfig` instance plus an explicit `{ mapSizeDefaults }` `OrchestratorConfig`, so the tests cover the intended override behavior instead of relying on global fallbacks.  
3. Refresh the `MapOrchestrator` header documentation and any in-repo usage snippets to consistently show the “bootstrap → `MapOrchestrator(config, options)`” pattern and discourage resurrecting the old no-arg constructor in future work.

---

## CIV-31 – Refactor Tunables as View over MapGenConfig

**Quick Take**
~~No for M2 as currently implemented: tunables are correctly reoriented around `MapGenConfig` and no longer read `getConfig()`, but the new `resetTunables()` / `getTunables()` interaction introduces a runtime regression in `MapOrchestrator.generateMap` and breaks the stated "works from module state" compatibility story.~~

**Update (2025‑12):** Yes for M2. All blocking issues have been resolved: `resetTunables()` now preserves the bound config (only clears cache), the fail-fast contract is explicit, tests are aligned, and defaults have been consolidated into the schema.

**Intent & Assumptions**  
- Make `buildTunablesFromConfig(config: MapGenConfig)` the canonical builder, operating solely on validated config instead of loosely typed globals.  
- Keep the public tunables surface (`getTunables`, `TUNABLES`, `stageEnabled`) stable so layers and the orchestrator do not need to change in M2.  
- Preserve backward compatibility for existing flows that relied on module-scoped config state, at least through this milestone, while moving defaults into the TypeBox schema where possible.

**What’s Strong**  
- `packages/mapgen-core/src/bootstrap/tunables.ts` now exposes `buildTunablesFromConfig(config: MapGenConfig)` and builds the snapshot from strongly typed config, including the “mod override” merge of top-level layer configs into `foundation` (e.g., `mountains`, `volcanoes`, `biomes`).  
- Tunables no longer call `getConfig()` or rely on global config; `bootstrap()` binds tunables explicitly via `bindTunables(validatedConfig)`, aligning with the CIV‑26 config-hygiene direction.  
- The TypeBox schema carries most primary defaults (toggles, plates, dynamics, landmass, climate) with detailed JSDoc, and the tunables snapshot reuses those structures rather than re-encoding shapes.  
- The public API (`getTunables`, `TUNABLES`, `stageEnabled`) remains intact, so layers and `MapOrchestrator` continue to consume tunables through the same surface.

**High-Leverage Issues**
- ~~**`resetTunables()` clears the bound config, breaking `generateMap()`.**~~
  ~~`resetTunables()` now sets both `_cache` and `_boundConfig` to `null`, while `getTunables()` throws when `_boundConfig` is `null`. `MapOrchestrator.generateMap()` calls `const devTunables = getTunables(); … resetTunables(); const tunables = getTunables();`, so the second call will throw and abort generation in the Swooper `GenerateMap` flow. For a "stable engine slice", this needs to be fixed in CIV‑31: either change `resetTunables()` to clear only `_cache`, or have `generateMap()` immediately re-bind via `bindTunables(this.mapGenConfig)` before subsequent tunables reads.~~

  **Update (2025‑12):** Fixed. `resetTunables()` now clears only `_cache` while preserving `_boundConfig`. A separate `resetTunablesForTest()` function is provided for test isolation that clears both.

- ~~**The "module-state compatibility" contract is now ambiguous and tests are misaligned.**~~
  ~~The CIV‑31 issue text still describes `getTunables()` as working off module state for backward compat, but the implementation only ever consults `_boundConfig`, and test suites (`test/bootstrap/tunables.test.ts`, `test/bootstrap/entry.test.ts`) still rely on `setConfig()` + `rebind()` without `bindTunables()` or `bootstrap()`. We need an explicit decision for M2: either reintroduce a legacy fallback (e.g., when `_boundConfig` is missing, derive a config from `getConfig()` / `getDefaultConfig()`), or formally tighten the contract to "must call `bootstrap()` / `bindTunables()` first" and update tests and docs to match.~~

  **Update (2025‑12):** Resolved. The contract is now explicit: `getTunables()` throws if no config has been bound via `bindTunables()` or `bootstrap()`. There is no legacy fallback to module state. Tests have been updated to use `bootstrap()` or `bindTunables()` and assert the fail-fast behavior.

- ~~**Defaults remain duplicated between schema and tunables without a clearly documented boundary.**~~
  ~~Many defaults (notably plates and dynamics) now live in both `schema.ts` and `tunables.ts` (`DEFAULT_PLATES`, `DEFAULT_DYNAMICS`, etc.). The intent in CIV‑31 is that schema owns primary defaults and tunables use fallbacks for merge behavior, but this split is not obvious from code comments and increases the risk of drift. This is not blocking M2, but a future pass should consolidate what lives in the schema vs. tunables and document that boundary near the `DEFAULT_*` declarations.~~

  **Update (2025‑12):** Consolidated. All `DEFAULT_*` constants have been removed from `tunables.ts`. The schema (`src/config/schema.ts`) is now the single source of truth for all defaults (toggles, plates, dynamics, wind). Tunables reads directly from validated config without re-defaulting. `WorldModel` also no longer re-defaults values; it assumes config has been validated by `parseConfig`.

- ~~**Tests don't cover the new binding path or StageConfig → StageManifest wiring.**~~
  ~~The existing tunables/bootstrap tests primarily exercise legacy patterns rather than the canonical M2 path (`bootstrap()` → `bindTunables` → `MapOrchestrator(config, options)` → `stageEnabled()`). As a result, core behaviors (e.g., stage gating, manifest resolution driven by validated config) aren't pinned by tests, making regressions like the `resetTunables()` bug easy to introduce. This should be addressed under CIV‑23 / CIV‑26 with at least one focused test that proves the end-to-end tunables flow works as expected.~~

  **Update (2025‑12):** Partially addressed. Tests now cover the `bootstrap()` → `bindTunables` → `getTunables()` path and the `stageConfig` → `stageManifest` resolution. Full end-to-end integration tests (bootstrap → orchestrator → generateMap) remain a follow-up for CIV-23.

**Fit Within the Milestone**
~~Structurally, CIV‑31 is an important step toward the desired end state: tunables are now a view over validated `MapGenConfig` with an explicit binding step, which is exactly what the config-hygiene PRD calls for. However, in its current form it does **not** yet meet the "stable engine slice" bar for M2 because `resetTunables()` breaks `MapOrchestrator.generateMap()` and the compatibility story for legacy module-state flows is unresolved. The structural refactor should stand, but we need at least one small code change (reset/binding fix) plus test/contract alignment before we can treat CIV‑31 as complete for this milestone.~~

**Update (2025‑12):** CIV‑31 now meets the "stable engine slice" bar for M2. All blocking issues have been resolved, and the config/tunables flow is clean and well-documented. Tunables are a pure view over validated `MapGenConfig` with explicit fail-fast semantics.

**Recommended Next Moves**
~~1. Fix the `resetTunables()` / `getTunables()` regression as part of CIV‑31 (or an immediate follow-up) so `generateMap()` runs successfully in the Swooper entry path without additional workarounds.~~
~~2. Decide and document the M2-era `getTunables()` contract (legacy module state vs. "must bootstrap"), then update tests and the CIV‑31 issue text accordingly; this is conceptually owned by CIV‑26 but should be resolved while CIV‑31 is still fresh.~~
~~3. In a later config-focused pass (CIV‑26 / M3), consolidate defaults between schema and tunables where possible and add short comments clarifying when tunables-level defaults apply.~~
4. Ensure CIV‑23 (integration tests) or a nearby test task adds at least one end-to-end test that exercises `bootstrap` → tunables binding → `MapOrchestrator` → `stageEnabled()` to guard the new configuration flow going forward.

**Update (2025‑12):** Items 1-3 have been completed. Item 4 (full integration tests) remains a follow-up for CIV-23.

---

## Outcomes / Remaining Work

The following items are **not in scope for this lane** but represent the next logical hygiene steps now that config and tunables are aligned with the schema-based model. These should be turned into new Linear issues for future work.

### Dedicated "current config/tunables behavior" doc

**Outcome:** We aligned the implementation and review docs for config/tunables, but details are still scattered across issues and reviews.

**Follow‑up:** Create a small, dedicated document under `docs/system/` (or `docs/projects/engine-refactor-v1/`) that describes the current end-to-end config flow (`bootstrap → MapGenConfig → tunables → orchestrator → WorldModel`) as the single source of truth for future work.

### Move layers off tunables toward direct config/context

**Outcome:** Tunables now act as a thin view over `MapGenConfig`, and we centralized defaults in the schema, but layers and `WorldModel` still depend on tunables as the main configuration surface.

**Follow‑up:** Introduce a gradual migration plan for layers and `WorldModel` to read directly from `MapGenConfig`/`MapContext` instead of tunables, with tunables remaining as a compatibility/view layer only.

### Strengthen integration tests around config→tunables→orchestrator→WorldModel

**Outcome:** Unit tests cover bootstrap, tunables, and some orchestrator behavior, but we still lack a robust integration test that runs the full `bootstrap → MapOrchestrator(config, options) → generateMap()` flow with a mock adapter and asserts that schema defaults + overrides drive real behavior end-to-end.

**Follow‑up:** Add one or more integration tests under CIV‑23/CIV‑26 to pin the current configuration pipeline and protect against regressions.

### Audit remaining engine-side defaults (currents, diagnostics, etc.)

**Outcome:** We centralized key `WorldModel` defaults (plates, mantle, wind) into the schema, but some engine subsystems (currents, certain diagnostics, possibly other world fields) still embed internal magic numbers.

**Follow‑up:** Audit these remaining defaults and decide which should be surfaced in `MapGenConfig` vs. remain internal constants, to avoid hidden behavior and make tuning more explicit.

### Adapter boundary – EngineAdapter vs. OrchestratorAdapter

~~**Outcome:** The architecture docs (`docs/system/libs/mapgen/architecture.md`, `foundation.md`) describe a single adapter boundary at `MapGenContext.adapter: EngineAdapter`, but the current implementation still uses two adapters in practice: `EngineAdapter` (from `@civ7/adapter`) as the canonical boundary for layers/WorldModel, and an internal `OrchestratorAdapter` inside `MapOrchestrator` that handles Civ7 map-init details (map size lookup, `SetMapInitData`, `GameplayMap`/`GameInfo` wiring). The latter is a transitional bridge, not part of the long-term design.~~

**Update (2025‑12):** The adapter wiring in `MapOrchestrator` has been corrected to remove the accidental conflation between `EngineAdapter` and `OrchestratorAdapter`:

- `MapOrchestrator` now maintains two **explicit, separate** adapter fields:
  - `orchestratorAdapter: OrchestratorAdapter` — for Civ7 map-init operations (map size, `SetMapInitData`, `GameplayMap`/`GameInfo` globals, lake/coast stamping). Always resolved from engine globals via `resolveOrchestratorAdapter()`. **Not configurable via options.**
  - The `EngineAdapter` from `OrchestratorConfig.adapter` is used **only** for layer operations via `createLayerAdapter()` and flows into `ctx.adapter` for terrain/biome/feature operations.

- `OrchestratorConfig.adapter` (typed as `EngineAdapter`) now feeds **only** the engine adapter for layers — it no longer accidentally flows into the orchestrator adapter.

- Tests have been updated to reflect this separation:
  - The integration test stubs the globals (`GameplayMap`, `GameInfo`, `engine.call`, `TerrainBuilder`, `AreaBuilder`) that `resolveOrchestratorAdapter()` reads from, rather than passing orchestrator methods via the `adapter` option.
  - The `requestMapData` tests use `mapSizeDefaults` to bypass orchestrator adapter calls where appropriate.

**Remaining work (future milestone):**

- We are still in a **transitional state** with two adapters. This is intentional tech debt, not an open-ended pattern.
- A future dedicated issue will:
  - Extend `EngineAdapter`/`Civ7Adapter` to cover map-size and map-init semantics.
  - Remove `OrchestratorAdapter` entirely so `MapOrchestrator` depends solely on `EngineAdapter` + `MapGenConfig`/`MapGenContext`.
- This lane intentionally did **not** attempt to collapse the adapter boundary; it only removed the accidental conflation where `OrchestratorConfig.adapter` (typed as `EngineAdapter`) was being assigned to the `OrchestratorAdapter` field.

---

## CIV-35 – Add `MapOrchestrator.generateMap` Smoke Test for Config + Foundation Slice

**Quick Take**  
Mostly satisfied for M2. There is now an end-to-end `MapOrchestrator.generateMap()` smoke test that runs the foundation slice with a stub adapter and validated config and asserts that key foundation data products are populated. The main gap is that this guardrail does **not** run under the repo’s default `pnpm test` (Vitest) pipeline, so it’s easy to miss in CI unless `pnpm test:mapgen` is run explicitly.

**Intent & Assumptions**  
- Add a narrow “foundation slice still works” safety net over the M2 stable slice: config → tunables → orchestrator → foundation data products.  
- Run without the real Civ7 runtime by using a stub `EngineAdapter` and stubbing the orchestrator’s globals-backed adapter surface (`GameplayMap`, `GameInfo`, etc.).  
- Keep assertions smoke-level (presence + basic well-formedness), not behavioral parity.

**What’s Strong**  
- `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts` exercises `generateMap()` with `bootstrap({ stageConfig: { foundation: true } })` and `createMockAdapter()`, and asserts: stage completion + `WorldModel` initialization + non-trivial plate data.  
- Tests explicitly reset tunables and config providers (`resetTunablesForTest()`, `resetConfigProviderForTest()`, `WorldModel.reset()`), which reduces flakiness from module state.  
- `packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts` is a good companion: it pins the canonical bootstrap→tunables→orchestrator flow and documents the “two adapters” reality clearly, including the required globals stubs for `resolveOrchestratorAdapter()`.

**High-Leverage Issues**  
- **Not covered by default `pnpm test` / documented test workflow.**  
  Root `pnpm test` runs Vitest projects from `vitest.config.ts`, and `packages/mapgen-core` is not included. Meanwhile `@swooper/mapgen-core` runs `bun test`, and `docs/system/TESTING.md` still claims Vitest is used “across all workspaces.” Impact: this smoke test may not run in CI or local “standard” test flows, undermining its value. Direction: either (a) add a canonical CI/local command that runs both `pnpm test` and `pnpm test:mapgen`, or (b) bring mapgen-core under the Vitest umbrella (larger change).  
- **Smoke assertions are mostly structural, not semantic.**  
  Length checks and “>1 plate” are good regressions catchers, but they don’t flag NaNs/out-of-range values (e.g., invalid `boundaryCloseness` distributions). Direction (nice-to-have): add 1–2 low-cost invariants (no NaNs, min/max bounds) to improve signal without turning this into a full integration suite.

**Fit Within the Milestone**  
This is aligned with M2’s goal: a stable orchestrator-centric slice with a minimal regression net. The “does it run under our standard test command?” mismatch is more of a milestone-level workflow drift than a local implementation miss, but it directly affects whether this task delivers the intended safety benefit.

**Recommended Next Moves (Future Work, Not M2)**  
1. Update `docs/system/TESTING.md` to accurately reflect the split (`pnpm test` for Vitest projects; `pnpm test:mapgen` for mapgen-core), and ensure CI runs both.  
2. (Optional) Add a tiny semantic invariant or two to the foundation smoke test (NaN/bounds) to increase usefulness without expanding scope.

**Update (2025‑12‑12)**  
- `pnpm test` now runs both `pnpm test:vitest` and `pnpm test:mapgen`; `docs/system/TESTING.md` updated accordingly.  
- Foundation smoke test now asserts key numeric buffers contain finite values (no NaNs/Infinity).

---

## CIV-37 – Wire Foundation Config into WorldModel and Mountains Layer

**Quick Take**  
Mostly satisfied for M2, with a notable “verification gap.” The core wiring is now correct (WorldModel reads `foundation.*` via a bound config provider; mountains consumes `foundation.mountains` via orchestrator wiring), and there is a lightweight unit test asserting the plate-count binding. However, the “less boundary saturation / starts no longer fail” part is not meaningfully test-backed, and the shipped Swooper config still includes multiple legacy/no-op landmass knobs that can mislead future tuning work.

**Intent & Assumptions**  
- Fix the two root causes called out in the issue: missing `WorldModel.setConfigProvider` binding and mountains config not flowing from the Swooper entry config into the TS mountains layer.  
- Enable practical debugging: logs should make it obvious which plate/mountains knobs are being used at runtime.  
- Treat “reduce boundary saturation and unblock start placement” as a behavioral target that should be validated via either (a) deterministic integration smoke tests, or (b) explicit manual verification notes captured in-repo.

**What’s Strong**  
- `packages/mapgen-core/src/MapOrchestrator.ts` binds `setConfigProvider()` exactly where it should: immediately before `WorldModel.init()`, and it resets WorldModel per-generation to avoid stale state.  
- `packages/mapgen-core/src/world/model.ts` now fails fast when no provider is set, which prevents silently falling back to internal defaults (the original regression).  
- Mountains consumption is clean and explicit: `MapOrchestrator` reads `foundationCfg.mountains`, builds a fully defaulted options object, and `layers/mountains.ts` logs both input and effective config when `LOG_MOUNTAINS` is enabled.  
- A focused unit test exists: `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts` asserts that `foundation.plates.count` overrides are reflected in the `[WorldModel] Config …` log line.

**High-Leverage Issues**  
- **The Swooper entry config still includes “tuning knobs” that are currently no-op in the TS pipeline.**  
  In `mods/mod-swooper-maps/src/swooper-desert-mountains.ts`, fields like `landmass.boundaryBias`, `landmass.boundaryShareTarget`, and `landmass.tectonics.{boundaryArcWeight,interiorNoiseWeight}` are present but are not consumed anywhere in `packages/mapgen-core/src` (they appear only in schema). This creates a high risk that future work “tunes” knobs that don’t affect output, and it undermines the issue’s stated goal of reducing boundary saturation. Direction: either remove these from the Swooper config, or explicitly replace them with the real TS-consumed knobs / metrics (and document the mapping).  
- **Acceptance criteria around “key dynamics fields” aren’t directly observable at the WorldModel log boundary.**  
  The new `[WorldModel] Config …` log line prints plate config (and a single directionality field), but it does not print wind/mantle dynamics values. If the goal is “trust but verify” for `foundation.dynamics`, add a small, gated log (or expand the existing log line) so the runtime evidence matches the acceptance checks.  
- **Behavioral outcomes (basins, start placement success) are not pinned by tests.**  
  The current unit test proves wiring for `plates.count` only. It doesn’t assert that mountains thresholds/intensity are applied, nor does it guard against regressions like “0/6 civs placed.” Direction: add one deterministic integration smoke test using a stub adapter that (a) checks `mountainThreshold/hillThreshold/tectonicIntensity` are read from config, and (b) asserts non-zero candidate starts (or at least that placement doesn’t catastrophically fail) for a canonical small map size.

**Fit Within the Milestone**  
This task is aligned with M2’s “stable orchestrator-centric slice” goals: it strengthens the config injection boundary and ensures foundation-derived products can reliably drive downstream layers (mountains, landmass, and story-aware consumers). The remaining gaps are mostly about validation and config-surface clarity, not the core wiring.

**Recommended Next Moves (Future Work, Not M2)**  
1. Remove or clearly mark legacy/no-op landmass knobs from the Swooper shipped config, and update the tuning guidance to reference only TS-consumed fields.  
2. Add a small, explicit runtime log for `foundation.dynamics` (gated) so acceptance checks don’t rely on indirect inference.  
3. Add a deterministic “starts don’t catastrophically fail” smoke test that runs the stable slice through `placement` with a stubbed adapter.

**Update (2025‑12‑12)**  
- Removed legacy/no-op landmass knobs from `mods/mod-swooper-maps/src/swooper-desert-mountains.ts`.  
- `WorldModel` config logs are now gated under `foundation.diagnostics` and include wind/mantle/directionality fields (`LOG_FOUNDATION_PLATES`, `LOG_FOUNDATION_DYNAMICS`).  
- Added a smoke-style wiring test that asserts the effective mountains thresholds/intensity log line when `LOG_MOUNTAINS` is enabled.

---

## CIV-38 – Dev Diagnostics & Stage Executor Logging for Stable Slice

**Quick Take**  
Mostly satisfied for M2, with minor clarity gaps. The stable-slice diagnostics surface is now canonicalized under `foundation.diagnostics`, DEV flags are initialized from that block during `generateMap()`, per-stage executor timing/logging is in place, and the legacy top-level `diagnostics.*` surface is explicitly deprecated/no-op. Remaining concerns are drift/confusion risks rather than functional blockers.

**Intent & Assumptions**  
- Make the M2 “stable slice” observable: promote and validate the existing dev diagnostics flags into schema, wire them into `MapOrchestrator.generateMap()`, and provide stage-level timing logs and consistent stage failure reporting.  
- Treat `foundation.diagnostics` as the canonical M2 diagnostics block; retire or clearly deprecate the old top-level `diagnostics.*` surface.  
- Assume “per-stage logs when diagnostics enabled” is satisfied via `foundation.diagnostics.logTiming` gating stage start/finish logs, per the issue’s implementation notes.

**What’s Strong**  
- `FoundationDiagnosticsConfigSchema` is explicit, camelCase, and documented as the stable M2 diagnostics surface, matching `DevLogConfig` and `initDevFlags()` mapping.  
- `MapOrchestrator.generateMap()` resets DEV state, reads `FOUNDATION_CFG.diagnostics`, auto-enables diagnostics when any other flag is true, and initializes DEV flags for the pass.  
- Stage executor logging is centralized in `runStage()`, emitting start/finish timings (when `logTiming` is enabled), capturing durations, and recording structured `stageResults` with consistent failure prefixes.  
- Foundation diagnostics parity is preserved: summaries/ASCII/histograms/boundary metrics are reachable via DEV flags and no-op cleanly when disabled.  
- Smoke warnings are lightweight and correctly scoped to obviously empty/degenerate outputs (plates, landmass windows, story tags).

**High-Leverage Issues**  
- **Legacy top-level `diagnostics` is still exposed as a normal config knob.**  
  `DiagnosticsConfigSchema` is deprecated/no-op, but `MapGenConfigSchema` still exposes `diagnostics`. This is intentional for back-compat, but the property-level description doesn’t strongly discourage use. Consider marking the `diagnostics` property itself as legacy/no-op (or hiding it from the public schema) to reduce user confusion.  
- **Manual schema↔DEV-flag sync is a drift risk.**  
  `FoundationDiagnosticsConfigSchema` and `DevLogConfig` must be kept in lockstep by hand. A small parity guard (test or build-time assertion) would prevent silent divergence as new flags are added.  
- **Stage failure logging can produce two lines when timing is enabled.**  
  Failures log a `console.error` plus a timing “Failed …” line under `LOG_TIMING`. Not a blocker, but if log noise becomes an issue, consider collapsing to a single failure line.

**Fit Within the Milestone**  
This task lands cleanly inside M2’s scope: it makes the current stable slice debuggable without attempting step-level logging or deeper data-product validation. The remaining legacy exposure feels like an M2 sequencing compromise rather than a local miss.

**Recommended Next Moves (Future Work, Not M2)**  
1. Tighten public schema/docs around legacy top-level `diagnostics` to avoid suggesting it still works.  
2. Add a parity check between `FoundationDiagnosticsConfigSchema` keys and the `DevLogConfig` mapping.  
3. Reuse the `runStage()` prefix/timing pattern when M3 introduces step-level or executor-level logging.

**Update (2025-12)**  
- `MapGenConfigSchema.diagnostics` is now explicitly documented as legacy/no-op to discourage use in M2.  
- Added a compile-time parity guard between `FoundationDiagnosticsConfigSchema` and `DevLogConfig` in `packages/mapgen-core/src/dev/diagnostics-parity.ts`.  
- Stage failure logging now emits a single failure line (with optional timing suffix) even when `LOG_TIMING` is enabled.

---

## CIV-39 – Stable-Slice Story Rainfall Config Surface Alignment (Orogeny Deferred)

**Quick Take**  
Yes for M2. The config surface for the story-driven rainfall knobs that are already meaningful in the stable slice is now typed, defaulted, and consumed via `CLIMATE_CFG` without introducing new story climate behavior. Orogeny belts remain correctly treated as deferred (gated on an external cache that the stable slice does not provide).

**Intent & Assumptions**  
- Promote the already-used `climate.story.rainfall.*` knobs into schema/docs so the validated config matches runtime reads in `layers/climate-engine.ts`.  
- Keep scope constrained to stable-slice reality: knobs that change output today, and no cache shims or new steps for orogeny belts in M2.

**What’s Strong**  
- `packages/mapgen-core/src/config/schema.ts` explicitly models `climate.story.rainfall` with defaults aligned to current stable-slice behavior.  
- `packages/mapgen-core/src/bootstrap/tunables.ts` exposes `CLIMATE_CFG` as a frozen view over validated config (no extra shim layer).  
- `packages/mapgen-core/src/layers/climate-engine.ts` reads these knobs in the right places (rift humidity boost and hotspot microclimates) while leaving orogeny belts gated on `STORY_ENABLE_OROGENY && orogenyCache != null`.

**High-Leverage Issues**  
- **Validation is permissive for “public mod API” knobs.**  
  The stable-slice story rainfall knobs are now typed, but remain broadly permissive (e.g. extra keys and non-sensical numeric values can pass depending on schema settings). Direction: once M3 starts canonicalizing config surfaces, tighten numeric constraints and disallow unknown keys for stable public blocks like `climate.story.rainfall`.

**Fit Within the Milestone**  
This is exactly the sort of “config hygiene + wiring parity” task M2 should include: it closes the gap between “we read these knobs” and “we validate/document these knobs,” without pulling in M3’s task-graph or orogeny-cache architecture.

**Recommended Next Moves (Future Work, Not M2)**  
1. Tighten constraints for `climate.story.rainfall` once the stable public config surface is locked.  
2. Add a small parseConfig→tunables smoke assertion that pins these defaults and overrides to prevent drift.

---

## CIV-36 – Minimal Story Parity (Margins, Hotspots, Rifts)

**Quick Take**  
Mostly satisfied for M2. The TS port of minimal story tagging (margins, hotspot trails, rift valleys) is now present, wired into the stable-slice orchestrator in the correct order, and backed by a deterministic smoke test. Remaining gaps are about purity/forward-compat and optional parity (orogeny), not current behavior.

**Intent & Assumptions**  
- Restore the minimum narrative signals needed for downstream parity by porting continental margins, hotspot trails, and rift valleys into TS and running them in `MapOrchestrator` before climate/biomes/features.  
- Keep behavior close to legacy JS while avoiding pipeline refactors; accept “good enough” heuristics so long as StoryTags/overlays are non-empty and consumer branches re‑engage.  
- Treat orogeny belts as optional for M2 unless low-risk to add.

**What’s Strong**  
- `packages/mapgen-core/src/story/tagging.ts` cleanly ports the three required passes and publishes a margins overlay while hydrating `StoryTags.activeMargin/passiveShelf`.  
- Orchestrator wiring in `storySeed → storyHotspots → storyRifts` preserves legacy ordering and guarantees tags exist before downstream stages.  
- Rift tagging prefers foundation tensors when available and falls back safely to a legacy random march when foundation is off, preventing silent no‑ops.  
- Smoke validation is lightweight and consistent with other stable-slice checks, and `packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts` pins non‑empty tags under deterministic RNG.

**High-Leverage Issues**  
- **Tagging still depends on global tunables/state, making M3 step‑migration harder.**  
  The port reads config via `getTunables()` and mutates global `getStoryTags()`. That’s fine for M2, but it increases coupling and future refactor cost. For M3, prefer passing `{ config, tags }` explicitly (or a thin “step-like” wrapper) so the logic can move into `MapGenStep`s without re‑plumbing globals.  
- **Margins/Hotspots/Rifts heuristics are intentionally simplified; parity risk remains unmeasured.**  
  The row‑scan margins quota and sparse hotspot/rift marches should re‑activate story‑aware branches, but may diverge from legacy distributions on unusual coastlines or map sizes. A small visual/metric regression check (or golden smoke snapshots) would help confirm “minimum parity” beyond non‑emptiness.  
- **Optional orogeny belts remain absent.**  
  Not a blocker for M2 per scope, but if climate or biome parity still depends on orogeny in practice, this should be an explicit early‑M3 follow‑up rather than rediscovered later.

**Fit Within the Milestone**  
This task is a good M2 compromise: it restores story‑driven consumer behavior on the existing orchestrator slice without pulling pipeline/step abstractions forward. The remaining coupling reflects deliberate sequencing for M3 rather than a miss here.

**Recommended Next Moves (Future Work, Not M2)**  
1. Introduce a thin step‑style interface for story tagging so globals can be retired during M3 migration.  
2. Add a minimal regression harness that checks distributions/overlays on a few canonical seeds, not just non‑empty tags.  
3. Decide explicitly whether orogeny belts are still required for downstream parity and schedule the port if so.

**Update (2025‑12)**  
- **Globals coupling:** acknowledged; tracked under `docs/projects/engine-refactor-v1/issues/LOCAL-M3-story-system.md` as part of step/task‑graph migration (no M2 change required).  
- **Regression harness:** added to project backlog in `docs/projects/engine-refactor-v1/triage.md` (“Add minimal story parity regression harness”).  
- **Orogeny belts:** explicitly deferred out of M2 in `docs/projects/engine-refactor-v1/issues/CIV-36-story-parity.md` and `docs/projects/engine-refactor-v1/milestones/M2-stable-engine-slice.md`; backlog entry exists in `docs/projects/engine-refactor-v1/triage.md`.

---

## CIV-33 – Align M2 Project Docs with Implemented Config + Foundation Slice

**Quick Take**  
Yes for M2. The project-level milestone, brief, and status snapshot now consistently describe the actual post‑M2 flow (`bootstrap() → validated MapGenConfig → tunables → MapOrchestrator → FoundationContext`) and explicitly defer generic pipeline primitives (`PipelineExecutor` / `MapGenStep` / `StepRegistry`) to M3+.

**Intent & Assumptions**  
- Align `docs/projects/engine-refactor-v1/` docs to describe the orchestrator-centric M2 slice, not the target Task Graph architecture.  
- Ensure legacy global-config patterns are not described as current behavior.  
- Treat system docs (`docs/system/libs/mapgen/*`) as canonical *target* architecture and avoid turning them into temporal status logs.

**What’s Strong**  
- `docs/projects/engine-refactor-v1/milestones/M2-stable-engine-slice.md` cleanly frames the milestone boundary around the current `MapOrchestrator` slice and calls out pipeline primitives as deferred work.  
- `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md` and `docs/projects/engine-refactor-v1/status.md` match that framing, placing `PipelineExecutor`/steps/registry under M3+ “Ready Next” work.  
- Remaining mentions of `globalThis.__EPIC_MAP_CONFIG__` in project docs/issues are framed as historical or “removed,” rather than implying it is still used today.

**High-Leverage Issues**  
- **Milestone doc still reads “Status: Planned”.**  
  The content reads like an executed milestone definition and post‑mortem boundary note; leaving the status as Planned is confusing for readers using these docs as the system of record. Direction: either update the milestone status to reflect reality, or add a clear “this doc is a living plan; M2 is now complete” callout. (Follow-up)  
- **Some historical `__EPIC_MAP_CONFIG__` mentions remain outside project docs.**  
  Example: `docs/system/mods/swooper-maps/architecture.md` still mentions the global config store. This is not a CIV‑33 blocker (scope is project docs/issues), but it’s a predictable source of confusion until CIV‑40’s “Target vs Current” framing is consistently applied. (Follow-up)

**Fit Within the Milestone**  
This is high‑leverage “close the loop” work for M2: it prevents the docs from promising M3 architecture early and keeps the stable slice definition aligned with what is actually shipped today.

**Recommended Next Moves (Future Work, Not M2)**  
1. As part of CIV‑40, add explicit “Current (post‑M2)” pointers/banners in system docs where they currently read like an implementation guide.  
2. Add a lightweight docs checklist (or `rg`-based guard) to prevent reintroducing “pipeline primitives already wired” language into M2 status/brief docs.

---

## CIV-34 – FoundationContext Contract + Config → Tunables → World-Model Flow Doc

**Quick Take**  
Yes for M2. The `FoundationContext` contract is explicit, grounded in the actual M2 implementation, and centrally documents the config→tunables→orchestrator→world-model flow in a way that M3 work can safely reference without re-deriving intent from code.

**Intent & Assumptions**  
- Deliver an M2 “binding” contract for what `ctx.foundation` guarantees after the foundation stage.  
- Document the canonical “stable slice” wiring (`bootstrap → MapGenConfig → tunables → MapOrchestrator → WorldModel → FoundationContext`).  
- Clarify tunables as a derived, read-only view over validated `MapGenConfig` (not a primary config store).

**What’s Strong**  
- `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` cleanly separates binding guarantees (shape/semantics/invariants) from non-binding planning notes, which reduces future ambiguity.  
- The contract matches the code surfaces that matter for M2 consumers (`createFoundationContext` fail-fast validation; `MapOrchestrator.initializeFoundation` building the snapshot from WorldModel and tunables).  
- Project-level docs already point to the contract (`PROJECT-engine-refactor-v1.md`, `milestones/M2-stable-engine-slice.md`, `triage.md`), which makes it discoverable for M3+.

**High-Leverage Issues**  
- **The contract doc mixes “binding” and “planning” in one file.**  
  This is currently well-labeled, but it is a drift risk as M3 evolves: non-binding content tends to accrete and can blur what is actually guaranteed. Direction: keep Sections 1–5 strict and minimal; consider moving Sections 6–7 into a separate “design notes” doc once M3 starts landing step contracts. (Follow-up)  
- **Typed-array immutability is a convention, not enforced.**  
  The doc correctly warns consumers not to mutate tensor contents; the code freezes the object graph but cannot deep-freeze typed arrays. Direction: add a small “consumer contract” test or lint-style guideline that catches accidental mutation in new steps, once step migration begins. (Nice-to-have)

**Fit Within the Milestone**  
This is the right kind of “stabilize the consumer boundary” work for M2: it codifies the minimum reliable interface (`FoundationContext`) without forcing premature pipeline abstractions. It also cleanly reinforces M2’s sequencing decision that tunables are transitional/view-layer plumbing.

**Recommended Next Moves (Future Work, Not M2)**  
1. Promote the binding portion of the contract into `docs/system/libs/mapgen/` once the `FoundationContext` shape stabilizes across early M3 steps.  
2. Add one small integration check that asserts the contract’s invariants (tensor lengths, nullability rules) across a couple of canonical seeds.

---

## CIV-40 – Clarify MapGen System Docs: Target vs Current (post‑M2)

**Quick Take**  
Mostly satisfied. The canonical MapGen system docs now clearly distinguish **Target** architecture from **Current (post‑M2)** reality, which reduces ongoing confusion while M3/M4 land. The remaining gaps are minor but worth tightening to avoid readers misinterpreting “target step pipeline” text as already implemented.

**Intent & Assumptions**  
- Add prominent “Target vs Current” framing to `docs/system/libs/mapgen/{architecture,foundation,climate}.md`.  
- Keep “Current” guidance short and link-heavy; avoid a full reconciliation against fast-moving M3 details.

**What’s Strong**  
- `docs/system/libs/mapgen/architecture.md` adds an explicit Status block and clearly warns that `PipelineExecutor` / `MapGenStep` / `StepRegistry` are **target**, not universally present today.  
- `docs/system/libs/mapgen/foundation.md` includes a concise “Current implementation (post‑M2)” section and points directly to the binding M2 contract and project snapshot docs.  
- The change improves milestone sequencing hygiene without rewriting the target architecture docs to mirror current code line-by-line.

**High-Leverage Issues**  
- **`docs/system/libs/mapgen/climate.md` “Current implementation (post‑M2)” section doesn’t link to the M2 contract doc.**  
  The task’s acceptance criteria call out linking to the M2 contract + project snapshot docs; climate currently links to snapshots but not `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`. Direction: add that link (or a climate-specific contract if/when it exists) so “what’s wired today” has a single canonical reference path.  
- **Climate doc mixes “current” and “target step pipeline” language in a way that can be misread.**  
  Even with the banner, sections like “The Pipeline … MapGenSteps” and the RFC-style implementation plan are easy to skim as “already wired.” Direction: add explicit “Target pipeline (future)” headings (or move RFC content under a clearly labeled future section) to prevent accidental over-trust by agents and new contributors.

**Fit Within the Milestone**  
This is a good post‑M2 enabling cleanup: it aligns the canonical system docs with M2’s explicit boundary (“orchestrator-centric stable slice now; step/task graph later”) and reduces the chance of future work accidentally assuming M3 primitives already exist.

**Recommended Next Moves (Follow-up)**  
1. Tighten `docs/system/libs/mapgen/climate.md` current-section links and add more explicit “Target vs Current” sectioning around the step-pipeline/RFC content.  
2. Consider mirroring the `architecture.md` “Important: target-only primitives” warning inside `climate.md` where it first introduces `MapGenStep`s.
