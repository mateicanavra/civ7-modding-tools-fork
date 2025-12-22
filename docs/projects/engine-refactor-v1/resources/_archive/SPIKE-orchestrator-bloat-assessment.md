# SPIKE: MapOrchestrator Bloat Assessment (M3) + WorldModel Cut Plan

## 0. Why this SPIKE exists

`packages/mapgen-core/src/MapOrchestrator.ts` is currently the “bridge boundary” between:

- **Target architecture:** step-owned computation using `context.artifacts` / `context.fields` (no global state).
- **Current implementation reality:** an orchestrator-centric stable slice that still wires legacy contracts.

This SPIKE answers two questions:

1. Is `MapOrchestrator` “cluttered” in a way that should be moved into steps/domain/lib now?
2. What is the cleanest **WorldModel → Foundation** migration plan that unblocks foundation work while preserving the current consumer boundary?

---

## 1. Architectural baseline (target vs current)

### 1.1 Target: no globals, artifacts/fields as the blackboard

Per target architecture:

- The legacy `WorldModel` singleton is **banned** in new code.
- New steps must read/write strictly to `context.artifacts` or `context.fields`.
- Orchestrator may temporarily act as a bridge by syncing legacy state for legacy consumers.

See:
- `docs/system/libs/mapgen/architecture.md:234` (No Global State)
- `docs/system/libs/mapgen/architecture.md:238` (Bridge Strategy)

### 1.2 Current: M3 wrap-first + FoundationContext bridge

Today’s M2/M3 stable slice publishes a **read-only `FoundationContext` snapshot** for downstream consumers (instead of the target multi-artifact foundation model).

See:
- `docs/system/libs/mapgen/foundation.md:17` (current slice is orchestrator-centric)
- `packages/mapgen-core/src/MapOrchestrator.ts:630` (`initializeFoundation()` sets `ctx.foundation`)
- `packages/mapgen-core/src/pipeline/tags.ts:69` (`artifact:foundation` is satisfied by `ctx.foundation != null`)

---

## 2. MapOrchestrator assessment: real bloat vs structural coupling

### 2.1 There is some real “bloat” (hygiene)

`MapOrchestrator` contains obvious “cleanupable” items (dead imports, unused helpers, etc.). These are worthwhile but not the core architecture issue.

### 2.2 The bigger issue is structural: a hidden runtime blackboard

The orchestrator currently injects a large “runtime bundle” into `registerStandardLibrary(...)`, and steps communicate through that runtime rather than publishing explicit artifacts/fields.

This is a structural mismatch with target architecture:

- It obscures step contracts (data provenance is not `ctx.artifacts` / `ctx.fields`).
- It encourages cross-step mutation (e.g., “mutable landmass bounds” for placement).
- It historically duplicated enablement logic (stage gating split between the derived recipe list and `shouldRun()`); this is now resolved in-repo (CIV-53 / DEF-013).

Key example wiring:
- `packages/mapgen-core/src/MapOrchestrator.ts:439` (`registerStandardLibrary(registry, config, { ... })`)

### 2.3 WorldModel is currently a generator, not just a sink

Today, `MapOrchestrator.initializeFoundation()` initializes `WorldModel`, then snapshots it into `FoundationContext`:

- `packages/mapgen-core/src/MapOrchestrator.ts:634` binds config provider + calls `WorldModel.init()`
- `packages/mapgen-core/src/core/types.ts:391` creates the `FoundationContext` snapshot from a `WorldModelState`

This makes foundation work feel “blocked by orchestrator”: the foundation producer lives behind a singleton plus orchestrator wiring.

---

## 3. Decision: WorldModel cut plan (LOCKED)

We are locking in a “fast cut” plan that avoids maintaining multiple algorithmic code paths.

### 3.0 Scope and commitments (to avoid stochastic execution)

This SPIKE contains both (a) **locked decisions** and (b) **deferred questions**. To keep execution deterministic:

