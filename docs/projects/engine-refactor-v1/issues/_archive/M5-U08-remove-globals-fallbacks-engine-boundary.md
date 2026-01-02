---
id: M5-U08
title: "[M5] Remove ambient globals and silent fallbacks (make the engine boundary boring)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Eliminate “it works because of globals/fallbacks” from runtime semantics by replacing ambient patterns with explicit wiring and explicit contracts.

## Goal

Make the engine boundary boring and predictable. Missing capabilities fail fast with clear errors, rather than silently degrading or warning+defaulting.

## Deliverables

- Replace `globalThis`-based runtime detection on hot paths with explicit wiring.
- Remove or scope module-level cached constants that act as process-wide hidden state.
- Replace “fallback constants + warnings” patterns with explicit adapter requirements and/or explicit run wiring.

## Acceptance Criteria

- Core has no `globalThis`-based runtime detection on hot paths.
- Adapter capability requirements are explicit; missing capability fails fast with a clear error.
- Process-wide cached constants are removed or scoped per run/adapter instance with explicit contracts.

## Testing / Verification

- Standard smoke test remains green under `MockAdapter`.
- A failing adapter capability produces a clear, deterministic error (tests added where appropriate).

## Dependencies / Notes

- **Paper trail:** CIV-67 risk notes + M5 spike.
- **Sequencing:** overlaps extraction; easier once M5-U02–U06 establish ownership boundaries.
- **Complexity × parallelism:** medium complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer explicit “required adapter capabilities” over environment sniffing.
- Keep civ-runtime-only integration in civ adapter packages, not in core.

## Prework Findings (Complete)

Goal: enumerate remaining ambient/global patterns and propose explicit replacements that make missing capabilities fail fast (no “it works because globals exist”).

### 1) Inventory: remaining ambient patterns (mapgen-core)

#### A) `globalThis` / ambient-global detection

```yaml
ambientPatterns:
  globalThisDetection:
    - location: packages/mapgen-core/src/foundation/plates.ts
      pattern: 'Reads globalThis.VoronoiUtils (via adaptGlobalVoronoiUtils()); supports setDefaultVoronoiUtils(...) injection'
      correctnessCritical: true
      notes: Foundation output quality + determinism depends on the Voronoi implementation used; global fallback is an ambient dependency surface.
    - location: packages/mapgen-core/src/foundation/plate-seed.ts
      pattern: 'Reads globalThis.RandomImpl to capture/restore RNG state (getRandomImpl())'
      correctnessCritical: true
      notes: Implicitly depends on engine-provided RNG impl; in non-engine contexts it becomes a silent no-op.
    - location: packages/mapgen-core/src/dev/introspection.ts
      pattern: Reads globalThis to introspect engine globals
      correctnessCritical: false
      notes: Dev-only; should remain explicitly fenced.
    - location: packages/mapgen-core/src/polyfills/text-encoder.ts
      pattern: 'typeof globalThis.TextEncoder === "undefined"'
      correctnessCritical: false
      notes: Intentional runtime polyfill; not a hidden dependency for correctness.
```

#### B) Module-level caches / process-wide hidden state

```yaml
ambientPatterns:
  processWideState:
    - location: packages/mapgen-core/src/core/terrain-constants.ts
      pattern: Module-scoped cached constants + fallback warning set; reinitializes on adapter change
      correctnessCritical: true
      notes: Terrain/biome/feature index mismatches are correctness issues; fallback+warning can mask real miswiring.
    - location: packages/mapgen-core/src/domain/narrative/overlays/index.ts
      pattern: In-memory registries/caches with explicit reset*() calls from runTaskGraphGeneration
      correctnessCritical: true
      notes: Reset discipline helps, but process-wide caches are still a hidden dependency surface. M5 makes these run-scoped (no module globals; no hot-path reset*()).
```

### 2) Replacement contracts (explicit wiring)

#### A) Voronoi utilities (replace `globalThis.VoronoiUtils`)

Decision (locked for M5): replace with an explicit adapter capability:
- Extend `EngineAdapter` with `getVoronoiUtils(): VoronoiUtilsInterface` (or equivalent) and delete the `globalThis.VoronoiUtils` probing path.
- `Civ7Adapter` returns the engine implementation; `MockAdapter` returns a deterministic pure‑TS implementation.

