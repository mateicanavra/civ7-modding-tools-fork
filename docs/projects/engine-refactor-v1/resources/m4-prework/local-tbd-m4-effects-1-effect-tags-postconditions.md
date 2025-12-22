# Prework — `LOCAL-TBD-M4-EFFECTS-1` (Effect tags + adapter postconditions)

Goal: define a canonical `effect:*` tag catalog for engine-surface mutations (biomes/features/placement) and the minimal postcondition checks needed so these effects can participate in scheduling without “asserted but unverified” behavior.

## Relevant canon (SPEC/SPIKE)

- Engine boundary policy: adapter-only, reification-first, verified `effect:*` (SPIKE §2.5).
- Placement contract must publish `effect:engine.placementApplied` (SPIKE §2.7).
- `effect:*` is a first-class registry namespace (SPEC §3, §3.3).

## Current state (M3)

### Transitional tags

`packages/mapgen-core/src/pipeline/tags.ts` defines:
- `state:engine.biomesApplied`
- `state:engine.featuresApplied`
- `state:engine.placementApplied`

These are used as schedulable edges in `packages/mapgen-core/src/pipeline/standard.ts`.

### Providing steps and where the engine is mutated

- **Biomes**
  - Step: `packages/mapgen-core/src/pipeline/ecology/BiomesStep.ts` (`id: "biomes"`)
  - Domain: `packages/mapgen-core/src/domain/ecology/biomes/index.ts` (`designateEnhancedBiomes`)
  - Engine mutations: `ctx.adapter.designateBiomes(...)` plus `setBiomeType(...)` nudges.
- **Features**
  - Step: `packages/mapgen-core/src/pipeline/ecology/FeaturesStep.ts` (`id: "features"`)
  - Domain: `packages/mapgen-core/src/domain/ecology/features/index.ts` (`addDiverseFeatures`)
  - Engine mutations: `ctx.adapter.addFeatures(...)` plus validated `setFeatureType(...)` tweaks.
- **Placement**
  - Step: `packages/mapgen-core/src/pipeline/placement/PlacementStep.ts` (`id: "placement"`)
  - Domain: `packages/mapgen-core/src/domain/placement/index.ts` (`runPlacement`)
  - Engine mutations: late-stage engine calls via adapter (wonders/snow/resources/etc); returns `startPositions` (if `starts` provided) and appends them to the step runtime.

## Proposed `effect:*` tag catalog (seed)

These tags should be declared in the canonical registry surface (LOCAL‑TBD‑M4‑TAG‑REGISTRY‑CUTOVER) and then used to replace `state:engine.*` scheduling edges (LOCAL‑TBD‑M4‑EFFECTS‑3).

| Effect tag | Owner | Providing step | Replaces | Notes |
| --- | --- | --- | --- | --- |
| `effect:engine.biomesApplied` | ecology | `biomes` | `state:engine.biomesApplied` | Engine-first today; no TS-owned biome field buffer. |
| `effect:engine.featuresApplied` | ecology | `features` | `state:engine.featuresApplied` | Engine-first today; validated placement via `canHaveFeature`. |
| `effect:engine.placementApplied` | placement | `placement` | `state:engine.placementApplied` | Bundles multiple late-stage passes; see verification caveats below. |

## Minimal postcondition checks (API sketch)

Principle: verification should be cheap-ish, stable across content variations, and implementable for both the real Civ adapter and the mock adapter used in tests.

### `effect:engine.biomesApplied`

Existing adapter surface:
- `EngineAdapter.getBiomeType(x, y): number`
- `EngineAdapter.isWater(x, y): boolean`

Suggested verifier (mapgen-core helper; uses existing adapter API):
- Sample a fixed number of non-water tiles (or scan until N samples found).
- Assert `getBiomeType(x, y)` returns a finite integer `>= 0` for each sample.
- Optionally record a small histogram to `ctx.metrics.histograms` for debugging (no behavior change).

Rationale: this catches the “adapter not wired / always returns sentinel” class of bugs without hard-coding biome IDs.

### `effect:engine.featuresApplied`

Existing adapter surface:
- `EngineAdapter.getFeatureType(x, y): number`
- `EngineAdapter.NO_FEATURE: number`
- `EngineAdapter.isWater(x, y): boolean`

Suggested verifier:
- Sample non-water tiles; assert `getFeatureType(x, y)` returns a finite integer.
- Additionally require at least one sampled tile where `featureType !== NO_FEATURE`.

Rationale: base-standard feature generation should produce at least some non-empty features on any reasonable map; this also fails fast in mocks that never set features.

### `effect:engine.placementApplied`

Current limitation:
- `EngineAdapter` exposes placement *writes* (wonders/resources/snow/starts/etc) but has almost no placement *reads* to validate that those passes actually ran.

Minimum viable verification options (choose one; avoid “unverified” scheduling):
1) **Placement outputs artifact** (preferred, TS-owned):
   - Placement step publishes a small `artifact:placementOutputs@v1` that at minimum contains:
     - `startPositions?: number[]` (when `starts` config provided),
     - lightweight diagnostics (counts / booleans) derived from calls it already makes.
   - Verifier checks the artifact exists and matches expected shape (and expected player count when applicable).
2) **Adapter postcondition surface** (engine-read):
   - Extend adapter with a minimal read needed for verification (e.g., a “placed wonders/resources count” query),
     implemented in Civ adapter via engine globals and in MockAdapter via tracked calls.

For M4 scaffolding, option (1) keeps the engine boundary cleaner and aligns with “reification-first” while still allowing the placement step to delegate side-effects to the engine.

## Where these should be registered

Register these as `effect:*` definitions in the same registry surface as other dependency tags (not in a new global allowlist):
- Prefer registry entries adjacent to their providing steps/domains (ecology + placement) so ownership is explicit.
- Keep executor verification mapping in the registry (tag → verifier), not in `PipelineExecutor` hard-coded lists.

## Coordination / follow-ups

- LOCAL‑TBD‑M4‑TAG‑REGISTRY‑CUTOVER: add `effect:*` as a first-class kind in the registry-instantiated catalog and wire verification hooks.
- LOCAL‑TBD‑M4‑EFFECTS‑3: replace `state:engine.*` with these `effect:*` tags once verifiers exist.
- LOCAL‑TBD‑M4‑PLACEMENT‑INPUTS: if we introduce `artifact:placementOutputs@v1` for verification, keep it minimal and versioned like placement inputs.