- **Committed in Phase A (this effort):** (1) standardize RNG on the adapter surface (no `Math.random`, no direct `TerrainBuilder` usage in mapgen-core) and (2) the WorldModel → Foundation producer cut, while keeping `ctx.foundation` as the compatibility boundary.
- **Explicitly not committed here:** orchestrator hygiene cleanups, recipe/enablement restructuring, and the full “graph + multi-artifact foundation” target refactor.

### 3.1 The plan

**Phase A (now): move computation into foundation (step-owned), keep compatibility snapshot**

- Move all “WorldModel math/logic” into the **Foundation stage implementation** (step-owned modules).
- Keep publishing **`ctx.foundation: FoundationContext`** as the stable consumer boundary (satisfies `artifact:foundation`).
- Deprecate `WorldModel` as a *generator*; stop calling `WorldModel.init()` from the orchestrator.

**Phase B (later, tracked by foundation PRD): migrate to target artifacts/graphs**

- Replace the monolithic `FoundationContext` dependency with proper foundation artifacts:
  - `context.artifacts.mesh`
  - `context.artifacts.crust`
  - `context.artifacts.plateGraph`
  - `context.artifacts.tectonics`
- Migrate consumers off `ctx.foundation` to those artifacts. Any “rasterized views” that consumers still need MUST become explicit artifacts with named contracts (exact set + ownership is a Phase B decision).

This work is explicitly tracked separately (canonical PRD: `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`).

**Phase A acceptance criteria (explicit)**

- `MapOrchestrator.initializeFoundation()` no longer calls `WorldModel.init()` (or any equivalent producer path).
- The Foundation stage becomes the **only** canonical producer of foundation signals (even if the internal code is still “tile-ish” for now).
- `ctx.foundation` continues to be populated and satisfies `artifact:foundation` exactly as today (types/shape; value parity is not a deliverable unless separately gated).
- Any existing internal consumers that still read `WorldModel` MUST be migrated to read `ctx.foundation` as part of Phase A, so we do not keep a second producer/sink path alive.

### 3.2 Explicitly “not finished” / intentional transitional state

In Phase A we will **intentionally leave the system in a transitional state**:

- `ctx.foundation` remains the primary contract even though it does not match the target “multi-artifact / graph-based” foundation model.
- The purpose of Phase A is to **move ownership** (math and sequencing) into foundation steps without forcing immediate downstream churn.
- This MUST be revisited and changed when the separate Foundation Stage PRD work begins.

**WorldModel status after Phase A (intentionally incomplete)**
- `WorldModel` is no longer initialized or used as a producer by the orchestrator.
- `WorldModel` MUST NOT be used as a compatibility sink in Phase A; any remaining readers must migrate to `ctx.foundation` instead of keeping dual pathways alive.
- No new code may read from `WorldModel`; modern steps read from `ctx.foundation` / artifacts/fields only.

**Non-goals for this SPIKE / Phase A**
- No attempt to model mesh/crust/plateGraph/tectonics as canonical graph artifacts yet.
- No attempt to “perfect” the types expansion; we preserve the current `FoundationContext` contract.

### 3.3 Why this avoids “two code paths”

The key is: we do **not** keep `WorldModel` producing the canonical signals in parallel with a new foundation pipeline.

Instead:

- Foundation step-owned code is the **single producer**.
- `FoundationContext` is a derived/serialized compatibility view until consumers migrate.

This is consistent with the bridge strategy: concentrate debt at the orchestrator boundary, then delete it.

---

## 4. RNG / determinism implications (important boundary condition)

### 4.1 What RNG does “TerrainBuilder.getRandomNumber” represent?

In Civ7 runtime, `TerrainBuilder.getRandomNumber(max, label)` is an engine-provided RNG entrypoint (native/engine surface).

In-repo evidence:

