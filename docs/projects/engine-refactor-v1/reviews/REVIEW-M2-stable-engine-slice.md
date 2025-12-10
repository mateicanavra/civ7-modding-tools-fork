---
id: M2-stable-engine-slice-review
milestone: M2-stable-engine-slice
title: "M2: Stable Engine Slice – Aggregate Review"
status: draft
reviewer: AI agent (Codex CLI)
---

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

**What’s Strong**  
- `packages/mapgen-core/src/bootstrap/runtime.ts` is rewritten as a module-scoped store (`_validatedConfig`) with `setValidatedConfig`/`getValidatedConfig`/`hasConfig`/`resetConfig`, completely removing `globalThis` from runtime config paths in the engine library.  
- `packages/mapgen-core/src/bootstrap/entry.ts` (and its `dist` counterpart) now build a `rawConfig`, resolve `stageConfig` into a `stageManifest`, validate via `parseConfig(rawConfig)`, store via `setValidatedConfig`, and return the resulting `MapGenConfig`.  
- The public surface remains compatible: `bootstrap(options)` still accepts the same options, `MapConfig` is aliased to `MapGenConfig`, and deprecated `setConfig`/`getConfig` shims exist only as a non-global, strongly-typed compatibility layer.

**High-Leverage Issues (Deferred / Covered Elsewhere)**  
- **Consumption still goes through tunables and legacy getters (CIV‑30/31 scope).**  
  `MapOrchestrator` and most layers still read configuration via `getTunables()` (which in turn calls `getConfig()`), rather than using `getValidatedConfig()` or constructor injection. This is by design for M2: CIV‑30 and CIV‑31 already cover wiring `MapOrchestrator` to `MapGenConfig` and refactoring tunables as a view over validated config. No new issue is needed; we should just verify those tasks close the loop.  
- **Deprecated `setConfig`/`getConfig` remain exported (CIV‑26 / later cleanup).**  
  The deprecated APIs are now safe (no globals) but still visible on the bootstrap entry. They’re clearly marked `@deprecated` and can be treated as transitional. Cleanup/removal is best handled once CIV‑30/31 are complete; this is already conceptually covered by the CIV‑26 parent (“no global config stores” + injected config) and does not require a separate ticket unless we want a dedicated “remove legacy runtime APIs” task.  
- **Tests still reflect the pre-refactor runtime shape (low-risk hygiene).**  
  Some bootstrap/runtime tests still assert the old `getConfig()` semantics (e.g., instance identity, always-present object) instead of focusing on `getValidatedConfig()`/`hasConfig` and the failure mode when called before `bootstrap()`. This doesn’t affect runtime behavior but slightly weakens the guardrails around the new model. It’s reasonable to either:  
  - Update these tests as part of CIV‑30/31 when we touch orchestrator/tunables, or  
  - Treat it as a small follow-up checklist item under CIV‑29/CIV‑26 without filing a dedicated issue.

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
- **Constructor still has non-obvious side effects into the tunables runtime (CIV‑31 scope).**  
  `MapOrchestrator`’s constructor calls `setValidatedConfig(config)` and `rebindTunables()` behind the scenes. This keeps M2 working but means the orchestrator is not yet “pure” from the config perspective, and callers can still accidentally rely on “constructor as global-mutator”. This bridging is appropriate for M2 but should be explicitly unwound in CIV‑31 when tunables are refactored to derive from injected config rather than hidden module state.  
- **Tests still instantiate `MapOrchestrator` with options-shaped arguments, not `(config, options)`.**  
  `packages/mapgen-core/test/orchestrator/requestMapData.test.ts` still does `new MapOrchestrator({ mapSizeDefaults: { … } })`, which under the new signature is treated as a `MapGenConfig` rather than `OrchestratorConfig`. That means the `mapSizeDefaults` path is never exercised in these tests, and they instead fall back to engine globals and standard defaults. This doesn’t block runtime behavior but weakens our guardrails around the new constructor contract; updating these tests to pass a simple dummy `MapGenConfig` plus `{ mapSizeDefaults }` as `options` is a worthwhile follow-up, and can reasonably ride with CIV‑31 or a small CIV‑26 hygiene task.  
- **Top-of-file usage docs still show the pre-injection constructor.**  
  The header comment in `MapOrchestrator.ts` still advertises `const orchestrator = new MapOrchestrator();` without config, which no longer matches the implementation. This is low-risk but confusing for future entry point authors. It’s an easy cleanup to update the examples to the new pattern (`const config = bootstrap(opts); const orchestrator = new MapOrchestrator(config, options)`), ideally when CIV‑31 touches this file next.

**Fit Within the Milestone**  
CIV‑30 delivers the key boundary shift for M2: the orchestrator is now constructed with a validated `MapGenConfig`, direct global reads are gone from its implementation, and the primary mod entry point has been updated to flow `bootstrap()` → `MapOrchestrator(config, options)`. The remaining reliance on `setValidatedConfig`/tunables and the misaligned tests/docs represent transitional debt rather than blockers and are already conceptually covered by CIV‑31 (tunables refactor) and the broader CIV‑26 config hygiene epic.

**Recommended Next Moves (Future Work, Not M2)**  
1. As part of CIV‑31, move the `setValidatedConfig`/`rebindTunables` behavior out of the orchestrator constructor and into a clearer “bind config to tunables” layer, ideally driven directly from the injected `MapGenConfig`.  
2. Update `requestMapData` tests to use a minimal `MapGenConfig` instance plus an explicit `{ mapSizeDefaults }` `OrchestratorConfig`, so the tests cover the intended override behavior instead of relying on global fallbacks.  
3. Refresh the `MapOrchestrator` header documentation and any in-repo usage snippets to consistently show the “bootstrap → `MapOrchestrator(config, options)`” pattern and discourage resurrecting the old no-arg constructor in future work.
