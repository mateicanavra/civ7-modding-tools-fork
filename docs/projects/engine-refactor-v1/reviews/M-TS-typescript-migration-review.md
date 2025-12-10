# M-TS: TypeScript Migration – Review Log

**Milestone:** `M-TS-typescript-migration`  
**Scope:** Refactor Swooper Maps engine from JavaScript to TypeScript (Stack A/B/C/D).  
**Purpose:** Central place to record code-level reviews for each issue in this milestone as work lands in the repo.

> Conventions:
> - Keep entries short and focused on *what exists in the repo* vs. what the plan anticipated.
> - Capture: implementation summary, alignment with plan, notable drifts/risks, and concrete follow-ups.
> - Append new entries/sections as additional issues in this milestone are implemented.

---

## Architectural Questions & Coupling Notes

This section tracks cross-cutting architectural concerns and coupling points observed so far across CIV‑5 (world/Voronoi migration), CIV‑6 (bootstrap refactor), CIV‑7 (orchestrator & layers), and future issues. The intent is to revisit these items as the TS migration settles and before deeper refactors.

### World config vs. bootstrap config duplication

- Bootstrap defines `FoundationPlatesConfig` / `FoundationDynamicsConfig` / `FoundationDirectionalityConfig` in `packages/mapgen-core/src/bootstrap/types.ts`, while the world module defines `PlateConfig` / `DirectionalityConfig` in `packages/mapgen-core/src/world/types.ts`.
- Today these shapes are intentionally aligned but maintained separately. This duplication is easy to drift over time (e.g., adding a new plate parameter in one place only).
- Likely follow-up:
  - Introduce an explicit mapping function or adapter (`foundationPlatesToPlateConfig`, `foundationDynamicsToWorldConfig`) so only one side is treated as the source of truth.
  - Document which config type is canonical for plates/dynamics and which layer is responsible for mapping.

### WorldModel config provider and bootstrap ownership

- `WorldModel` uses an internal `setConfigProvider` / `getConfig()` pattern to retrieve its configuration snapshot at runtime, while bootstrap manages `MapConfig` and foundation config independently through `runtime.ts` and `tunables.ts`.
- Currently, `MapOrchestrator.initializeFoundation` passes a normalized foundation config into `createFoundationContext`, but the code does not make it explicit which layer “owns” the config provider that `WorldModel` reads from (and when it is set).
- Questions to clarify:
  - Should bootstrap be the single owner of world configuration, wiring a provider into `WorldModel` explicitly?
  - Or should `WorldModel` own its own config source, with bootstrap only providing an optional overlay?
  - How do we guarantee world config and bootstrap config stay in sync when presets/overrides change?

### Direct `WorldModel` imports from layers

- Several layers (`landmass-plate`, `mountains`, `coastlines`, `volcanoes`, `climate-engine`, and utilities) import and access the `WorldModel` singleton directly rather than consuming `ctx.worldModel` / `FoundationContext` exclusively.
- This pattern works today but has tradeoffs:
  - Makes layers harder to test in isolation with a fake world model; tests must either initialize the real `WorldModel` or reach in and patch its fields.
  - Tightens coupling between layers and the concrete world implementation, which complicates any future change to world representation (e.g., multiple world snapshots or alternative world models).
- Potential longer-term direction:
  - Prefer passing a typed `WorldModelState` (from `ctx.worldModel` or `FoundationContext`) into layers instead of having them import `WorldModel` directly.
  - Keep `WorldModel` as the place that populates and publishes state, but treat it as a provider of immutable snapshots rather than a global singleton that layers reach into.

### Voronoi implementation strategy

- The TS implementation in `world/plates.ts` introduces `DefaultVoronoiUtils` and a self-contained Voronoi pipeline (`computePlatesVoronoi`, `calculateVoronoiCells`) that does *not* currently call Civ7’s `/base-standard/voronoi-utils.js` or kd‑tree utilities directly.
- Earlier docs and JS implementations referenced a design where CIV7’s Voronoi utilities and kd‑tree were wrapped; now the world module uses its own simplified Voronoi abstraction, with room to plug in an external implementation via `VoronoiUtilsInterface`.
- Strategic questions:
  - Is the long-term goal a fully self-contained TS Voronoi solution (with `DefaultVoronoiUtils` evolving into the canonical implementation), or a thin adapter around Civ7’s voronoi/kd‑tree stack?
  - If an adapter is preferred, where should it live?
    - In `@civ7/adapter` (as part of the Civ7 integration boundary), or
    - In the world module, using an injected `VoronoiUtilsInterface` implementation backed by `/base-standard/...` in production and `DefaultVoronoiUtils` in tests.
  - How much fidelity vs. independence is desired for plate generation when compared to the base game?

### Lifecycle and reset semantics (bootstrap, world, orchestrator)

- Several components participate in per-map lifecycle and reset behavior:
  - `bootstrap/runtime.ts` (`setConfig`, `getConfig`, `resetConfig`).
  - `bootstrap/tunables.ts` (`getTunables`, `resetTunables`, `rebind`).
  - `world/model.ts` (`WorldModel.init`, `WorldModel.reset`).
  - `MapOrchestrator.generateMap`, which currently calls `resetTunables()` and `getTunables()` each run but does not explicitly call `resetBootstrap()` or `WorldModel.reset()`.
- Observations:
  - For game runtime, keeping some state across runs may be acceptable; for tests and multi-run diagnostics, explicit resets are useful to avoid subtle carry-over.
  - Gates A/B/C tests already rely on explicit `reset*()` calls (e.g., bootstrap tests call `resetBootstrap()` in `beforeEach`).
- Open design questions:
  - Should `generateMap()` call `resetBootstrap()` and/or `WorldModel.reset()` to guarantee a clean foundation per run, or is that the responsibility of the entrypoint/mod?
  - What is the authoritative sequence for “reset → bootstrap → rebind → initialize world → run stages” that tests and runtime should follow?
  - Would it be beneficial to centralize lifecycle management in a small helper (e.g., a `GenerationSession` abstraction) to avoid scattered reset calls?

This section should be updated as later issues (CIV‑6, CIV‑7, CIV‑8, CIV‑9) are reviewed, capturing any new cross-cutting patterns or concerns that emerge.

---

## Stack A – Infrastructure & Gate A

### CIV‑1 – Scaffold Type Foundation (`@civ7/types`)

**Review date:** 2025‑12‑06  
**Reviewer:** AI agent (Codex CLI)  
**Status (implementation):** Initial package in place; broadly aligned with plan.

#### Summary of implementation

- `packages/civ7-types` exists with `package.json`, `tsconfig.json`, and a single ambient declaration file at `packages/civ7-types/index.d.ts`.
- `index.d.ts` declares:
  - `GameplayMap` with the full set of methods used across `mods/mod-swooper-maps/mod/maps/**/*` (grid size, terrain/feature/resource reads, rainfall/temperature, latitudes, continent/area queries, adjacency predicates, radius/indices helpers, RNG).
  - `TerrainBuilder`, `AreaBuilder`, `FractalBuilder` covering setters, plot tags, validation, RNG, major map-building phases, Poisson map helpers, and `getHeightFromPercent`.
  - `GameInfo` with strongly typed tables (`Maps`, `Terrains`, `Biomes`, `Features`, `Resources`, `Ages`, `Civilizations`, `Leaders`, `FeatureClasses`, `Feature_NaturalWonders`, all `StartBias*`, `Resource_Distribution`, `MapResourceMinimumAmountModifier`, `MapIslandBehavior`, `DiscoverySiftingImprovements`, `GlobalParameters`, `AdvancedStartParameters`, `NarrativeStories`, `Unit_ShadowReplacements`) plus a generic table indexer.
  - Other globals: `engine`, `Configuration`, `Players`, `Game`, `Database`, `PlotTags`, `FeatureTypes`, and `console`.
- Virtual modules for `/base-standard/...`:
  - Explicit declarations for `map-utilities.js`, `assign-starting-plots.js`, `elevation-terrain-generator.js`, `map-globals.js`, `feature-biome-generator.js`, `resource-generator.js`, `continents.js`, `voronoi-region.js`, `kd-tree.js`, `random-pcg-32.js`.
  - A catch-all `declare module "/base-standard/*"` for rapid migration.
- `tsconfig.json` extends the monorepo base, uses `noEmit: true`, and includes only `*.d.ts`.  
  `pnpm -C packages/civ7-types check` passes.

#### Alignment with plan

- The core deliverables of CIV‑1 are satisfied:
  - Dedicated package with workspace wiring.
  - Ambient declarations for Civ7 globals.
  - Virtual module typing for `/base-standard/...` imports, plus a catch-all.
  - Type-checking via `tsc --noEmit` is already wired and passing.
- Coverage of `GameplayMap`, `TerrainBuilder`, and `GameInfo` tables matches the inventory described in the issue and `migrate-to-ts-plan.md`.

#### Notable gaps / risks

- `Players` is under-typed relative to actual usage in existing JS:
  - Current JS uses members like `getAlive`, `getAliveIds`, `getAliveMajorIds`, `getEverAlive`, `length`, `isHuman`, `isAI`, `push`, etc.
  - The type currently exposes only `get(playerId)` plus `AdvancedStart.get`.
  - When base-standard scripts or Swooper JS are migrated to TS, this will produce avoidable TS noise unless the surface is expanded or loosened.
- `GameInfoTable.lookup` returns `T | null` (good for correctness), but current JS treats lookups as non-null:
  - Ported call sites will need optional chaining or non-null assertions.
  - This is acceptable but should be anticipated as a migration-time task.
- `Game`, `Configuration`, and other globals are narrowly typed:
  - They cover present usages but may need either additional members or generic indexers as more logic moves to TS.

#### Suggested follow-ups

- Expand or relax `Players` typing before heavy migration:
  - Either:
    - Add explicit members (`getAlive`, `getAliveIds`, `getAliveMajorIds`, `getEverAlive`, `length`, `isHuman`, `isAI`, etc.), or
    - Provide an escape hatch (`const Players: any` or `[key: string]: any`) until the full surface is known.
- Decide on a consistent pattern for `GameInfoTable.lookup` in migrated code:
  - Either prefer optional chaining/guards, or standardize on non-null assertions where the schema guarantees a row.
- Optionally add minimal documentation in `packages/civ7-types/README` (or in project docs) describing how/when to extend these typings as new engine APIs are used.

---

### CIV‑2 – Create Centralized Adapter (`@civ7/adapter`)

**Review date:** 2025‑12‑06  
**Reviewer:** AI agent (Codex CLI)  
**Status (implementation):** Implemented and building; adapter boundary enforced in code.

#### Summary of implementation