- `packages/civ7-adapter/src/civ7-adapter.ts:155` implements `EngineAdapter.getRandomNumber` by calling `TerrainBuilder.getRandomNumber`.
- `packages/mapgen-core/src/core/types.ts:261` defines `ctxRandom(ctx, label, max)` which calls `ctx.adapter.getRandomNumber(...)` and tracks label call counts.

So: **our current “ctx RNG” is the engine RNG via the adapter**. `ctx.rng` is currently bookkeeping (`callCounts`), not an independent PRNG stream.

### 4.2 Is the same RNG used elsewhere?

Yes. A large portion of modernized TS code already uses `adapter.getRandomNumber(...)` (and therefore `TerrainBuilder.getRandomNumber`) directly or via `ctxRandom(...)`.

Examples:
- `packages/mapgen-core/src/domain/morphology/volcanoes/apply.ts:99`
- `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts:79`
- `packages/mapgen-core/src/domain/ecology/biomes/index.ts:120`
- `packages/mapgen-core/src/domain/ecology/features/index.ts:85`
- `packages/mapgen-core/src/domain/hydrology/climate/runtime.ts:49`

### 4.3 WorldModel’s current behavior

WorldModel currently selects a default RNG:

- Prefers `TerrainBuilder.getRandomNumber` if present.
- Falls back to `Math.random` otherwise.

See: `packages/mapgen-core/src/world/model.ts:457`

This fallback is legacy behavior and is incompatible with the locked RNG standardization decision below; it must be removed by requiring an injected adapter-backed RNG in any remaining WorldModel code.

### 4.4 Risk: stray `Math.random` usage in “world” code

Some world/plate code still uses `Math.random` directly in places that may affect determinism or parity if the engine’s JS `Math.random` is not seeded/stable.

Example: `packages/mapgen-core/src/world/plates.ts:714` uses `Math.random()` while building plate regions.

### 4.5 Decision: standardize RNG on EngineAdapter (LOCKED)

We will standardize all mapgen randomness on the Civ7 adapter RNG surface:

- `packages/civ7-adapter/src/civ7-adapter.ts` is the **only** place allowed to call `TerrainBuilder.getRandomNumber(...)`.
- `packages/mapgen-core/**` MUST NOT call `TerrainBuilder.*` directly.
- `packages/mapgen-core/**` MUST NOT call `Math.random()` (anywhere).

**Approved RNG APIs (the only allowed call sites)**

- Step/domain code uses `ctxRandom(ctx, label, max)` (`packages/mapgen-core/src/core/types.ts:261`).
- Adapter boundary code MAY ONLY call `ctx.adapter.getRandomNumber(max, label)` directly when a `GenerationContext` is not available; otherwise it MUST use `ctxRandom(...)`.
- Pure functions that cannot accept `ctx` accept an injected `rngNextInt(max, label)` function (wired from `ctxRandom` at the boundary).

**Phase A RNG contract (explicit)**

- Any code moved into the Foundation stage in Phase A MUST use the approved RNG APIs above and MUST NOT call `Math.random`.
- Phase A does **not** promise output parity; it promises architectural ownership movement. If parity becomes a hard requirement, Phase A must be gated by an explicit parity plan (labels, call order stability, and any necessary golden tests).

### 4.6 We attempted to confirm engine-side semantics from extracted civ resources

We searched `.civ7/outputs/resources/Base/modules` for `TerrainBuilder` / `getRandomNumber` references and did not find any. This strongly suggests `TerrainBuilder` is a native surface (not implemented in shipped JS modules) and its semantics must be treated as “engine contract”, not something we can inspect in extracted JS.

---

## 5. Practical next steps (deterministic execution order)

### 5.1 Phase A slices (locked sequence + rationale)