Implementation rule of thumb:
- In “standard pipeline” runs, Voronoi utils must be provided explicitly; missing capability should throw early in foundation (fail fast).
- In unit tests, the MockAdapter (or test harness) provides a deterministic implementation explicitly.

#### B) Seed control (replace `globalThis.RandomImpl` detection)

Decision (locked for M5): delete engine-RNG probing from core:
- `@swooper/mapgen-core` must not read `globalThis.RandomImpl` (or equivalent) for correctness.
- Deterministic randomness for TS algorithms comes from the run context RNG (`ctx.rng`) seeded/configured explicitly.
- Any engine-only RNG state management (if it still exists) is owned by the Civ adapter implementation, not by domain logic.

#### C) Terrain constant initialization + fallbacks

Replace “fallback + warn” with explicit adapter requirements:
- Treat missing indices (`getTerrainTypeIndex`, `getBiomeGlobal`, `getFeatureTypeIndex`) as an adapter capability failure in production runs.
- Keep a clearly scoped test-only fallback (e.g., MockAdapter sets explicit indices), but avoid module-level “silently accept mismatch” behavior.

#### D) Narrative caches / reset hooks

Decision (locked for M5): no process‑wide narrative caches in core:
- Convert narrative caches to **run‑scoped** state owned by the standard mod (or explicitly published artifacts), so a run creates/owns its cache state instead of relying on module globals.
- Delete `reset*()` calls from core entrypoints/hot paths; if a cache exists, it is instantiated per run (no “remember to reset” discipline).

### 3) Prioritization (correctness vs convenience)

Correctness-critical (should be addressed early):
- Voronoi utils global detection (foundation correctness surface)
- Seed control global detection (determinism surface)
- Terrain constants fallback+warning (can hide adapter wiring errors)
 
Required cleanup once extraction stabilizes:
- Narrative caches / reset hooks (remove process‑wide state; make run‑scoped)

### 4) Suggested scoping queries

- `rg -n \"\\bglobalThis\\b\" packages/mapgen-core/src`
- `rg -n \"fallback\\b|\\bwarn\\b\" packages/mapgen-core/src/core/terrain-constants.ts`
- `rg -n \"resetStoryOverlays|resetOrogenyCache|resetCorridorStyleCache\" packages/mapgen-core/src`

## Implementation Decisions

### Make Voronoi utilities an explicit adapter capability
- **Context:** Foundation previously relied on `globalThis.VoronoiUtils` and a global injection path, which made correctness depend on ambient runtime state.
- **Options:** (A) Keep global probing + “best effort” fallback, (B) require an explicit `EngineAdapter.getVoronoiUtils()` capability.
- **Choice:** (B) require `getVoronoiUtils()`; remove global probing/injection.
- **Rationale:** Aligns with the target architecture’s “boring engine boundary”: missing capabilities fail fast and wiring is explicit.
- **Risk:** Any adapter implementation missing the new method will fail to compile/run until updated (intended breaking change).

### Remove engine RNG probing from core (no `globalThis.RandomImpl`)
- **Context:** Foundation seed management previously probed engine RNG globals and attempted to capture/restore RNG state.
- **Options:** (A) Keep probing and “noop if absent”, (B) treat RNG as a run-scoped input (`ctx.rng`) and keep engine-only RNG details inside the Civ adapter layer.
- **Choice:** (B) remove probing and treat TS RNG as the only deterministic source for domain logic.
- **Rationale:** Prevents hidden engine coupling from leaking into algorithms and tests; aligns with “core has no ambient globals on hot paths”.
- **Risk:** If any downstream behavior relied on engine RNG side effects, it will now require explicit adapter-side support.

### Make story caches run-scoped (no reset discipline)
- **Context:** The TaskGraph entrypoint reset story overlays and narrative caches each run to prevent cross-run leakage.
- **Options:** (A) Keep process-wide caches + reset hooks, (B) make caches run-scoped via `ctx`-owned artifact/overlay stores and stop requiring reset calls.
- **Choice:** (B) remove reset hooks from `runTaskGraphGeneration`; remove reset helpers for orogeny/corridor style cache.
- **Rationale:** A “remember to reset” discipline is a hidden dependency surface; run-scoped state is boring by construction.
- **Risk:** If any cache was accidentally still process-wide, this would surface as cross-test contamination; mitigated by keeping caches on `ctx` artifacts/overlays.