- `packages/civ7-adapter` exists with:
  - `package.json` exporting:
    - `.` → `dist/index.js` / `index.d.ts` (types + mock adapter).
    - `./civ7` → `dist/civ7-adapter.js` / `civ7-adapter.d.ts`.
    - `./mock` → `dist/mock-adapter.js` / `mock-adapter.d.ts`.
  - `tsconfig.json` configured for ESM, `moduleResolution: "Bundler"`, `types: ["@civ7/types"]`, and `noEmit: true`.
  - `tsup.config.ts` with:
    - Entrypoints: `src/index.ts`, `src/civ7-adapter.ts`, `src/mock-adapter.ts`.
    - `external: [/^\/base-standard\/.*/]` so Civ7 runtime paths stay external.
    - `noExternal: ["@civ7/types"]` so type declarations are bundled where needed.
- `src/types.ts` defines:
  - `FeatureData`, `MapDimensions`.
  - `EngineAdapter`: a TS interface mirroring the existing JS `CivEngineAdapter` surface (terrain and feature reads/writes, RNG, fractal helpers, validation passes).
  - `MapContext` with `{ dimensions, adapter, config }`.
- `src/civ7-adapter.ts`:
  - Uses `/// <reference types="@civ7/types" />`.
  - Imports `/base-standard/maps/map-globals.js` (and no other `/base-standard/...` modules).
  - Implements `Civ7Adapter` by delegating to `GameplayMap`, `TerrainBuilder`, `AreaBuilder`, `FractalBuilder`.
  - Exposes `createCiv7Adapter()` which reads map dimensions from `GameplayMap`.
- `src/mock-adapter.ts`:
  - Implements `EngineAdapter` with in-memory grids and masks.
  - No `/base-standard/...` imports; safe for use in tests.
- `src/index.ts`:
  - Re-exports `EngineAdapter`, `FeatureData`, `MapDimensions`, `MapContext`.
  - Re-exports `MockAdapter` and `createMockAdapter`.
  - Intentionally does *not* export `Civ7Adapter` to make production usage explicit via `@civ7/adapter/civ7`.
- `pnpm -C packages/civ7-adapter check` and `build` both pass; `dist/civ7-adapter.js` retains the `/base-standard/maps/map-globals.js` import as expected, and other bundles have no `/base-standard` strings.

#### Alignment with plan

- CIV‑2’s core goals are met:
  - Single package owns all `/base-standard/...` imports (within `packages/`).
  - Adapter interface (`EngineAdapter`) matches the existing JS surface.
  - Real and mock adapters are implemented with clear entry points.
  - `tsup` keeps `/base-standard/...` external and bundles workspace dependencies.
- The intended adapter boundary holds:
  - `rg "/base-standard/" packages/ --glob '!**/civ7-adapter/**' --glob '!**/*.d.ts'` yields only a comment in `packages/mapgen-core/tsup.config.ts`, no imports.

#### Notable drifts / decisions

- Entry point strategy differs slightly from the CIV‑2 issue text:
  - `@civ7/adapter` exports only types and the mock adapter.
  - `@civ7/adapter/civ7` exports the production `Civ7Adapter` and `createCiv7Adapter`.
  - This is a *safer* design than exposing the Civ7 adapter through `.`, but the docs/issues still describe “export both adapters with clear entry points” without this nuance.
- Adapter boundary check is not yet codified as a script:
  - The grep pattern assumed in CIV‑2 would currently flag the comment in `mapgen-core/tsup.config.ts` unless comments/configs are explicitly excluded.

#### Suggested follow-ups

- Update project docs (see below) to:
  - Document the `@civ7/adapter` API surface and the distinction between `.` vs. `./civ7` vs. `./mock`.
  - Clarify that only `@civ7/adapter/civ7` should be used in production mod code.
- Add a small “adapter boundary” script, e.g.:
  - `pnpm lint:base-standard` which runs a grep restricted to `packages/**` and excluding config/test files, enforcing:
    - No `/base-standard/...` imports outside `packages/civ7-adapter/**`.

---

### CIV‑3 – Initialize MapGen Core Library (`@swooper/mapgen-core`)

**Review date:** 2025‑12‑06  
**Reviewer:** AI agent (Codex CLI)  
**Status (implementation):** Scaffold complete; smoke tests in place; logic still placeholder (as expected for Stack A).

#### Summary of implementation

- `packages/mapgen-core` exists with:
  - `package.json`:
    - Name `@swooper/mapgen-core`, ESM output, and `exports` for `.`, `./bootstrap`, `./world`, `./layers`.
    - `scripts`: `build` (tsup), `test` (bun test), `check` (tsc --noEmit).
    - `dependencies`: both `@civ7/types` *and* `@civ7/adapter`.
    - `devDependencies`: `bun-types`, `tsup`, `typescript`.
  - `tsconfig.json`:
    - `outDir: "./dist"`, `rootDir: "./src"`, `declaration: true`, `noEmit: true`.
    - `moduleResolution: "Bundler"`, `types: ["@civ7/types", "bun-types"]`.
  - `tsup.config.ts`:
    - Entrypoints: `src/index.ts`, `src/bootstrap/entry.ts`, `src/world/index.ts`, `src/layers/index.ts`.
    - `external: [/^\/base-standard\/.*/]`.
    - `noExternal: ["@civ7/types", "@civ7/adapter"]` (bundles adapter/types into consumers).
  - `bunfig.toml` preloading `test/setup.ts`.
- `src/index.ts`:
  - Re-exports `EngineAdapter` and `MapContext` from `@civ7/adapter`.
  - Re-exports `bootstrap`, `*` from `world`, `*` from `layers`, and `*` from `core`.
  - Declares a package `VERSION = "0.1.0"`.
- `src/core/index.ts`: pure utilities (`idx`, `inBounds`, `clamp`, `lerp`, `wrapX`), no globals.
- `src/bootstrap/entry.ts`:
  - Defines `BootstrapConfig` (stage flags and generic `overrides`).
  - `bootstrap(config)` logs a message and performs no other work (Gate A placeholder).
  - `resetBootstrap()` is a stub (to be filled in when CIV‑6 implements lazy providers).
- `src/world/index.ts` and `src/layers/index.ts`:
  - Export version constants and stub functions, logging calls but no global dependencies.
- Test infrastructure:
  - `test/setup.ts` mocks `engine`, `GameplayMap`, `TerrainBuilder`, `AreaBuilder`, `FractalBuilder`, `GameInfo`, `Configuration`, `Players`, `Game`, `Database`, `PlotTags`, `FeatureTypes`, and `console`.
  - `test/smoke.test.ts` verifies:
    - Global mocks are present.
    - `GameInfo` behaves as expected for `Maps.lookup`.
    - `TerrainBuilder.getRandomNumber` exists.
    - `createMockAdapter()` from `@civ7/adapter` behaves correctly (dimensions, terrain state, RNG).
  - `pnpm -C packages/mapgen-core check`, `build`, and `test` all pass; `bun test` runtime ~70ms.

#### Alignment with plan

- CIV‑3’s acceptance criteria are satisfied:
  - Package compiles and builds via tsup.
  - `bun test` runs and passes a smoke suite with Civ7 mocks.
  - Exports for `.`, `./bootstrap`, `./world`, `./layers` are wired and compiled.
  - `@civ7/types` and `@civ7/adapter` are bundled into the built artifacts as intended.
- Core remains “pure TS”:
  - No `GameplayMap`/`TerrainBuilder`/`GameInfo` usage in `src/**/*`.
  - All engine access is expected to go through `EngineAdapter` once logic migrates.

#### Notable drifts / decisions

- Dependency set differs slightly from the initial design table:
  - Plan listed only `@civ7/types` as a dependency; implementation correctly adds `@civ7/adapter` as well (reflecting the adapter boundary decision).
  - `migrate-to-ts-plan.md` and related docs still reference the older dependency set.
- Tooling:
  - Plan called out Bun as preferred for test/build and noted a “bridge script” from pnpm.
  - Implementation aligns with this:
    - Root scripts `test:mapgen` and `build:mapgen` delegate to `pnpm -C packages/mapgen-core`.
    - `packages/mapgen-core` uses Bun only inside its own package scripts.

#### Suggested follow-ups

- Update project docs to:
  - Reflect that `@swooper/mapgen-core` now depends on both `@civ7/types` and `@civ7/adapter`.
  - Document the root convenience scripts:
    - `pnpm test:mapgen` (bun test via pnpm).
    - `pnpm build:mapgen`.
- As logic migrates in CIV‑5/CIV‑6/CIV‑7:
  - Start using `MapContext` and `EngineAdapter` in `world`/`layers` rather than touching globals.
  - Implement `resetBootstrap()` and lazy providers in `bootstrap` to satisfy Gate B expectations.

---

### CIV‑4 – Validate Build Pipeline (Gate A)

**Review date:** 2025‑12‑06  
**Reviewer:** AI agent (Codex CLI)  
**Status (implementation):** Gate A wrapper implemented and tested in-game; behavior slightly diverges from original issue text but satisfies the intent.

#### Summary of implementation

- `mods/mod-swooper-maps` now has:
  - `package.json`:
    - `scripts`:
      - `build`: `tsup` (Node/tsup build rather than Bun).
      - `check`: `tsc --noEmit`.
      - `deploy`: `pnpm run build && pnpm exec civ7 mod manage deploy`.
    - `dependencies`: `@swooper/mapgen-core`, `@civ7/adapter`.
    - `devDependencies`: `@civ7/types`, `tsup`, `typescript`.
  - `tsconfig.json`:
    - Extends `../../tsconfig.base.json`, `rootDir: "./src"`, `outDir: "./mod/maps"`, `moduleResolution: "Bundler"`, `types: ["@civ7/types"]`, `noEmit: true`.
  - `tsup.config.ts`:
    - Entry: `src/gate-a-continents.ts`.
    - `outDir: "mod/maps"`, `bundle: true`, `clean: false`.
    - `external: [/^\/base-standard\/.*/]`.
    - `noExternal: ["@swooper/mapgen-core", "@civ7/adapter"]`.
- `src/gate-a-continents.ts`:
  - `/// <reference types="@civ7/types" />`.
  - `import "/base-standard/maps/continents.js";` to delegate actual map generation to the base-standard Continents script.
  - `import { VERSION } from "@swooper/mapgen-core";`.
  - `import type { EngineAdapter } from "@civ7/adapter";` for compile-time verification only.
  - Logs:
    - `[Swooper] Gate A Wrapper Loaded - TypeScript Build Pipeline Working`.
    - `[Swooper] mapgen-core version: ${VERSION}`.
- Built output `mod/maps/gate-a-continents.js`:
  - Starts with `import "/base-standard/maps/continents.js";`.
  - Inlines `VERSION = "0.1.0";`.
  - Contains only the two log lines; no references to `@swooper/mapgen-core` or `@civ7/adapter` remain.
- Mod configuration and text:
  - `mod/config/config.xml`:
    - Base map row still references `{swooper-maps}/maps/swooper-desert-mountains.js`.
    - Adds a dedicated Gate A row for `{swooper-maps}/maps/gate-a-continents.js`.
  - `mod/text/en_us/MapText.xml`:
    - Adds name/description for `LOC_MAP_GATE_A_CONTINENTS_*` explaining that it is a TypeScript pipeline validation map.