**Slice 1: Contract enforcement + fail-fast gating**
- **Work:** Enforce `ctx.foundation` presence and required fields at stage boundaries; remove silent fallbacks; ensure `foundation.dynamics` is always present via schema defaults or required fields; add fail-fast validation on publish (array presence/size, non-null).
- **Why first:** Establishes the contract we will preserve during the cutover and surfaces missing data early; prevents hidden behavior changes from being masked by fallbacks.
- **Dependencies:** None; this sets the baseline for all later slices.
- **Contract enforcement details:** Apply schema-level defaults/requirements for `foundation.dynamics` (no code fallbacks). Add runtime validation at `ctx.foundation` publish time (orchestrator/producer boundary) for presence, non-null arrays, and expected dimensions (plates + dynamics tensors match map sizes).
- **Done checks (mechanical):**
  - No code-level fallbacks for missing `ctx.foundation` or `foundation.dynamics`.
  - `foundation.dynamics` is always present via schema defaults or required fields (no implicit creation in runtime code).
  - `ctx.foundation` publish path validates array presence and expected sizes.
- **Done checks (contextual):** Foundation contract is explicit and enforced; downstream stages either receive guaranteed data or fail fast at the boundary.
- **Test expectations:** Update any tests that relied on implicit fallbacks to expect failures when `ctx.foundation`/`dynamics` is missing; add/adjust a targeted test that asserts `ctx.foundation` validation fails on missing/incorrectly sized tensors.
- **Do not:** Add hidden defaults in code; keep silent fallbacks; enforce contracts only in downstream stages (enforce at the producer boundary).
- **Expected impact / what changes:** Clear, enforceable foundation contract; missing data surfaces immediately; downstream behavior becomes deterministic w.r.t. contract presence.
- **Why it matters / unblocks:** Establishes the stable contract needed before RNG cleanup and producer cutover; avoids ambiguous failures later.

**Slice 2: RNG standardization**
- **Work:** Eliminate `Math.random()` usage in `packages/mapgen-core/**`; route all randomness through `ctxRandom` / `ctx.adapter.getRandomNumber`; update tests to stub adapter RNG.
- **Why second:** Stabilizes randomness semantics before moving producer logic; reduces churn and nondeterminism during later refactors.
- **Dependencies:** Requires the adapter RNG contract; should be completed before producer cutover to avoid dual RNG migrations.
- **Contract enforcement details:** RNG is only accessed through `ctxRandom` or injected `rngNextInt` wired from `ctxRandom`; adapter is the single engine RNG surface.
- **Done checks (mechanical):**
  - `rg "Math\\.random"` returns no hits in `packages/mapgen-core/**`.
  - `rg "TerrainBuilder\\.getRandomNumber"` returns no hits in `packages/mapgen-core/**`.
  - All RNG call sites use `ctxRandom` or injected `rngNextInt`.
- **Done checks (contextual):** All randomness flows through the adapter boundary; determinism and call labeling are centralized.
- **Test expectations:** Update test RNG stubs in `packages/mapgen-core/test/**` to stub adapter RNG; ensure RNG-dependent tests still pass without `Math.random` fallbacks.
- **Do not:** Introduce alternate RNG providers or new fallbacks; call `Math.random` in tests to bypass adapter RNG; add multiple RNG streams without a decision.
- **Expected impact / what changes:** RNG boundary becomes explicit and testable; adapter becomes the single source of randomness; removes hidden nondeterminism.
- **Why it matters / unblocks:** Prevents RNG semantics drift during the producer cutover; simplifies auditing and future parity efforts.

**Slice 3: Adapter boundary cleanup (TerrainBuilder removal)**
- **Work:** Remove all direct `TerrainBuilder.*` usage in `packages/mapgen-core/**`; route rainfall writes through `ctx.adapter.setRainfall`; keep behavior intact.
- **Why third:** Cleans engine boundary before the producer cutover; removes hidden globals so the new foundation implementation can operate through the adapter surface only.
- **Dependencies:** Relies on adapter APIs being available; pairs naturally after RNG standardization.
- **Contract enforcement details:** All engine reads/writes in mapgen-core are accessed via adapter methods; `TerrainBuilder` is only used inside `packages/civ7-adapter/**`.
- **Done checks (mechanical):**
  - `rg "TerrainBuilder\\." packages/mapgen-core` returns no runtime hits.
  - Rainfall writes in `domain/narrative/paleo/rainfall-artifacts.ts` go through `ctx.adapter.setRainfall`.
