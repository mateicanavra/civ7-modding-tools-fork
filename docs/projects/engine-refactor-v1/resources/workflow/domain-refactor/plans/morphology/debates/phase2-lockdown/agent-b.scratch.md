# Agent B scratch — Phase 2 map projections + stamping hardening

Scope: gameplay projection + stamping spec hardening, and cross-doc coherence around `artifact:map.*` vs `effect:map.*Plotted` (no receipts/hashes/versioning). This is Phase 2 lockdown only (docs/contracts), not Phase 3 migration.

Locked decision reaffirmation:
- `artifact:foundation.plates` stays Phase 2-canonical as a Foundation-owned derived tile view; Gameplay may read it as context but must not duplicate it under `artifact:map.*` by default.

---

## 1) Coherence scan results (in-scope docs)

### 1.1 Topology (`wrapX=true`, `wrapY=false`)

- Consistent across:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`

### 1.2 `artifact:foundation.plates` posture

- Canonical + consistent across:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` (explicit schema + derived-only semantics)
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md` (explicit “must not be under `artifact:map.*`”)
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` (allows Gameplay to read it; warns against duplicating it under `artifact:map.*`)

### 1.3 Terminology mismatch: “receipts”

- Potential contradiction (wording): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` refers to `effect:map.*` as “stamping/materialization receipts”.
- Phase 2 locked posture elsewhere says **no receipts/hashes/versions**; only short boolean effects.
- Suggestion (don’t edit here unless asked): change “receipts” → “effects” or “execution guarantees”.

### 1.4 Historical debate docs

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/foundation-plates/agent-arch-longterm.scratch.md` still contains superseded “delete it” argumentation (historical notes).
- Other files in that folder already include “superseded” caveats; treat `agent-arch-longterm.md` as superseded where it contradicts the canonical specs.

---

## 2) Evidence anchors (verified vs inferred)

### 2.1 Verified: `artifact:foundation.plates` is a real, consumed artifact in today’s recipe

- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts` reads `deps.artifacts.foundationPlates.read(context)` and uses its fields.
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts` reads `deps.artifacts.foundationPlates.read(context)` and uses its fields.

### 2.2 Verified: “physics-labeled” steps are performing adapter writes today (legacy mismatch to Phase 2)

- `packages/mapgen-core/src/core/types.ts` `writeHeightfield(...)` calls `ctx.adapter.setTerrainType(x,y,...)` (engine write).
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts` calls `writeHeightfield(...)` for `MOUNTAIN_TERRAIN` and `HILL_TERRAIN`.
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts` calls `context.adapter.setFeatureType(...)` for `FEATURE_VOLCANO`, and also sets `MOUNTAIN_TERRAIN` via `writeHeightfield(...)`.

Implication for Phase 2 contracts:
- These must be modeled as Gameplay-owned `plot-*` effect boundaries (Phase 3 wiring migration), even if currently hosted in Morphology stages.

### 2.3 Verified: Civ7 base-standard represents volcanoes as “mountain terrain + volcano feature”

- `.civ7/outputs/resources/Base/modules/base-standard/maps/volcano-generator.js` sets:
  - `TerrainBuilder.setTerrainType(x,y, g_MountainTerrain)`
  - `TerrainBuilder.setFeatureType(x,y, { Feature: g_VolcanoFeature, Direction: -1, Elevation: 0 })`

### 2.4 Inferred / unverified engine claims to avoid

- Do not claim that Civ7 base-standard uses `LandmassRegion.LANDMASS_REGION_NONE/DEFAULT/ANY` (could not verify via `.civ7/outputs/resources` grep).
- What is verified in-repo:
  - `packages/civ7-types/index.d.ts` declares `LandmassRegion.LANDMASS_REGION_WEST` and `..._EAST`, plus `[regionName: string]: number` (additional keys may exist but aren’t enumerated).
  - `packages/civ7-adapter/src/mock-adapter.ts` defines default ids for `NONE/WEST/EAST/DEFAULT/ANY` for tests, but this is not engine evidence.

---

## 3) Targeted hardening suggestions for `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` (drop-ins)

### 3.1 Tighten “effect taxonomy” language (remove “minimum stable surface” framing)

Problem:
- Section 4 currently says effects are “minimum stable coordination surface”; this reads like “minimal framing”.

Drop-in replacement for the “Notes:” bullets in 4.1:
- Effects listed here are the Phase 2 **canonical** map-stamping execution guarantees.
- Do not mint ad-hoc `effect:map.*` names in recipes; adding a new map-stamping boundary requires updating this spec (and aligning tag registry) so downstream deps remain stable.

### 3.2 Add missing “granular plot-* boundaries” examples (mountains/volcanoes)

Rationale:
- `PHASE-2-CORE-MODEL-AND-PIPELINE.md` already uses `effect:map.mountainsPlotted` / `effect:map.volcanoesPlotted` as examples.
- Today’s recipe already performs the writes (via `writeHeightfield` and `setFeatureType`), so this is evidence-backed as a stamping concern.

Suggested additions:
- Add to effect taxonomy:
  - `effect:map.mountainsPlotted` — all mountain/hill terrain writes applied (symbolic intent → `setTerrainType`).
  - `effect:map.volcanoesPlotted` — all volcano features applied (and required terrain writes, if any).
- Add to step boundary map:
  - `plot-mountains` (and optionally `plot-hills` if split) provides `effect:map.mountainsPlotted`.
  - `plot-volcanoes` provides `effect:map.volcanoesPlotted`.

Evidence pointers (in-spec):
- `packages/mapgen-core/src/core/types.ts` (`writeHeightfield` calls adapter)
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/volcano-generator.js`

### 3.3 Expand “Known legacy mismatches” with verified mountains/volcanoes adapter writes

Suggested additions to section 8:
- Verified (repo mismatch): “mountains” and “volcanoes” steps currently perform adapter writes from Morphology stages:
  - `morphology-post/steps/mountains.ts` writes terrain via `writeHeightfield` → `adapter.setTerrainType`.
  - `morphology-post/steps/volcanoes.ts` writes terrain and features via `adapter.setFeatureType`.
- Phase 2 posture: any step that performs engine writes must be treated as Gameplay-owned and must assert the corresponding `effect:map.*Plotted` (Phase 3 migration).

---

## 4) Quick “do not regress” checklist (this run’s scope)

- `artifact:foundation.plates` remains Foundation-owned derived physics view; do not mirror it into `artifact:map.*`.
- Keep `wrapX=true`, `wrapY=false` as values everywhere; no knobs.
- Keep `artifact:map.*` as “intent” (adapter-agnostic where possible).
- Keep `effect:map.*Plotted` as boolean execution guarantees; avoid “receipts” terminology.