- `pnpm -C mods/mod-swooper-maps check` and `build` both pass.  
  The new map has also been manually tested in-game and confirmed to load and log as expected.

#### Alignment with plan

- Gate A proves the end-to-end pipeline:
  - TS entrypoint compiles successfully with types from `@civ7/types`.
  - `tsup` produces a single ESM file with `/base-standard/...` imports preserved as externals.
  - `@swooper/mapgen-core` is force-bundled (its `VERSION` constant appears inline; there are no remaining imports from the package in the output).
  - `@civ7/adapter` is configured as `noExternal`, ready to be bundled as soon as the mod imports it.
  - Game loads the mod entry and delegates to the base-standard Continents script without “module not found” errors.
- The spirit of CIV‑4 is satisfied: the TS toolchain and bundling behavior are verified in the real game.

#### Notable drifts / decisions

- Entry point choice:
  - CIV‑4 originally called for `src/swooper-desert-mountains.ts` as the TS Gate A wrapper.
  - Implementation instead adds a *separate* `gate-a-continents` entry while leaving `swooper-desert-mountains.js` as the existing JS implementation.
  - This is operationally safer (keeps the original map intact) but diverges from the “single entry” plan and means some acceptance checks in the issue (which mention `swooper-desert-mountains.js`) should conceptually be applied to `gate-a-continents.js` instead.
- Tooling:
  - Plan hinted at Bun for mod builds (via a root bridge script).
  - Implementation uses Node/tsup directly for `mods/mod-swooper-maps` while still using Bun for `@swooper/mapgen-core` tests; this is a reasonable compromise but should be reflected in docs.
- Adapter bundling:
  - CIV‑4 acceptance criteria included verifying that `@civ7/adapter` is inlined and not imported in the final bundle.
  - The current Gate A entry does not import `@civ7/adapter` at runtime at all, so that criterion is not exercised yet (but is correctly configured via `noExternal`).

#### Suggested follow-ups

- Update CIV‑4 and the milestone docs to:
  - Note that Gate A is implemented as a dedicated `gate-a-continents` entry rather than wiring TS directly into `swooper-desert-mountains`.
  - Clarify the build tooling split:
    - `@swooper/mapgen-core`: Bun + pnpm bridge scripts.
    - `mods/mod-swooper-maps`: tsup/Node for now.
- When CIV‑7/CIV‑13 migrate the main orchestrator:
  - Switch `swooper-desert-mountains` to a TS entry that imports `@swooper/mapgen-core` and uses `@civ7/adapter`.
  - Re-run the CIV‑4 style checks to ensure `@civ7/adapter` is actually inlined in the main map entry bundle.

---

## Stack B – Gate B (Testability)

### CIV‑5 – Migrate World/Voronoi Logic (`@swooper/mapgen-core/world`)

**Review date:** 2025‑12‑07
**Reviewer:** AI agent (Claude Code)
**Commit:** `cdb1eb30` ("feat(mapgen-core): migrate Voronoi/World logic to TypeScript (CIV-5)")
**PR:** [#40](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/40)
**Status (implementation):** Implemented; Gate B goals met, with a few intentional drifts from the original JS and plan text.

#### Summary of implementation

- New TypeScript world module under `packages/mapgen-core/src/world`:
  - `model.ts` implements a `WorldModel` singleton backed by a typed `WorldModelState` (`types.ts`), with fields for plates, dynamics (winds/currents/pressure), and diagnostics (`plateSeed`, `boundaryTree` placeholder).
  - `plates.ts` contains the Voronoi/plate generation pipeline (`computePlatesVoronoi`) plus a simplified acceptance-criteria wrapper `calculateVoronoiCells`.
  - `plate-seed.ts` implements `PlateSeedManager` as a pure TS seed controller that optionally integrates with a global `RandomImpl` when present.
  - `index.ts` re‑exports types, `PlateSeedManager`, `computePlatesVoronoi`, `calculateVoronoiCells`, `WorldModel`, and `WORLD_MODULE_VERSION`.
- Package exports:
  - `packages/mapgen-core/package.json` exposes the world subpath via `exports["./world"]` pointing at `dist/world/index.{js,d.ts}`.
  - `dist/world/index.d.ts` surfaces exactly the expected API (`WorldModel`, `PlateSeedManager`, `computePlatesVoronoi`, `calculateVoronoiCells`, types, and `WORLD_MODULE_VERSION`).
- Tests in `packages/mapgen-core/test/world`:
  - `voronoi.test.ts` exercises `calculateVoronoiCells` (count, coordinate ranges, deterministic vs. different seeds) and `computePlatesVoronoi` (array sizes, plate assignment, boundary presence, interior stability, metadata).
  - `plates.test.ts` focuses on boundary typing, closeness gradients, tectonic potentials, movement vectors, and boundary statistics.
  - `plate-seed.test.ts` validates `PlateSeedManager.capture/finalize` behavior (modes, offsets, timestamps, freezing, config/seed location merging).
- Testability:
  - `bun test --filter world` passes: **38 tests** across 3 files with **48,504 expect() calls** in ~164ms.
  - Full `bun test` for `mapgen-core`: **149 tests** pass in ~175ms, confirming the world logic coexists cleanly with bootstrap, core, and story tests.
  - No dependence on Civ7 engine—tests use injected deterministic RNGs.

#### Alignment with plan and acceptance criteria

- “Port world logic to TS”:
  - All of the JS world responsibilities (`model`, plate solve, seed management) are represented in TS in `src/world/*.ts`, with typed arrays and metadata.
  - The TS `WorldModel` keeps a singleton‑style API (`init`, `isEnabled`, getters) aligned with how layers and the orchestrator consume it (e.g., `MapOrchestrator`, `layers/*`, and the built Swooper chunk all read `WorldModel.*` arrays).
- Tests and performance:
  - The three planned test files exist and are non‑trivial; they assert structural and physical invariants rather than “smoke only” behavior.
  - Gate B’s core intent (“prove we can test complex algorithms outside the game”) is satisfied: plate generation, boundary physics, and seed behavior all run under Bun with deterministic local RNGs and no engine mocks.
  - Timings are close to the <100ms target but not under it on this machine; for the current scale and breadth of assertions, ~200ms is still acceptable for Gate B.
- API surface and exports:
  - `@swooper/mapgen-core/world` is a real subpath export and is exercised indirectly via tests importing `../../src/world/index.js` and `../../src/world/plates.js`.
  - `WorldModelState`, `PlateConfig`, `DirectionalityConfig`, `PlateGenerationResult`, `SeedSnapshot`, etc. are all explicitly typed in `types.ts`, satisfying the “type all tensor structures” goal.
- Globals and purity:
  - `computePlatesVoronoi` and `PlateSeedManager` are written to accept injected `voronoiUtils`, `rng`, and config; tests always inject their own RNG, so there are no runtime global requirements.
  - `WorldModel.init` is parameterized (`InitOptions` allows `width`, `height`, `rng`, `isWater`, `getLatitude`, `plateOptions`), so callers can avoid game globals in tests. When options are absent, it conditionally uses `globalThis.GameplayMap` and `globalThis.TerrainBuilder` with defensive checks.

#### Notable drifts / risks

- Legacy JS world files at the CIV‑5 point in history:
  - In commit `cdb1eb30` (CIV‑5 branch), the original JS files under `mods/mod-swooper-maps/mod/maps/world/*.js` still exist and remain the live implementation used by the mod.
  - Later commits (e.g., `2d18b926` / `80ffbb52`) remove these legacy JS sources once the orchestrator and layers are migrated, so the final end state has a single TS source of truth. This is acceptable for the staged migration, but it means CIV‑5 by itself did not fully remove the JS world implementation.
- Voronoi implementation fidelity:
  - The TS implementation introduces a `DefaultVoronoiUtils` that generates deterministic “sites” and “cells” but does *not* call Civ7’s `/base-standard/voronoi-utils.js`, `PlateRegion`, or `kdTree` as the older JS did.
  - `computeVoronoi` returns trivial cells with empty halfedges, and `calculateCellArea` returns a constant. This is sufficient for the current plate assignment and boundary field calculations (which only use seed positions and BFS over a hex grid), but it diverges from the documented design that referenced Civ’s full Voronoi utilities and kd‑tree based boundary indexing.
  - If the long‑term goal is bit‑level parity with the Civ7 Voronoi solve, this abstraction should eventually be backed by a real adapter implementation, not just the fallback.
- WorldModel test coverage:
  - Gate B tests cover `computePlatesVoronoi`, `calculateVoronoiCells`, and `PlateSeedManager`, but there is no dedicated unit test file for `WorldModel` itself.
  - Behavior such as `init`’s dimension inference, interaction with `setConfigProvider`, correct wiring of `plateSeed` snapshots, and integration of pressure/winds/currents is only exercised indirectly (e.g., through layer/orchestrator behavior in later issues).
  - Given how central `WorldModel` is to later layers (`mountains`, `coastlines`, `landmass-utils`, `climate-engine`), a small, focused test suite for `WorldModel` would reduce regression risk.
- Timings vs. stated <100ms target:
  - World tests run in ~164ms (38 tests, 48,504 assertions). This is fast but technically exceeds the 100ms budget mentioned in the issue.
  - The extra time is due to running a large number of expectations and multiple full field solves; this is more of a documentation drift than a practical problem.
  - The spirit of the criterion (no game dependency overhead) is clearly met—game dependencies cause seconds to minutes of overhead, not milliseconds.

#### Suggested follow-ups

- Clarify and/or tighten Voronoi utility integration:
  - Decide whether the long‑term design is:
    - A fully independent TS Voronoi implementation (documented as such), or
    - A thin, testable wrapper around Civ7’s `/base-standard/voronoi-utils.js` exposed via an adapter.
  - If it is the latter, implement a `VoronoiUtilsInterface` adapter that uses the real game utilities in production while keeping `DefaultVoronoiUtils` for tests, and adjust docs (`era-tagged-morphology-review.md`, `migrate-to-ts-plan.md`) accordingly.
- Add targeted `WorldModel` tests under `test/world`:
  - Cover `WorldModel.init` with explicit `width`/`height` (no globals) and verify that plate arrays, winds, currents, and pressure are allocated and populated as expected for a small grid.
  - Assert that `plateSeed` snapshots are present and stable when `PlateSeedManager` is used.
  - Optionally, verify that calling `init` twice is idempotent and that `reset()` clears state, since later layers rely on these invariants.
- Documentation cleanup:
  - Update Gate B documentation to note that:
    - Legacy JS world files were intentionally retained through CIV‑5 for runtime use and removed later in the stack.
    - The actual TS implementation currently uses an internal Voronoi utility rather than Civ7’s voronoi/kd‑tree pipeline, unless/until an adapter is introduced.
  - Relax or restate the “<100ms” test target as an approximate performance goal rather than a hard acceptance requirement, or adjust test sizes if sub‑100ms remains important.

---

### CIV‑6 – Refactor Bootstrap to Lazy Providers (`@swooper/mapgen-core/bootstrap`)

**Review date:** 2025‑12‑07  
**Reviewer:** AI agent (Codex CLI)  
**Status (implementation):** Partially implemented; core acceptance items missing and a functional gap remains.

#### Summary of implementation

- `src/bootstrap/tunables.ts` builds a memoized snapshot from `getConfig()` with hardcoded defaults (toggles, landmass, foundation, climate). Cache reset via `resetTunables()`/`rebind()`. No `GameInfo`/`GameplayMap` lookups.
- `src/bootstrap/runtime.ts` is a shallow-frozen global store (`__EPIC_MAP_CONFIG__`) with `setConfig`/`getConfig`/`resetConfig`.
- `src/bootstrap/entry.ts` accepts `presets`, `stageConfig`, and `overrides`, stores them via `setConfig`, and calls `rebindTunables()`. `stageConfig` is merely copied; no resolver exists.
- Tests cover caching/merging/reset behavior through the runtime store and confirm import safety without Civ7 globals.

#### Alignment with plan

- Lazy provider pattern exists and import safety is achieved.
- Consumers now call `getTunables()` (layers/orchestrator) instead of importing constants directly.

#### Notable gaps / risks

- `bootstrap/resolved.ts` was never created; there is no preset/override resolver or `GameInfo.Maps.lookup(GameplayMap.getMapSize())`. Map-size-aware config is effectively dropped.
- Stage manifest is never populated: `tunables` defaults to an empty manifest and `stageEnabled` returns false unless `stageManifest` is manually provided. `bootstrap()` only records `stageConfig`, which is unused downstream. With the shipped config in `mods/mod-swooper-maps/src/swooper-desert-mountains.ts`, every stage flag will be false, so the orchestrated generation pipeline is effectively disabled.
- Tests do not exercise the intended mocked-global flow (`GameplayMap.getMapSize` + `GameInfo.Maps.lookup`) or per-test rebinding; they only validate the new runtime store path.
- `generateMap()` calls `resetTunables()` but never resets/rebinds the runtime config; any stale/missing config persists across runs.

#### Suggested follow-ups

1) Implement the missing resolver: add `bootstrap/resolved.ts` (or equivalent) to compose defaults + presets + overrides, perform `GameInfo.Maps.lookup(GameplayMap.getMapSize())`, and feed `stageManifest` plus config blocks into `tunables`.  
2) Populate the stage manifest from `stageConfig` (and defaults) so `stageEnabled()` reflects the intended pipeline; wire this through `bootstrap()` and `rebind()`.  
3) Expand tests to mock Civ7 globals, verify map-size lookups, cache invalidation (`resetTunables` + `resetConfig`), and that `generateMap()` rebinding enables stages.  
4) Consider resetting/rebinding config at each `generateMap()` entry to avoid stale state when multiple maps are generated per session.