- **Done checks (contextual):** Engine boundary is explicit; mapgen-core has no implicit access to engine globals.
- **Test expectations:** Update any tests that referenced `globalThis.TerrainBuilder` to stub adapter methods instead; no new tests required beyond boundary coverage.
- **Do not:** Keep any direct `TerrainBuilder` usage in mapgen-core; create adapter bypasses for convenience; re-architect rainfall generation here (deferred).
- **Expected impact / what changes:** Clear engine boundary; adapter is the only bridge to engine state; global coupling is reduced.
- **Why it matters / unblocks:** Makes the producer cutover possible without leaking engine globals; keeps future engine decoupling feasible.

**Slice 4: WorldModel producer cutover**
- **Work:** Move producer logic into the foundation stage; stop calling `WorldModel.init()`; remove `ctx.worldModel`; update tests to assert `ctx.foundation` outputs; migrate remaining `WorldModel` readers.
- **Why last:** Depends on explicit contracts, standardized RNG, and clean adapter boundaries to avoid hidden optionality; minimizes the number of moving parts during the cut.
- **Dependencies:** Slices 1–3 should land first.
- **Contract enforcement details:** `ctx.foundation` is the only published foundation product; `WorldModel` is not initialized, not published, and not used as a sink.
- **Done checks (mechanical):**
  - `MapOrchestrator.initializeFoundation()` no longer calls `WorldModel.init()`.
  - `ctx.worldModel` is removed from `MapGenContext` and any runtime code references.
  - Tests in `packages/mapgen-core/test/orchestrator/*` that asserted `WorldModel` now assert `ctx.foundation`.
- **Done checks (contextual):** Foundation is produced by step-owned code; no dual producer/sink path remains.
- **Test expectations:** Update listed WorldModel tests to assert `ctx.foundation`; add/adjust a focused test that fails if `WorldModel` is referenced during the foundation stage.
- **Do not:** Keep `WorldModel` as a compatibility sink; leave dual paths in place; add hidden fallbacks back to `WorldModel`.
- **Expected impact / what changes:** Removes global singleton from the production path; foundation ownership moves into steps; orchestrator becomes a thinner boundary.
- **Why it matters / unblocks:** Clears the way for Phase B artifact refactor without carrying a legacy producer path.

### Follow-ups (explicitly NOT part of Phase A)

- Orchestrator hygiene: dead imports/helpers removal and local code cleanup.
- Enablement correctness: remove redundant stage gating where the recipe already filters by `stageManifest` (avoid two sources of truth).
- Foundation Stage PRD (Phase B): introduce canonical graph artifacts (`mesh`, `crust`, `plateGraph`, `tectonics`) and migrate consumers; replace the `FoundationContext` dependency with explicit artifacts.

---

## 6. Deferred questions / stubs (explicitly NOT blockers for Phase A)

### 6.1 Parity contract for RNG (only if parity becomes a deliverable)

**Question:** Is output parity required for the WorldModel cut and/or foundation refactor, or are small deltas acceptable?

**Default assumption for Phase A:** small deltas are acceptable; do not block Phase A on parity.

### 6.2 “What replaces FoundationContext?” (target alignment)

**Question:** What is the canonical post-refactor foundation API surface?

**Stub (to be decided in Phase B / PRD):**

- Define the canonical artifact set (graphs and any canonical raster artifacts), and define which layers own rasterization (foundation vs consumer vs dedicated adapter/bridge step).

This is part of the separate Foundation Stage PRD effort.

---

## 7. Readiness inventory (repo scan results)

This section is a repo-grounded checklist of remaining work inputs for Phase A execution planning. It is intentionally factual and does not propose solutions.

### 7.1 WorldModel usage (code + tests)

