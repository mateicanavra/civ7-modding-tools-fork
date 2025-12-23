# Prework — `LOCAL-TBD-M4-EFFECTS-2` (Reify biomes/features fields + verify effects)

Goal: make biome/feature outcomes explicit and TS-readable (fields) and make the corresponding `effect:*` tags verifiable without relying on implicit “read engine later” coupling.

## Current state (what’s true today)

- `ExtendedMapContext` preallocates buffers for:
  - `ctx.fields.biomeId: Uint8Array`
  - `ctx.fields.featureType: Int16Array`
  - (`packages/mapgen-core/src/core/types.ts`)
- Biomes and features are **engine-first** today:
  - Biomes: `designateEnhancedBiomes()` calls `adapter.designateBiomes(...)` and nudges via `setBiomeType(...)` (`packages/mapgen-core/src/domain/ecology/biomes/index.ts`).
  - Features: `addDiverseFeatures()` calls `adapter.addFeatures(...)` and tweaks via `setFeatureType(...)` (`packages/mapgen-core/src/domain/ecology/features/index.ts`).
- **Cross-step engine read exists today**:
  - Features reads engine biome state via `adapter.getBiomeType(x, y)` to decide vegetation/density tweaks (`packages/mapgen-core/src/domain/ecology/features/index.ts`).
  - This is the “implicit engine dependency” that reification is meant to eliminate.

## Proposed reification plan (mechanical)

### 1) Biomes publishes a biome field

Publish:
- `field:biomeId` (existing M3 tag string exists, but should become “published”, not “always satisfied”).
- `effect:engine.biomesApplied` (defined in LOCAL‑TBD‑M4‑EFFECTS‑1).

Reify-after-mutate:
- After `designateEnhancedBiomes(...)` completes, fill `ctx.fields.biomeId[idx] = adapter.getBiomeType(x, y)` for every tile.
  - Use the existing `Uint8Array` field; revisit only if we discover biome IDs outside `0..255`.

### 2) Features consumes the reified biome field, then publishes a feature field

Consume:
- Replace reads of `adapter.getBiomeType(x, y)` in features logic with reads from the reified buffer: `ctx.fields.biomeId[idx]`.
  - This removes the cross-step “read engine later” dependency for biome state.

Publish:
- `field:featureType` (existing M3 tag string exists; same “published vs always satisfied” caveat).
- `effect:engine.featuresApplied`.

Reify-after-mutate:
- After `addDiverseFeatures(...)` completes, fill `ctx.fields.featureType[idx] = adapter.getFeatureType(x, y)` for every tile.

### Important caveat: current field tags are “always satisfied”

In M3, `isDependencyTagSatisfied()` treats `field:*` as satisfied if the buffer exists (which is true from context creation), so `field:biomeId`/`field:featureType` cannot currently act as meaningful scheduling/validation edges.

For M4, the executor/registry should treat field tags like published products:
- A step “provides” `field:*`, and the executor marks it satisfied after the step runs (similar to `state:engine.*` today).
- Optional: add lightweight verification that the buffer has been populated (e.g., sampled values are finite integers in range).

## Consumer map (what must switch off engine reads)

Current engine biome reads:
- `packages/mapgen-core/src/domain/ecology/features/index.ts`
  - `adapter.getBiomeType(x, y)` → should read from `ctx.fields.biomeId[idx]` once biomes reifies it.

Optional / non-pipeline consumers (nice-to-have, not required for correctness):
- `packages/mapgen-core/src/dev/ascii.ts` and `packages/mapgen-core/src/dev/summaries.ts`
  - Could be updated to use `ctx.fields.*` for consistency once fields are canonical.

## Minimal postcondition checklist (verifiable `effect:*`)

Keep checks light; prefer sampling over full-map scans where feasible.

### Verify `effect:engine.biomesApplied`

Suggested checks:
- Reified buffer exists and has expected length (`width * height`).
- Sample N tiles:
  - `adapter.getBiomeType(x, y)` is a finite integer.
  - `ctx.fields.biomeId[idx]` matches the adapter value for those sample tiles.

### Verify `effect:engine.featuresApplied`

Suggested checks:
- Reified buffer exists and has expected length.
- Sample N tiles:
  - `adapter.getFeatureType(x, y)` is a finite integer.
  - `ctx.fields.featureType[idx]` matches the adapter value.
- Additionally, ensure there exists at least one sampled non-water tile where `featureType !== adapter.NO_FEATURE`.