---

### CIV‑7 – Migrate Orchestrator & Layers (Gate C) — **Parent Issue Review**

**Review date:** 2025‑12‑07
**Reviewer:** AI agent (Claude Code / Opus 4.5)
**Sub-issues reviewed individually:** CIV-10, CIV-11, CIV-12, CIV-13
**Status (implementation):** Mixed — acceptance criteria formally met at surface level, but critical functional gaps remain.

> **Note:** This is a parent-level review focusing on overall Gate C completion. Sub-issues (CIV-10, CIV-11, CIV-12, CIV-13) are reviewed individually in the Stack D section below.

#### Parent Issue Acceptance Criteria Evaluation

| Criterion | Status | Verification |
|-----------|--------|--------------|
| All layer modules compile without TypeScript errors | ✅ Pass | `pnpm -C packages/mapgen-core build` succeeds |
| `pnpm -C packages/mapgen-core build` succeeds | ✅ Pass | Build produces valid ESM output |
| `pnpm -C mods/mod-swooper-maps build` produces valid bundle | ✅ Pass | Bundle at `mod/maps/swooper-desert-mountains.js` |
| Bundle includes inlined core with external `/base-standard/...` imports | ✅ Pass | 11 `/base-standard/...` imports in `chunk-MMMXD7WB.js` |
| No remaining `.js` files in `packages/mapgen-core/src/` | ✅ Pass | Only `.ts` files present |

**Conclusion:** All five stated acceptance criteria are satisfied at the final codebase state. However, the acceptance criteria are narrowly defined and do not cover functional correctness of the migrated system.

#### Summary of implementation (parent-level)

The parent issue (CIV-7) organized Gate C into four sub-issues:
- **CIV-10:** Core Utils & Story System (~1200 lines) — ✅ Complete
- **CIV-11:** Landmass & Terrain Layers (~1000 lines) — ✅ Complete
- **CIV-12:** Climate & Biomes (~800 lines) — ✅ Complete
- **CIV-13:** Placement & Orchestrator (~800 lines) — ✅ Complete

Combined, these issues delivered:
- `MapOrchestrator.ts` (899 lines) with full stage pipeline
- 10 layer files under `src/layers/` (coastlines, islands, mountains, volcanoes, landmass-plate, landmass-utils, climate-engine, biomes, features, placement)
- Story system (`src/story/tags.ts`, `overlays.ts`) with lazy providers
- Core utilities (`src/core/types.ts`, `plot-tags.ts`, `index.ts`)
- Mod entry (`swooper-desert-mountains.ts`) wired to TypeScript orchestrator

#### What went well (parent-level view)

1. **Structural migration complete:** All files enumerated in the parent issue deliverables exist as TypeScript in `packages/mapgen-core/src/`.

2. **Build pipeline working:** Both core package and mod bundle build successfully. The bundler correctly inlines `@swooper/mapgen-core` while preserving `/base-standard/...` as external imports.

3. **Type coverage:** All public APIs have TypeScript signatures. `ExtendedMapContext`, `FoundationContext`, and layer config types are well-defined.

4. **Test infrastructure:** 149 tests pass across core, story, and world modules in ~175ms. Tests run in Bun without game dependencies.

5. **Clean final state:** Legacy JS files were removed from `mods/mod-swooper-maps/mod/maps/` in commit `2d18b926`, leaving a single TS source of truth.

#### Critical gaps at parent-issue level

Despite meeting acceptance criteria, CIV-7 leaves the **functional pipeline broken**:

1. **Stage enablement broken — pipeline never runs:**
   - The mod entry calls `bootstrap({ stageConfig: { foundation: true, landmassPlates: true, ... } })`
   - `bootstrap()` stores this in `cfg.stageConfig` (line 118 of `entry.ts`)
   - But `buildTunablesSnapshot()` reads from `config.stageManifest` (line 161 of `tunables.ts`)
   - **Result:** `stageEnabled(stage)` always returns `false` because `stages[stage]` is undefined
   - All 20+ stages in `MapOrchestrator.generateMap()` check `stageFlags.*` and skip when false
   - **Impact:** The entire map generation pipeline is effectively disabled with the shipped config

2. **Story tagging passes never execute:**
   - `story/tagging.ts` and `story/corridors.ts` were listed in CIV-7 deliverables but were never created
   - Only `story/tags.ts` (data structure) and `story/overlays.ts` (registry) exist
   - The orchestrator's `storySeed`, `storyHotspots`, `storyRifts`, etc. stages only call `resetStoryTags()` — no actual story imprinting
   - Layers that read `StoryTags` (coastlines, islands, biomes) receive empty sets, losing narrative-driven variation

3. **Adapter boundary not enforced:**
   - `MapOrchestrator.createLayerAdapter()` attempts `require("./core/adapters.js")` which doesn't exist
   - Falls back to `createFallbackAdapter()` which directly accesses `GameplayMap`/`TerrainBuilder` globals
   - `@civ7/adapter/civ7` (`Civ7Adapter`) is never instantiated or used
   - The adapter-boundary enforcement goal (only `@civ7/adapter` touches `/base-standard/`) is architecturally violated

4. **Missing resolver from CIV-6 bleeds into CIV-7:**
   - No `bootstrap/resolved.ts` to compose presets, perform `GameInfo.Maps.lookup`, or normalize stage manifest
   - The orchestrator works around this by hardcoding dimension defaults, but loses map-size-aware configuration

#### Why this matters for the migration

The parent issue's acceptance criteria focused on **build correctness** ("does it compile?") rather than **behavioral correctness** ("does it run?"). This is reasonable for staged migration, but:

- CIV-8 (E2E validation) is blocked by these issues — it cannot validate feature parity if stages don't execute
- Downstream work that relies on working stage enablement will encounter silent failures
- The "pipeline disabled" state is not caught by any existing test — tests only exercise individual layers, not the full orchestrator flow

#### Suggested follow-ups (prioritized)

1. **[P0] Fix stageConfig → stageManifest mapping:**
   - In `bootstrap()` or `buildTunablesSnapshot()`, translate `stageConfig` into `stageManifest.stages` entries
   - Or: change `stageEnabled()` to check both `stageManifest.stages[stage]` AND `stageConfig[stage]`
   - Add a test: `bootstrap({ stageConfig: { foundation: true } })` should make `stageEnabled("foundation")` return `true`

2. **[P0] Wire `@civ7/adapter/civ7` as default adapter:**
   - Remove the broken `require("./core/adapters.js")` attempt
   - Import and instantiate `Civ7Adapter` from `@civ7/adapter/civ7` in production
   - Keep `createFallbackAdapter()` as test-only fallback

3. **[P1] Implement story tagging passes:**
   - Create `story/tagging.ts` with margin imprinting logic
   - Create `story/corridors.ts` with corridor generation
   - Wire into orchestrator stages so `StoryTags` is populated before consumer layers

4. **[P1] Add orchestrator integration test:**
   - Test that `bootstrap({ stageConfig: {...} })` + `orchestrator.generateMap()` actually executes stages
   - Mock adapter should record which stages ran
   - This would have caught the "all stages false" regression

5. **[P2] Implement bootstrap resolver:**
   - Add `bootstrap/resolved.ts` with preset composition and `GameInfo.Maps` lookup
   - Make stage manifest defaults explicit and document the expected structure

---

## Stack D – Full Migration (Gate C Sub-issues)

### CIV‑10 – Migrate Core Utils & Story System (`@swooper/mapgen-core/core` + `story`)