**Runtime code (direct usage / production path):**
- `packages/mapgen-core/src/MapOrchestrator.ts`: resets and initializes `WorldModel`, binds config provider, assigns `ctx.worldModel`, and builds `ctx.foundation` via `createFoundationContext(...)`.
- `packages/mapgen-core/src/core/types.ts`: `createFoundationContext(...)` reads `WorldModelState` arrays and throws if not initialized.
- `packages/mapgen-core/src/world/model.ts`: `WorldModel` singleton implementation and RNG selection.
- `packages/mapgen-core/src/world/plates.ts`: plate generation helpers used by `WorldModel`.

**Tests that assert WorldModel state or behavior:**
- `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts`
- `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts`
- `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts`
- `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts`
- `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`
- `packages/mapgen-core/test/world/config-provider.test.ts`

**Non-mapgen-core usage:**
- No non-mapgen-core packages reference `WorldModel` in code (docs only).

**Impact + decisions (Phase A readiness):**
- **Integration impact:** `WorldModel` still acts as the producer for `ctx.foundation`, and tests assert `WorldModel` state/logs. This keeps a hidden producer path alive and forces downstream reasoning about a global singleton.
- **Decision (single path):** Remove `ctx.worldModel` from `MapGenContext` and eliminate `WorldModel` as a producer or compatibility sink. After Phase A, any reference to `WorldModel` in runtime code is a bug, not a fallback.
- **Low-risk work now:** Move the producer logic into a step-owned foundation implementation that builds `ctx.foundation` directly; update tests to assert `ctx.foundation` outputs rather than `WorldModel` state.
- **Contract-level move:** Preserve the existing `FoundationContext` shape/fields and publish it from the new foundation code; behavior may shift, but contract parity is required.
- **Explicitly deferred:** Replacing the underlying plate/physics algorithms with the mesh/crust/plateGraph/tectonics design (Phase B / PRD).

### 7.2 FoundationContext consumers (runtime)

**Morphology:**
- `packages/mapgen-core/src/domain/morphology/landmass/index.ts` (requires `ctx.foundation`, plate-derived landmass shaping)
- `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/apply.ts` (reads `foundation.plates.boundaryCloseness`)
- `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts` (reads `boundaryCloseness`/`boundaryType`)
- `packages/mapgen-core/src/domain/morphology/mountains/apply.ts` (plate-based scoring + rift depressions)
- `packages/mapgen-core/src/domain/morphology/volcanoes/apply.ts` (plate-driven placement)

**Narrative:**
- `packages/mapgen-core/src/domain/narrative/orogeny/belts.ts` (requires `foundation.plates` and `foundation.dynamics` for windward/lee tagging)

**Climate / Hydrology (dynamics):**
- `packages/mapgen-core/src/domain/hydrology/climate/swatches/monsoon-bias.ts` (windU/windV)
- `packages/mapgen-core/src/domain/hydrology/climate/refine/orographic-shadow.ts` (windU/windV)
- `packages/mapgen-core/src/domain/hydrology/climate/orographic-shadow.ts` (windU/windV)

**Implication for Phase A:** `ctx.foundation` must preserve both plates tensors and `dynamics` (windU/windV/current/pressure) to avoid silent behavior changes in climate/story passes.

**Impact + decisions (Phase A readiness):**
- **Integration impact:** Morphology, narrative, and climate stages assume plate tensors and `dynamics` are present. Missing `dynamics` changes outputs via silent fallback.
- **Decision (single path):** Enforce `ctx.foundation` presence and required fields at stage boundaries; remove silent fallbacks. Defaults must live in schema/contract, not in code.
- **Low-risk work now:** Add fail-fast validation when publishing `ctx.foundation` (e.g., non-null arrays, expected sizes); update any consumer-side fallbacks to hard errors when `foundation` or `dynamics` are missing.
- **Contract-level move (selected path):** Treat `FoundationContext` as the authoritative compatibility product for Phase A; guarantee `dynamics` by ensuring `foundation.dynamics` is always present via schema defaults or required fields (no implicit fallback).
- **Explicitly deferred:** Any change to the `FoundationContext` shape or removal of `dynamics` as a concept (Phase B / PRD decision).

