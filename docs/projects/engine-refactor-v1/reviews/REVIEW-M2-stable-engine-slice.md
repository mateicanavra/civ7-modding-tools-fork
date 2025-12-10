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
- The loader is not yet the canonical runtime entrypoint: production code still reads config via the legacy global store (`bootstrap/runtime.ts`) and does not call `parseConfig` on input. This is squarely in CIV‑29/30/31 scope but worth calling out so we don’t assume hygiene is “done” just because the loader exists.  
- Tests currently import the loader via its internal path (`../../src/config/loader.js`) instead of the public `config` entrypoint, which slightly weakens guarantees that the exported surface matches what’s tested (low risk given the thin index, but an easy future improvement).  
- Documentation for CIV‑28 refers to `TypeCompiler` while the implementation uses TypeBox’s `Compile` API; functionally correct but mildly confusing when cross-referencing tickets.

**Fit Within the Milestone**  
Together with CIV‑27, this task delivers the backbone of M2’s config hygiene story: a schema-backed, defaulting, and validating loader with clear errors and JSON Schema export. It intentionally stops short of removing globals or rewiring the orchestrator/tunables, which are addressed in later tasks. For M2’s “stable slice” goal, this is an appropriate and complete step.

**Recommended Next Moves (Future Work, Not M2)**  
1. As part of CIV‑29/30/31, route all engine configuration through `parseConfig` and eliminate direct dependence on `globalThis.__EPIC_MAP_CONFIG__` in runtime paths.  
2. Update `loader.test.ts` (or add an integration-style test) to import from `@swooper/mapgen-core/config` to validate the exported surface end to end.  
3. Refresh CIV‑27/CIV‑28 docs to reference the current TypeBox compile API and call out the existence of `getPublicJsonSchema` for public tooling.

**Follow-ups / Checklist**  
- [x] `packages/mapgen-core/src/config/loader.ts` implements `parseConfig`, `safeParseConfig`, `getDefaultConfig`, and `getJsonSchema` on top of `MapGenConfigSchema`.  
- [x] Helpers are re-exported via `packages/mapgen-core/src/config/index.ts` and usable from `@swooper/mapgen-core/config`.  
- [x] Unit tests cover defaults, type/range errors, safe-parse behavior, and the public vs internal JSON Schema guard.  
- [ ] Wire `parseConfig` into orchestrator/tunables and remove reliance on the global config store (CIV‑29/30/31).  
- [ ] Align CIV‑28 documentation and milestone notes with the actual TypeBox compile API and public-schema helper.

---