**Review date:** 2025‑12‑07
**Reviewer:** AI agent (Claude Code / Opus 4)
**Commit:** `aaae3979` ("feat(mapgen-core): migrate core utils and story system (CIV-10)")
**PR:** [#42](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/42)
**Status (implementation):** Substantially complete; acceptance criteria met with minor gaps in completeness.

#### Summary of implementation

- **Core utilities (`src/core/`):**
  - `types.ts`: Defines `ExtendedMapContext`, `FoundationContext`, `MapFields`, `MapBuffers`, `HeightfieldBuffer`, `ClimateFieldBuffer`, `StoryOverlaySnapshot`, `RNGState`, `GenerationMetrics`, plus factory functions `createExtendedMapContext()`, `createFoundationContext()`, and sync helpers (`syncHeightfield`, `syncClimateField`, `writeHeightfield`, `writeClimateField`).
  - `index.ts`: Exports coordinate utilities (`idx`, `inBounds`, `storyKey`, `parseStoryKey`), math utilities (`clamp`, `lerp`, `wrapX`), and buffer helper (`fillBuffer`).
  - `plot-tags.ts`: Implements `addPlotTags()` and `addPlotTagsSimple()` with adapter pattern—no direct engine dependencies.
- **Story system (`src/story/`):**
  - `tags.ts`: Lazy-loaded `StoryTagsInstance` singleton via `getStoryTags()`. Includes all expected tag sets (hotspot, rift, margin, corridor) plus corridor metadata maps. Helper functions: `hasTag`, `addTag`, `removeTag`, `getTagCoordinates`, `resetStoryTags`, `clearStoryTags`.
  - `overlays.ts`: Implements `publishStoryOverlay()`, `getStoryOverlay()`, `finalizeStoryOverlay()`, `hydrateMarginsStoryTags()`, and `getStoryOverlayRegistry()`. Adds `CORRIDORS` to `STORY_OVERLAY_KEYS` (enhancement over original JS).
  - `index.ts`: Re-exports all public APIs from `tags.ts` and `overlays.ts`.
- **Test coverage:**
  - `test/core/utils.test.ts`: 23 tests covering all utility functions.
  - `test/story/tags.test.ts`: 19 tests for StoryTags lazy provider and operations.
  - `test/story/overlays.test.ts`: 18 tests for overlay registry and hydration.
  - All tests pass: **60 tests** with **174 expect() calls** in ~75ms.
- **Type checking:** `pnpm -C packages/mapgen-core check` passes cleanly.

#### Alignment with plan and acceptance criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| All core/story files compile without TypeScript errors | ✅ Pass | `tsc --noEmit` succeeds |
| Types are properly exported and importable | ✅ Pass | All types exported via `src/index.ts` |
| StoryTags sparse registry operations tested | ✅ Pass | 19+ tests exist for tags |
| No remaining `.js` files in `src/core/` or `src/story/` | ✅ Pass | Only `.ts` files in package |

- The TS implementation faithfully preserves the original JS API while improving it:
  - Lazy provider pattern (`getStoryTags()`) replaces the frozen singleton, enabling test isolation via `resetStoryTags()`.
  - `StoryOverlaySnapshot` is now typed with explicit fields and frozen for immutability.
  - `parseStoryKey()` added as companion to `storyKey()` for round-trip coordinate handling.

#### Notable gaps / drifts

1. **Legacy JS files NOT removed in CIV-10 branch:**
   - The issue deliverables specified: "Remove `adapters.js` (use `@civ7/adapter` instead)".
   - However, **all** legacy JS files in `mods/mod-swooper-maps/mod/maps/core/` and `story/` (`adapters.js`, `utils.js`, `types.js`, `plot_tags.js`, `tags.js`, `overlays.js`, `tagging.js`, `corridors.js`) still exist on the `civ-10-core-utils-story` branch.
   - These were only removed in a later commit (`2d18b926`) on `civ-8-e2e-validation`.
   - This is acceptable for staged migration but diverges from the stated deliverable and should be clearly documented.

2. **Missing utility functions from original `utils.js`:**
   - `isAdjacentToLand(x, y, radius)` — not migrated (used for water/land adjacency checks).
   - `getFeatureTypeIndex(name)` — not migrated (engine-dependent feature type lookup).
   - These may have been intentionally deferred since they depend on `GameplayMap` globals, but this was not explicitly documented in the issue.

3. **API signature changes:**
   - `clamp()`: Original JS had defaults `clamp(v, min=0, max=200)`. TS version requires explicit `min` and `max` parameters.
   - `inBounds()`: Original JS used `GameplayMap.getGridWidth()` / `getGridHeight()` globals. TS version requires `width` and `height` as parameters (this is an **improvement** for testability).

4. **Deferred items (correctly documented):**
   - `story/tagging.js` → deferred to CIV-11/12/13 layer migrations.
   - `story/corridors.js` → deferred to CIV-11/12/13 layer migrations.

#### What went well

- Clean TypeScript types that properly model the story tagging domain.
- Lazy provider pattern enables test isolation without mocking complexity.
- Comprehensive test coverage (60 tests) that exercises all major code paths.
- `STORY_OVERLAY_KEYS` proactively includes `CORRIDORS` for future corridor overlay work.
- Factory functions (`createExtendedMapContext`, `createFoundationContext`) provide type-safe construction.
- Sync functions (`syncHeightfield`, `syncClimateField`) cleanly separate buffer state from engine writes.

#### Suggested follow-ups

1. **Document the staged removal of legacy JS:**
   - Note in milestone docs that legacy JS in `mods/mod-swooper-maps/mod/maps/{core,story}/` was intentionally retained through CIV-10 for runtime compatibility and removed in CIV-8 once all layers migrated.

2. **Migrate or explicitly defer remaining utility functions:**
   - Either:
     - Port `isAdjacentToLand()` and `getFeatureTypeIndex()` to use adapter pattern, or
     - Add a note in CIV-10 or CIV-11/12/13 that these are deferred and where they will be addressed.

3. **Consider `clamp()` default parameters:**
   - If the 0–200 range is commonly used (e.g., for rainfall), consider adding a typed wrapper `clampRainfall(v)` or restore optional defaults.

4. **Add tests for types.ts factory functions:**
   - `createExtendedMapContext()` and `createFoundationContext()` have limited test coverage; consider adding unit tests for edge cases (invalid dimensions, missing tensors, etc.).

---

### CIV‑11 – Migrate Landmass & Terrain Layers

**Review date:** 2025‑12‑07
**Reviewer:** AI agent (Claude Code / Opus 4.5)
**Commit:** `022bdf49` ("feat(mod-swooper-maps): wire TypeScript orchestrator (CIV-8)")
**PR:** [#43](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/43)
**Status (implementation):** Complete; all acceptance criteria met.

#### Summary of implementation

- **Six layer files migrated to TypeScript under `packages/mapgen-core/src/layers/`:**
  - `landmass-utils.ts` (527 lines): Window adjustment utilities and plate-aware ocean separation logic. Exports `applyLandmassPostAdjustments()`, `applyPlateAwareOceanSeparation()`, and associated types.
  - `landmass-plate.ts` (554 lines): Plate-driven landmass generation using WorldModel stability metrics. Exports `createPlateDrivenLandmasses()` with binary-search threshold selection for land/sea ratio.
  - `coastlines.ts` (366 lines): Rugged coast carving with bay/fjord generation, plate boundary awareness. Exports `addRuggedCoasts()` with configurable plate bias.
  - `islands.ts` (261 lines): Sparse island chain placement with hotspot classification (paradise vs. volcanic). Exports `addIslandChains()`.
  - `mountains.ts` (436 lines): Physics-based mountain/hill placement using WorldModel uplift potential and boundary data. Exports `layerAddMountainsPhysics()` and `addMountainsCompat()`.
  - `volcanoes.ts` (241 lines): Plate-aware volcano placement favoring convergent boundaries. Exports `layerAddVolcanoesPlateAware()`.

- **Type infrastructure:**
  - All config interfaces (`LandmassConfig`, `MountainsConfig`, `VolcanoesConfig`, etc.) are defined in `bootstrap/types.ts` and re-exported by each layer for convenience.
  - Each layer defines its own internal helper types (e.g., `PlateStats`, `VolcanoCandidate`, `RowState`).
  - Return types are properly typed (`LandmassGenerationResult`, `PlateAwareOceanSeparationResult`, etc.).

- **Adapter pattern:**
  - All layers accept `ExtendedMapContext` or direct `EngineAdapter` references.
  - Terrain writes use `writeHeightfield(ctx, x, y, {...})` from `core/types.ts` for buffer-based operations.
  - Adapter methods (`isWater`, `setTerrainType`, `createFractal`, `getFractalHeight`, etc.) are used consistently instead of direct `GameplayMap`/`TerrainBuilder` calls.

- **Index exports:**
  - `src/layers/index.ts` properly exports all layer functions and types.
  - `LAYERS_MODULE_VERSION = "0.3.0"` version constant present.

- **Build verification:**
  - `pnpm -C packages/mapgen-core build` succeeds with no TypeScript errors.
  - `pnpm -C packages/mapgen-core check` passes cleanly.
  - Built output: `dist/layers/index.js` (903 bytes) plus chunked implementation in `dist/chunk-*.js`.

#### Alignment with plan and acceptance criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| All landmass/terrain layer files compile without TypeScript errors | ✅ Pass | `tsc --noEmit` and build succeed |
| Layers use `EngineAdapter` interface, not direct `GameplayMap` calls | ✅ Pass | All engine access via adapter/context |
| Layer configs are properly typed | ✅ Pass | Full type coverage in `bootstrap/types.ts` |
| No remaining `.js` files for these layers | ✅ Pass | Only `.ts` in `packages/mapgen-core/src/layers/` |
| Migrate `landmass_plate.js` → `landmass-plate.ts` | ✅ Done | |
| Migrate `landmass_utils.js` → `landmass-utils.ts` | ✅ Done | |
| Migrate `coastlines.js` → `coastlines.ts` | ✅ Done | |
| Migrate `islands.js` → `islands.ts` | ✅ Done | |
| Migrate `mountains.js` → `mountains.ts` | ✅ Done | |
| Migrate `volcanoes.js` → `volcanoes.ts` | ✅ Done | |

#### What went well

- **Clean adapter boundary:** All layers properly use the adapter pattern. No direct `GameplayMap` or `TerrainBuilder` calls in the layer code; all engine interaction flows through `ctx.adapter` or injected adapter references.

- **Comprehensive typing:** Config interfaces in `bootstrap/types.ts` cover all tunable parameters for each layer. The types are detailed enough to provide IntelliSense support and catch config errors at compile time.

- **Buffer-based terrain writes:** The `writeHeightfield(ctx, x, y, {...})` pattern abstracts terrain mutation through the context buffer system, enabling potential future optimizations and test isolation.

- **WorldModel integration preserved:** All plate tectonics logic (boundary closeness, uplift potential, rift potential, boundary type) is properly wired through the typed `WorldModel` singleton.

- **Defensive coding:** Layers handle missing/null context gracefully with early returns or fallback behavior, making them robust to partial initialization scenarios.

- **Config re-exports:** Each layer re-exports its canonical config type from `bootstrap/types.ts`, providing a clean public API without forcing consumers to import from bootstrap directly.

#### Notable gaps / drifts

1. **Direct `WorldModel` singleton imports:**
   - All layers import `WorldModel` directly from `../world/model.js` rather than receiving it as a dependency through context.
   - Example: `import { WorldModel, BOUNDARY_TYPE } from "../world/model.js";` appears in `landmass-plate.ts`, `coastlines.ts`, `mountains.ts`, `volcanoes.ts`, and `landmass-utils.ts`.
   - This is consistent with the architectural concern already noted in the review doc ("Direct WorldModel imports from layers") but represents a deviation from pure dependency injection.
   - Impact: Makes unit testing individual layers harder without initializing the full WorldModel or mocking the module.

2. **Magic numbers for terrain types:**
   - Each layer defines its own terrain type constants:
     - `OCEAN_TERRAIN = 0`, `COAST_TERRAIN = 1`, `FLAT_TERRAIN = 3`, `HILL_TERRAIN = 4`, `MOUNTAIN_TERRAIN = 5`
   - These are duplicated across `landmass-utils.ts`, `landmass-plate.ts`, `coastlines.ts`, `islands.ts`, `mountains.ts`, and `volcanoes.ts`.
   - Could be centralized in `core/constants.ts` or imported from `@civ7/types` for consistency.

3. **No dedicated unit tests:**
   - CIV-11 did not include test deliverables, and there are no unit tests specifically for the layer functions.
   - Layer behavior is tested only implicitly through E2E/integration tests in CIV-8.
   - Given the complexity of the physics-based logic (especially in `mountains.ts` and `landmass-plate.ts`), targeted unit tests would improve confidence.

4. **Type alias proliferation:**
   - Layers create local type aliases for canonical types:
     - `type GeometryConfig = LandmassGeometry;`
     - `type TectonicsConfig = LandmassTectonicsConfig;`
     - `type OceanSeparationPolicy = OceanSeparationConfig;`
   - This provides API cleanliness but creates maintenance overhead if canonical types change.

5. **Fallback patterns in adapter access:**
   - Some layers have patterns like:
     ```typescript
     if (ctx) {
       writeHeightfield(ctx, x, y, { terrain, isLand });
     } else if (adapter) {
       adapter.setTerrainType(x, y, terrain);
     }
     ```
   - This defensive coding is pragmatic but could mask missing context configuration errors silently.

6. **Legacy JS files (staged removal):**
   - Similar to CIV-10, the original JS layer files in `mods/mod-swooper-maps/mod/maps/layers/` were NOT removed as part of CIV-11 itself.
   - These were removed later in the CIV-8 branch (`2d18b926`, `80ffbb52`).
   - This is acceptable for staged migration but diverges from the literal "No remaining `.js` files for these layers" criterion when evaluated at the CIV-11 commit point.

#### Suggested follow-ups

1. **Centralize terrain type constants:**
   - Create `packages/mapgen-core/src/core/constants.ts` with shared terrain type definitions.
   - Update all layers to import from the central location.

2. **Consider WorldModel injection:**
   - For improved testability, layers could accept an optional `worldModel` parameter or read from `ctx.worldModel` rather than importing the singleton directly.
   - This is a longer-term refactor noted in the architectural concerns section.

3. **Add targeted layer unit tests:**
  - `mountains.ts`: Test score computation, threshold selection, rift depression application.
  - `landmass-plate.ts`: Test binary search threshold logic, plate stats aggregation.
  - `volcanoes.ts`: Test candidate scoring, spacing enforcement.
  - These could use mocked WorldModel state and MockAdapter.

4. **Document staged removal of legacy JS:**
  - Update CIV-11 issue documentation to note that legacy JS removal was intentionally deferred to CIV-8 for runtime compatibility during the migration.

---

### CIV‑12 – Migrate Climate & Biomes Layers

**Review date:** 2025‑12‑08  
**Reviewer:** AI agent (Codex CLI / GPT‑5.1)  
**Commit:** `74f40efc` ("feat(mapgen-core): migrate climate and biomes layers (CIV-12)")  
**PR:** Branch `civ-12-climate-biomes` (PR comments not available locally; review based on merged code).

#### Summary of implementation

- **Climate engine** (`packages/mapgen-core/src/layers/climate-engine.ts`):
  - Exposes three passes:
    - `applyClimateBaseline(width, height, ctx?)` — baseline rainfall bands with orographic/coastal modifiers and noise.
    - `applyClimateSwatches(width, height, ctx?, { orogenyCache? })` — macro-scale swatches (desert belts, equatorial rainbelt, rainforest archipelago, mountain forests, great plains) with directionality-aware weighting.
    - `refineClimateEarthlike(width, height, ctx?, { orogenyCache? })` — refinement passes for water-gradient humidity, orographic rain shadows, river corridors & basins, rift humidity, orogeny belts, and hotspot microclimates.
  - Uses `ExtendedMapContext` and `ClimateFieldBuffer` from `core/types.ts`:
    - Writes via `writeClimateField(ctx, x, y, { rainfall, humidity })`.
    - Seeds buffers from engine via `syncClimateField(ctx)`.
  - Drives behavior from `CLIMATE_CFG`, `FOUNDATION_DIRECTIONALITY`, and `FOUNDATION_CFG.story` via `getTunables()`.
  - Reads `StoryTags` and `WorldModel` wind tensors where enabled, with defensive fallbacks when not.

- **Biomes layer** (`packages/mapgen-core/src/layers/biomes.ts`):
  - Exports `designateEnhancedBiomes(iWidth, iHeight, ctx?)`.
  - Defines a local `BiomeConfig` that mirrors `FoundationConfig.biomes` in `bootstrap/types.ts` (tundra, tropical coasts, river-valley grassland, rift shoulder).
  - Intended flow:
    - Call a "vanilla" biome generator via `adapter.designateBiomes(iWidth, iHeight)`.
    - Apply climate- and narrative-aware nudges:
      - Tundra restraint (high latitude/elevation + dry).
      - Tropical encouragement on warm, wet coasts.
      - River-valley grassland preference.
      - Corridor-based nudges (land-open, river-chain, edges/kinds) using `StoryTags`.
      - Rift-shoulder biases keyed to `StoryTags.riftShoulder`.
  - Wraps engine access in a `BiomeAdapter` obtained via `resolveAdapter(ctx)`, avoiding direct `GameplayMap`/`TerrainBuilder` usage.

- **Features layer** (`packages/mapgen-core/src/layers/features.ts`):
  - Exports `addDiverseFeatures(iWidth, iHeight, ctx?)` plus TS-local `FeaturesConfig` and `FeaturesDensityConfig`.
  - Intended flow:
    - Run base-standard feature placement via `adapter.addFeatures(iWidth, iHeight)`.
    - Add paradise reefs around hotspot centers and along passive shelves.
    - Add volcanic vegetation (forests/taiga) near volcanic hotspots.
    - Apply gentle, validated density tweaks (rainforest/forest/taiga) keyed to biomes and rainfall.
  - Uses `FeaturesAdapter` from `resolveAdapter(ctx)` to wrap `EngineAdapter`’s feature-related methods where available (isWater, getFeatureType, getElevation, getRainfall, getLatitude, canHaveFeature, setFeatureType, RNG).
  - Consumes `FOUNDATION_CFG.story.features` and `FOUNDATION_CFG.featuresDensity` plus `StoryTags` sets (hotspots, passive shelves).

- **Types and exports:**
  - `bootstrap/types.ts`:
    - Adds `ClimateConfig`/`ClimateBaseline`/`ClimateRefine` (used by climate engine and re-exported from `layers/index.ts`).
    - Adds `BiomeConfig` and `FeaturesConfig` under `FoundationConfig`, plus `FeaturesDensityConfig`.
  - `core/types.ts`:
    - Defines `ClimateFieldBuffer` / `MapBuffers.climate`, `writeClimateField()`, and `syncClimateField()`.
  - `src/layers/index.ts`:
    - Bumps `LAYERS_MODULE_VERSION` to `"0.3.0"`.
    - Re-exports climate, biomes, and features functions and their config types as public API.

- **Build and type-check:**
  - `pnpm -C packages/mapgen-core check` passes (no TypeScript errors).
  - `pnpm -C packages/mapgen-core build` succeeds; climate/biome/feature implementations are bundled into `dist/chunk-*.js` with declarations in `dist/layers/index.d.ts`.
  - `packages/mapgen-core/src/layers/` contains only `.ts` sources for climate, biomes, and features; older `.js` implementations now live only in archived docs/repomix snapshots.

#### Alignment with plan and acceptance criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Migrate `climate-engine.js` → `src/layers/climate-engine.ts` | ✅ Done | Climate engine is fully migrated and integrated with `ExtendedMapContext`. |
| Migrate `biomes.js` → `src/layers/biomes.ts` | ✅ Done (shape) | TS implementation exists with narrative logic; engine integration is incomplete (see gaps). |
| Migrate `features.js` → `src/layers/features.ts` | ✅ Done (shape) | TS implementation exists with narrative logic; engine integration is incomplete (see gaps). |
| ClimateField types defined and exported | ✅ Conceptual pass | Implemented via `ClimateFieldBuffer`/`MapBuffers.climate` + `writeClimateField`/`syncClimateField`, exported from `core/index.ts`. |
| Layers delegate `/base-standard/...` calls through adapter | ⚠️ Partial | No direct `/base-standard` imports here, but adapters never actually reach `/base-standard/maps/feature-biome-generator.js`. |
| Layers consume adapter interface for base-standard calls | ⚠️ Partial | Climate uses `EngineAdapter` correctly; biomes/features define richer adapters but only stub the base-standard pieces. |
| All climate/biome/feature layer files compile without TS errors | ✅ Pass | Confirmed via `tsc --noEmit`. |
| No remaining `.js` files for these layers in core | ✅ Pass | Only TS sources in `packages/mapgen-core/src/layers/` for these modules. |

On balance, CIV‑12 **successfully migrates the climate engine and defines the TypeScript surfaces for biomes and features**, but **stops short of fully satisfying the adapter-based base-standard integration described in the issue**, especially for biomes/features.

#### What went well

- **Climate staging and adapter usage:**
  - Climate passes are cleanly structured, adapter-driven, and avoid any direct Civ7 globals.
  - `writeClimateField`/`syncClimateField` unify staging and engine updates, giving a single authoritative rainfall field.
  - Directionality-aware swatches and refinement passes align well with the foundation/world model responsibilities established in CIV‑5/6/11.

- **Narrative wiring across layers:**
  - Climate, biomes, and features all consume `StoryTags` and `FOUNDATION_CFG.story` tunables, tying atmospheric, biome, and feature behavior into a coherent narrative system.
  - Config surface (`ClimateConfig`, `BiomeConfig`, `FeaturesConfig`, `FeaturesDensityConfig`) is well-shaped and lives in `bootstrap/types.ts` where presets/overrides can target it.

- **Adapter boundary respected at the call site level:**
  - None of these layers import `/base-standard/...` directly; they rely only on adapter/context and tunables, which matches the architectural goal of centralizing Civ7 coupling.
  - This keeps the core logic portable and testable in principle, even though some adapter surfaces are currently stubs.

#### Problems, gaps, and drifts

1. **Biomes and features do not actually invoke base-standard generators**
   - Issue text: “These layers call base-standard `designateBiomes()` and `addFeatures()` — ensure adapter wraps these.”
   - Current state:
     - `BiomeAdapter` in `biomes.ts` has:
       - `designateBiomes: () => {}`.
       - `setBiomeType: () => {}`.
     - `FeaturesAdapter` in `features.ts` has:
       - `addFeatures: () => {}`.
       - `getFeatureTypeIndex: () => -1`.
       - `getBiomeGlobal: () => -1`.
       - `getNoFeatureConstant: () => -1`.
   - There is **no** production implementation that bridges these to:
     - `/base-standard/maps/feature-biome-generator.js`, or
     - Civ7 globals (`GameplayMap.getBiomeType`, `TerrainBuilder.setBiomeType`, `GameInfo.Features` lookups, etc.).
   - Runtime impact with current orchestrator:
     - Biomes stage calls `designateEnhancedBiomes(iWidth, iHeight)` **without `ctx`**, so it always uses the dummy adapter branch; no biomes are ever written by this layer.
     - Features stage calls `addDiverseFeatures(iWidth, iHeight, ctx)`, but feature indices and biome globals are always `-1`, so all reef/forest/taiga placement logic is effectively gated off.

2. **Adapter contract mismatch with `EngineAdapter`**
   - `EngineAdapter` in `@civ7/adapter` does not expose:
     - `getBiomeType` / `setBiomeType`.
     - `getFeatureTypeIndex`, `getBiomeGlobal`, `getNoFeatureConstant`.
     - `designateBiomes` / `addFeatures`.
   - Neither `Civ7Adapter` nor `MockAdapter` implement these methods; they only implement the core `EngineAdapter` surface.
   - CIV‑12 therefore invented `BiomeAdapter`/`FeaturesAdapter` types that are **not** backed by any concrete implementation, leaving the critical base-standard behaviors unimplemented.

3. **Climate coastal/shallow-water logic is neutered by stubs**
   - `resolveAdapter()` in `climate-engine.ts` sets:
     - `isCoastalLand: () => false`.
     - `isAdjacentToShallowWater: () => false`.
   - Later helpers do:
     ```ts
     const isCoastalLand = (x, y) => {
       if (adapter.isCoastalLand) return adapter.isCoastalLand(x, y);
       // adjacency fallback (never used)
     };
     ```
   - Because `adapter.isCoastalLand` is always defined (even in stub form), the adjacency fallback is never reached; all tiles are treated as non-coastal and non-adjacent to shallow water.
   - Result: coastal/shallow bonuses in the baseline/swatches passes effectively never apply, reducing climate fidelity compared to the original JS design.

4. **Biomes stage ignores MapContext**
   - In `MapOrchestrator.generateMap()`:
     ```ts
     if (stageFlags.biomes && ctx) {
       const stageResult = this.runStage("biomes", () => {
         designateEnhancedBiomes(iWidth, iHeight);
       });
       this.stageResults.push(stageResult);
     }
     ```
   - `designateEnhancedBiomes` accepts `ctx?` but the orchestrator does not pass it, forcing the function down the dummy-adapter path that cannot see staged climate or the real adapter.
   - Even if a real `BiomeAdapter` existed, this wiring would prevent biomes from participating fully in the adapter/context ecosystem.

5. **No dedicated tests for climate/biomes/features**
   - `packages/mapgen-core/test` currently contains tests for core utilities, story system, world model, and infrastructure, but **no tests** for:
     - `applyClimateBaseline` / `applyClimateSwatches` / `refineClimateEarthlike`.
     - `designateEnhancedBiomes`.
     - `addDiverseFeatures`.
   - This made it easy for the stubbed coastal/biome/feature behaviors to slip through without detection.

6. **Acceptance criteria only partially met**
   - From a narrow standpoint (files exist, are TS, and compile; no `.js` sources remain in core), CIV‑12 passes.
   - From the original intent (adapter-wrapped base-standard behavior for climate/biomes/features), the **biomes and features portions are incomplete**. This should be recorded as intentional staging or addressed with follow-ups.

#### Suggested follow-ups for CIV‑12

1. **Implement real adapter-backed base-standard integration**
   - Either:
     - Extend `EngineAdapter`/`Civ7Adapter`/`MockAdapter` to include:
       - `getBiomeType`, `setBiomeType`.
       - `getFeatureTypeIndex(name)`.
       - `getBiomeGlobal(name)`, `getNoFeatureConstant()`.
       - `designateBiomes(width, height)` and `addFeatures(width, height)` that internally call `/base-standard/maps/feature-biome-generator.js`, or
     - Introduce explicit `BiomeEngineAdapter` / `FeatureEngineAdapter` interfaces implemented only in the Civ7-bound adapter layer, and have `resolveAdapter()` use those when available.
   - Once in place, remove the current no-op/sentinel stubs in `biomes.ts` and `features.ts` and wire calls through to the real implementations.

2. **Pass MapContext into the biomes stage**
   - Update `MapOrchestrator.generateMap()` to:
     ```ts
     if (stageFlags.biomes && ctx) {
       const stageResult = this.runStage("biomes", () => {
         designateEnhancedBiomes(iWidth, iHeight, ctx!);
       });
       this.stageResults.push(stageResult);
     }
     ```
   - This aligns biomes with climate/features stages and gives it access to adapter/climate/story overlays through `ctx`.

3. **Fix climate coastal/shallow-water helpers**
   - Make `ClimateAdapter.isCoastalLand` / `isAdjacentToShallowWater` optional, and adjust `resolveAdapter()` so that:
     - When using a plain `EngineAdapter`, those properties are omitted, causing the helper to fall back to adjacency-based detection.
     - When using an enriched adapter that exposes these methods (e.g., a future extended `Civ7Adapter`), pass them through.

4. **Document staged behavior explicitly in CIV‑12**
   - Update `docs/projects/engine-refactor-v1/issues/CIV-12-climate-biomes.md` to note that:
     - Biomes/features base-standard integration and biome/feature ID lookups are intentionally deferred to a follow-up (likely in the adapter or CIV‑13 refinement), and
     - The current TS implementation focuses on structuring the logic and configs.

5. **Add targeted tests for climate, biomes, and features**
   - Climate:
     - Validate latitude bands, orographic penalties, water-gradient humidity, and rift/orogeny/hotspot effects with `MockAdapter` and deterministic RNG.
   - Biomes:
     - Use a fake adapter that exposes biome reads/writes to test tundra restraint, tropical coast bias, river-valley grassland, corridor/kind biases, and rift-shoulder rules.
   - Features:
     - Use a fake adapter that implements `getFeatureTypeIndex`, `getBiomeGlobal`, and `getNoFeatureConstant` to exercise reef placement and volcanic/forest/taiga tweaks.

6. **Re-evaluate adapter layering across CIV‑10/11/12/13**
   - Given how many layers now want functionality beyond the base `EngineAdapter`, it may be worth:
     - Defining a layered adapter strategy (core engine adapter + optional biome/feature/placement extensions).
     - Ensuring `MapOrchestrator.createLayerAdapter()` is aligned with that strategy (likely via `@civ7/adapter/civ7` or an injected factory), as already noted in other sections of this review doc.

---

### CIV‑13 – Migrate Placement & Orchestrator (`@swooper/mapgen-core`)

**Review date:** 2025‑12‑07  
**Reviewer:** AI agent (Codex CLI)  
**Commit:** `0dc7ce30` ("feat(mapgen-core): migrate placement and orchestrator (CIV-13)")  
**PR:** Branch `civ-13-placement-orchestrator` (PR comments not available locally)

#### Summary of intent

- Port the late-game placement layer (`placement.js`) and the shared orchestrator (`map_orchestrator.js`) to TypeScript.
- Type the stage manifest (`requires`/`provides`) and drive stage enablement from the lazy bootstrap system.
- Route engine interactions through the adapter boundary and expose a clean entry-point API (`bootstrap` + `MapOrchestrator` wired to `engine.on`).
- Emit a mod bundle with `@swooper/mapgen-core` inlined and `/base-standard/...` left external; remove remaining `.js` sources under `packages/mapgen-core/src/`.

#### What went well

- `packages/mapgen-core/src/layers/placement.ts` exists, is typed, and re-exports its config types via `layers/index.ts`.
- `packages/mapgen-core/src/MapOrchestrator.ts` ports the JS orchestrator with typed results (`StageResult`, `GenerationResult`) and tunables threading.
- `packages/mapgen-core/src/index.ts` exports `MapOrchestrator` and placement types; there are no `.js` sources left under `packages/mapgen-core/src/`.
- The Swooper entry file now imports `bootstrap`/`MapOrchestrator` from `@swooper/mapgen-core`, and the built bundle (`mod/maps/swooper-desert-mountains.js`) inlines the core with `/base-standard/...` kept external.

#### Problems / gaps

- **Stage manifest never populated or consumed:** `bootstrap()` stores `stageConfig`, but `tunables` only read `stageManifest`, which defaults to empty. `stageEnabled()` therefore returns `false` for every stage, so `MapOrchestrator.generateMap()` skips the pipeline despite logging success. Manifest `order`/`requires`/`provides` metadata are unused.
- **Adapter boundary broken:** The orchestrator no longer accepts an injected adapter; it constructs an ad-hoc `resolveOrchestratorAdapter()` on Civ globals. `createLayerAdapter()` tries `require("./core/adapters.js")` (file does not exist) and falls back to globals-based shims, so the planned `@civ7/adapter` default is never used and “consume adapter interface for all engine calls” is unmet.
- **Story stages stubbed out:** The `storySeed` stage only resets tags and logs; there is no invocation of story tagging/corridor/swatches logic, so narrative overlays never populate even if stages were enabled.
- **Entry-point bootstrap incomplete:** `requestMapData()` hardcodes dimensions (84x54) instead of consulting map presets/`GameInfo.Maps`. `bootstrap()` does not populate a manifest or preset-aware config, so the listed `stageConfig` flags never enable stages. No tests exercise these paths, so manifest/adapter regressions went uncaught.

#### Suggested follow-ups

1. Implement a real manifest resolver (defaults + stageConfig → stageManifest), honor manifest `order`/`requires`/`provides`, and emit `[StageManifest]` warnings when dependencies are missing. Add tests to ensure stages enable when config is set.
2. Wire the orchestrator to `@civ7/adapter` by default (with optional injected factory), remove the broken `./core/adapters.js` require, and use the adapter for `requestMapData`/engine calls; keep globals-only fallback for tests only.
3. Re-integrate story tagging/corridor/swatches stages in the orchestrator so `StoryTags`/overlays are produced before coastal/island/biome/climate consumers run.
4. Revisit entry-point bootstrap to pull map-size defaults from `GameInfo.Maps`/presets and to rebind tunables per run; add an integration test with the mock adapter that verifies the full pipeline executes and returns start positions.

---

## Milestone Completion Gate – End-to-End Validation

### CIV‑8 – Validate End-to-End (Gate C Complete)

**Review date:** 2025‑12‑07
**Reviewer:** AI agent (Claude Code / Opus 4)
**Branch:** `civ-8-e2e-validation`
**PR:** [#46](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/46) (DRAFT)
**Status (implementation):** Partially complete; infrastructure verified, but critical functional validation NOT performed.

#### Summary of intent

CIV-8 was designed as the **final validation gate** for the TypeScript migration milestone. Its purpose was to:
1. Run the full verification checklist from the migration plan
2. Deploy the TypeScript mod to the actual game
3. Generate maps with multiple presets and verify feature parity with the original JavaScript version
4. Document any differences or regressions

This issue is explicitly positioned as the "Final gate: Marks completion of TypeScript migration milestone."

#### Acceptance Criteria Evaluation

| Criterion | Status | Verification |
|-----------|--------|--------------|
| Type Check: `@civ7/types` allows `/base-standard/` import | ✅ Pass | `pnpm run build` succeeds |
| Type Coverage: All known APIs declared | ✅ Pass | Review confirms complete coverage |
| Core Build: `packages/mapgen-core` compiles to valid ESM | ✅ Pass | `dist/` contains valid output |
| Mod Bundle: `swooper-desert-mountains.js` generated | ✅ Pass | 8KB bundle with inlined core |
| External Imports: `/base-standard/...` preserved as external | ✅ Pass | 6 external imports in bundle |
| Deployment: `bun run deploy` copies files successfully | ⚠️ Unverified | Script exists, no evidence of execution |
| Game Load: Civ 7 loads mod without errors | ❌ NOT VERIFIED | No in-game testing evidence |
| Adapter Boundary: `/base-standard/` only in adapter | ❌ **VIOLATED** | 10 violations in `MapOrchestrator.ts` and `placement.ts` |
| Adapter Enforcement: Lint check implemented | ❌ **NOT DONE** | No lint rule added, deferred |
| Memoization: reset strategy verified, tests pass | ✅ Pass | 149 tests pass in ~170ms |
| Generate maps with multiple presets | ❌ NOT DONE | No evidence of Swooper/Classic/Temperate comparison |
| Compare to baseline JavaScript version | ❌ NOT DONE | No baseline comparison performed |
| Verify game console logs | ❌ NOT DONE | No console verification evidence |

**Overall Assessment:** CIV-8 is **incomplete**. The issue focused almost entirely on infrastructure verification (build, type-check, test suite) and cleanup (removing legacy JS), but **did not perform its core purpose**: in-game validation of feature parity.

#### What was completed

1. **Build pipeline working:**
   - Full monorepo build passes (`pnpm run build`).
   - Test suite passes: 149 tests, 48,778 expect() calls in ~170ms.
   - Mod bundle generated correctly at `mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js`.
   - `/base-standard/...` imports correctly preserved as external in the bundle.

2. **TypeScript orchestrator wired:**
   - `swooper-desert-mountains.ts` entry point created with full config.
   - Imports `bootstrap` and `MapOrchestrator` from `@swooper/mapgen-core`.
   - Wires `engine.on("RequestMapInitData")` and `engine.on("GenerateMap")`.
   - Logs TypeScript build marker on load.

3. **Legacy JavaScript removed:**
   - Commits `2d18b926` and `80ffbb52` removed all legacy JS files from `mods/mod-swooper-maps/mod/maps/`.
   - Directories `core/`, `story/`, `world/`, `layers/` are now empty (only `.` and `..`).
   - Only built output remains: `swooper-desert-mountains.js`, `gate-a-continents.js`, and `chunk-MMMXD7WB.js`.

4. **Issue doc updated:**
   - Deliverables and acceptance criteria checkboxes updated to reflect actual state.
   - Notes added about adapter boundary violations being deferred.

#### Critical gaps and problems

1. **No in-game validation performed:**
   - The entire purpose of CIV-8 was to verify feature parity by running the mod in-game.
   - None of the in-game verification steps were executed:
     - Launch Civilization VII ❌
     - Enable Swooper Maps mod ❌
     - Create new game → Select Swooper Desert Mountains ❌
     - Verify map generates without errors ❌
     - Inspect map for mountains, coasts, climate, features ❌
     - Check console for TypeScript build log ❌
     - Compare against baseline JS version ❌
   - **Without this validation, we cannot confirm the migration works in production.**

2. **Stage enablement broken (inherited from CIV-6/7):**
   - The mod entry calls `bootstrap({ stageConfig: { foundation: true, ... } })`.
   - But `buildTunablesSnapshot()` reads from `config.stageManifest`, not `config.stageConfig`.
   - `stageEnabled(stage)` returns `false` for ALL stages because `STAGE_MANIFEST.stages` is empty.
   - **Result: The entire map generation pipeline is disabled.** Even if you loaded the mod in-game, it would execute none of the custom stages.

   **Verification:**
   ```typescript
   // In tunables.ts:161-165
   const manifestConfig = config.stageManifest || {};  // ← reads stageManifest
   const stageManifest: Readonly<StageManifest> = Object.freeze({
     order: (manifestConfig.order || []) as string[],
     stages: (manifestConfig.stages || {}) as Record<string, StageDescriptor>,  // ← empty
   });

   // In tunables.ts:218-223
   export function stageEnabled(stage: string): boolean {
     const tunables = getTunables();
     const stages = tunables.STAGE_MANIFEST.stages || {};
     const entry = stages[stage];
     return !!(entry && entry.enabled !== false);  // ← always false because stages is {}
   }
   ```

3. **Adapter boundary violations:**
   - The adapter boundary grep check (`rg "/base-standard/" packages/ --glob "!**/civ7-adapter/**"`) returns **10 violations**:
     - `packages/mapgen-core/src/MapOrchestrator.ts`: 4 require() calls for `/base-standard/` modules
     - `packages/mapgen-core/src/layers/placement.ts`: 6 import statements from `/base-standard/`
   - The issue explicitly notes this as `[~]` with "follow-up issue needed", but this violates the core architectural goal of the adapter boundary pattern.
   - These violations mean the mapgen-core package cannot be tested in isolation without mocking `/base-standard/` paths.

4. **Adapter not actually used:**
   - `MapOrchestrator.createLayerAdapter()` tries `require("./core/adapters.js")` which doesn't exist.
   - Falls back to `createFallbackAdapter()` which directly accesses `GameplayMap`/`TerrainBuilder` globals.
   - The carefully designed `@civ7/adapter` package is never instantiated in the production path.
   - `Civ7Adapter` from `@civ7/adapter/civ7` goes completely unused.

5. **Biomes stage ignores context:**
   - In `MapOrchestrator.generateMap()` line 594:
     ```typescript
     designateEnhancedBiomes(iWidth, iHeight);  // ← missing ctx parameter!
     ```
   - `designateEnhancedBiomes()` accepts `ctx?` but it's not passed, forcing the function down the stub adapter path.

6. **No orchestrator integration tests:**
   - There are no tests that verify:
     - `bootstrap({ stageConfig: {...} })` enables stages
     - `orchestrator.generateMap()` actually executes stages
     - The adapter is properly instantiated
   - The 149 passing tests focus on individual modules (core, story, world, bootstrap cache/merge), not end-to-end orchestration.

#### Why this matters

CIV-8 was the **final gate** for the milestone. Its incomplete state means:

1. **We have no evidence the TypeScript migration produces working maps.** The mod compiles but may not function.

2. **The pipeline is silently disabled.** A user loading this mod would get either:
   - Errors from missing stages, or
   - A default/fallback map with no custom generation.

3. **The architectural goals of the migration are unmet:**
   - Adapter boundary is violated in core files.
   - `@civ7/adapter` package goes unused.
   - Testability is compromised by direct `/base-standard/` imports.

4. **Technical debt accumulated:** Issues deferred from CIV-6 (bootstrap resolver), CIV-7 (adapter wiring), and CIV-12/13 (biome/feature stubs) all compound here, making the E2E validation impossible without first fixing upstream issues.

#### Suggested follow-ups

**[P0 — Blocking milestone completion]:**

1. **Fix stageConfig → stageManifest mapping:**
   - Either in `bootstrap()` or `buildTunablesSnapshot()`, translate `stageConfig` into `STAGE_MANIFEST.stages`.
   - Example fix in `tunables.ts`:
     ```typescript
     const stageConfig = config.stageConfig || {};
     const stages: Record<string, StageDescriptor> = {};
     for (const [key, enabled] of Object.entries(stageConfig)) {
       if (enabled) stages[key] = { enabled: true };
     }
     const stageManifest: Readonly<StageManifest> = Object.freeze({
       order: Object.keys(stages),
       stages,
     });
     ```
   - Add a test: `bootstrap({ stageConfig: { foundation: true } })` should make `stageEnabled("foundation")` return `true`.

2. **Actually perform in-game validation:**
   - Load the mod in Civ7.
   - Generate a map with Swooper Desert Mountains preset.
   - Verify:
     - Console shows `[SWOOPER_MOD] Swooper Desert Mountains (TypeScript Build) Loaded`.
     - Console shows stage execution logs (`Starting: landmassPlates`, etc.).
     - Map has terrain features (mountains, coastlines, continents).
   - Document results with screenshots or log excerpts.

**[P1 — Should address before merging]:**

3. **Wire `@civ7/adapter/civ7` as production adapter:**
   - Remove the broken `require("./core/adapters.js")` in `MapOrchestrator.createLayerAdapter()`.
   - Import and instantiate `Civ7Adapter` from `@civ7/adapter/civ7`.
   - Use `MockAdapter` for tests only.

4. **Pass context to biomes stage:**
   - Change line 594 from `designateEnhancedBiomes(iWidth, iHeight)` to `designateEnhancedBiomes(iWidth, iHeight, ctx!)`.

5. **Add orchestrator integration test:**
   - Test that verifies full pipeline execution with mock adapter.
   - Assert stages run when enabled.
   - This would have caught the stageConfig bug.

**[P2 — Follow-up issues]:**

6. **Address adapter boundary violations:**
   - Move `/base-standard/` imports from `MapOrchestrator.ts` and `placement.ts` to `@civ7/adapter`.
   - Add methods like `generateLakes()`, `expandCoasts()`, `chooseStartSectors()` to the adapter interface.

7. **Add adapter boundary lint rule:**
   - Create a script: `pnpm lint:adapter-boundary`.
   - Fail CI if `/base-standard/` appears outside `packages/civ7-adapter/`.

---

## Future Entries

> Placeholder sections for future reviews as issues land.
> Add a dated sub-section per issue when its implementation is ready for review.

- CIV‑9 – Bun/pnpm Bridge Scripts (finalizing toolchain decisions)