### 7.3 RNG standardization: remaining direct `Math.random` call sites

**Runtime code:**
- `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts` (fallback in `getRandom`)
- `packages/mapgen-core/src/domain/morphology/islands/placement.ts` (fallback in `getRandom`)
- `packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts` (fallback RNG for crust assignment/noise)
- `packages/mapgen-core/src/domain/narrative/utils/rng.ts` (fallback to `Math.random`)
- `packages/mapgen-core/src/world/plates.ts` (fallback RNG and direct `Math.random()` vector)
- `packages/mapgen-core/src/world/model.ts` (fallback RNG to `Math.random`)

**Tests:**
- `packages/mapgen-core/test/setup.ts` (mock `TerrainBuilder.getRandomNumber` uses `Math.random`)
- `packages/mapgen-core/test/layers/callsite-fixes.test.ts` (mock RNG uses `Math.random`)

**Impact + decisions (Phase A readiness):**
- **Integration impact:** `Math.random` and direct `TerrainBuilder` usage break the adapter boundary and can defeat determinism. Tests also encode this leakage.
- **Decision (single path):** Standardize on the adapter RNG (`ctx.adapter.getRandomNumber` via `ctxRandom`). No `Math.random` anywhere in `mapgen-core`.
- **Low-risk work now:** Mechanical replacement of `Math.random`/fallback RNGs with `ctxRandom` or injected `rngNextInt` (wired from `ctxRandom`); update tests to stub adapter RNG.
- **Contract-level move:** Pure domain helpers accept an injected `rngNextInt(max, label)` so they remain context-free while still using the same RNG stream.
- **Explicitly deferred:** Any attempt to preserve exact output parity by aligning RNG call ordering/labels across the pipeline (only required if parity becomes a hard requirement).

### 7.4 TerrainBuilder usage in mapgen-core (outside adapter)

**Runtime code (global access):**
- `packages/mapgen-core/src/world/model.ts` (selects `TerrainBuilder.getRandomNumber` as RNG)
- `packages/mapgen-core/src/world/plates.ts` (uses `globalThis.TerrainBuilder.getRandomNumber` in RNG fallback)
- `packages/mapgen-core/src/domain/narrative/utils/rng.ts` (direct `TerrainBuilder.getRandomNumber`)
- `packages/mapgen-core/src/domain/narrative/paleo/rainfall-artifacts.ts` (direct `TerrainBuilder.setRainfall`)

**Non-runtime / tooling:**
- `packages/mapgen-core/src/dev/introspection.ts` (logs TerrainBuilder API surface; no direct mutations)

**Implication for Phase A:** RNG standardization requires removing all direct `TerrainBuilder.*` usage from `packages/mapgen-core/**` or routing it through the adapter boundary.

**Impact + decisions (Phase A readiness):**
- **Integration impact:** Direct `TerrainBuilder` calls bypass the adapter boundary and lock us to engine globals; this is inconsistent with the target architecture and complicates testing.
- **Decision (single path):** All engine writes/reads in `mapgen-core` go through the adapter. Direct `TerrainBuilder` usage is removed, not hidden.
- **Low-risk work now:** Route rainfall writes in `domain/narrative/paleo/rainfall-artifacts.ts` through `ctx.adapter.setRainfall` (adapter already exposes `setRainfall`); keep behavior intact.
- **Contract-level move:** Keep rainfall generation logic but correct the boundary by threading the adapter/ctx into the runtime helper.
- **Explicitly deferred:** Re-architect rainfall generation to be fully engine-independent (tracked as a deferral in `docs/projects/engine-refactor-v1/deferrals.md` under DEF-010).
