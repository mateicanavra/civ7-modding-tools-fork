# Agent A Scratch (Contracts & Ownership Lock)

Single scratch board for Agent A. Do not treat as canonical; it exists to feed orchestrator edits to shared Phase 2 docs.

## Open items (current run)

- Lock **Foundation → Morphology** input semantics: mesh→tile projection rules for any mesh-space drivers consumed by tile-space Morphology ops (esp. volcanism/melt/plume signals; wrapX-aware).
- Lock **Morphology → Hydrology/Ecology/Gameplay** public artifacts as closure-grade schemas (required fields, units/normalization, indexing space, lifecycle/freeze point, determinism/tie-breakers); remove any “conceptual only / Phase 3 will implement schemas” language from Phase 2.
- Resolve **bathymetry posture**: remove optionality by making depth always derivable from a single signed `elevation` + `seaLevel`, or else require `bathymetry` with exact derived semantics; avoid an optional public truth field.
- Remove **overlay-shaped inputs** from Morphology contracts/ops (`seaLaneMask`, `activeMarginMask`, `passiveShelfMask`, `hotspotMask`) and replace with Foundation-owned physics drivers + Morphology-derived metrics (no Gameplay/story overlays as physics inputs).
- Close **routing ownership**: Morphology routing stays internal-only (erosion). Hydrology owns canonical routing/hydrography truth; Morphology must not publish routing as a downstream-required contract.
- Fix doc hygiene mismatch: Phase 2 Appendix C references “**22: Open questions / deep-dive**” but no such section exists; Phase 2 posture forbids open contract questions—delete/replace that scaffold bullet.

## Status (2026-01-20)

- Phase 2 doc reviewed for cross-domain surfaces; began grounding against current repo wiring (step contracts + artifact schemas).
- Key mismatches found between Phase 2 narrative and actual stage wiring (not fixing here; for orchestrator/owners).

## Contract Closure Checklist (cross-domain surfaces)

Each row is a Phase-2-closure requirement: name, owner, producer, consumers, schema, indexing, units/normalization, lifecycle, determinism.

### Foundation → Morphology (inputs; Foundation-owned)

- `artifact:foundation.mesh` (producer: Foundation; consumers: Morphology)
  - Indexing: mesh cells (`cellCount`), X-periodic via `wrapWidth` (Civ7 wrapX lock).
  - Schema (repo evidence): `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`.
  - Lifecycle: frozen at F1; immutable to downstream.
  - Determinism: cell ordering and adjacency must be stable for a given seed/config.
- `artifact:foundation.crust` (producer: Foundation; consumers: Morphology)
  - Indexing: mesh cells.
  - Fields: `type:u8` (0=oceanic,1=continental), `age:u8` (0..255, normalized).
  - Lifecycle: frozen at F1.
- `artifact:foundation.tectonics` (producer: Foundation; consumers: Morphology)
  - Indexing: mesh cells.
  - Fields: `boundaryType:u8`, `upliftPotential:u8`, `riftPotential:u8`, `shearStress:u8`, `volcanism:u8`, `fracture:u8`, `cumulativeUplift:u8` (all 0..255 normalized driver fields).
  - Lifecycle: frozen at F1.
  - **Closure needed:** if Morphology consumes any of these in tile-space, Phase 2 must state the mesh→tile projection rule (wrapX-aware) explicitly (no “implementation choice” wording).
- `artifact:foundation.plates` (producer: Foundation; consumers: Morphology)
  - Indexing: tiles (`width*height`, row-major).
  - Fields (repo evidence): `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`.
  - Lifecycle: frozen at F1.
  - Determinism: derived-only projection; must be stable given Foundation truth.
- `Env.width`, `Env.height`, `Env.latitudeByRow` (producer: runtime/env; consumers: all)
  - **Closure needed:** topology is not a knob: wrapX is always-on; wrapY is always-off. Do not model wrap flags as inputs.

### Morphology → Hydrology/Ecology/Gameplay (truth outputs; Morphology-owned)

- `artifact:morphology.topography` (producer: Morphology; consumers: Hydrology, Ecology, Gameplay)
  - Indexing: tiles (`width*height`, row-major).
  - Required fields: `elevation`, `seaLevel`, `landMask`.
  - Units: elevation and sea level in meters (or explicitly-defined “meters-like” units; no mixed/implicit units).
  - Lifecycle: frozen at F2; immutable to downstream.
  - **Bathymetry closure (see below):** do not leave `bathymetry` as an optional truth field.
- `artifact:morphology.substrate` (producer: Morphology; consumers: Ecology; optional others)
  - Indexing: tiles.
  - Fields: `erodibilityK:f32`, `sedimentDepth:f32`.
  - Semantics: dimensionless proxies in a locked range; no hidden multipliers beyond config-defined transforms.
  - Lifecycle: frozen at F2.
- `artifact:morphology.coastlineMetrics` (producer: Morphology; consumers: Hydrology, Ecology, Gameplay)
  - Indexing: tiles.
  - Minimum required fields (per Phase 2 text): `coastalLand:u8`, `coastalWater:u8`, `distanceToCoast:u16`.
  - Lifecycle: frozen at F2.
  - Determinism: computed from `artifact:morphology.topography` only (no overlays, no engine reads).
- `artifact:morphology.landmasses` (producer: Morphology; consumers: Gameplay; optional others)
  - Indexing: tiles + list.
  - Fields: `landmassIdByTile:i32` (`-1` for water) + `landmasses[]`.
  - **Closure needed:** stable landmass ID rules + tie-breakers; wrap-aware `bbox` semantics in X.
  - Lifecycle: frozen at F2.
- `artifact:morphology.volcanoes` (producer: Morphology; consumer: Gameplay projection/stamping)
  - Indexing: tiles (mask) and/or list of tile indices.
  - Closure: schema must be explicit (mask vs list; if list, sorted order; if mask, 0/1 values); must be derived from Foundation drivers (no overlays).
  - Lifecycle: frozen at F2.

### Gameplay-owned derived artifacts (projection intent; for downstream stamping)

These are not physics truth, but Phase 2 must still lock their lifecycle and determinism because they are cross-domain dependency surfaces:

- `artifact:map.*` (owner: Gameplay; consumers: engine-stamping steps)
  - Lifecycle: **publish-once/frozen intent per pass** (no in-run rewrite); see locked decision packet.
  - Execution guarantees: `effect:map.<thing>Plotted` (boolean effect tags only).

## Fix proposals (Phase 2 doc hygiene + contract posture)

### A) Appendix C mismatch: “22: Open questions / deep-dive”

Problem: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md` Appendix C references “**22: Open questions / deep-dive**” but there is no Section 22.

Fix proposal (choose one; both match Phase 2 posture):
- **Delete** the “22: Open questions / deep-dive” bullet entirely, and add a one-line note: “This spec contains no open-questions section; Phase 2 is contract-locking; any gaps are doc bugs to resolve before Phase 3.”
- Or **replace** that bullet with: “No open questions section (by design): remaining work is tracked as explicit ‘Required updates’ only.”

### B) Bathymetry posture (required vs optional)

Recommendation: **avoid an optional public truth field**.

One of these must be chosen and written into the Phase 2 contract matrix:
- **Preferred:** drop `bathymetry` as a separate field; lock that `elevation` is a single signed heightfield that already includes seafloor depth (water tiles have `elevation <= seaLevel`). Downstream computes ocean depth as `seaLevel - elevation` where needed. This removes an optional contract branch while preserving full semantics.
- Acceptable alternative: keep `bathymetry` but make it **required** and define it as a deterministic derived view of `elevation` + `seaLevel` (e.g., `bathymetry = max(0, seaLevel - elevation)` for water tiles; `0` for land tiles). This is redundant but unambiguous.

## Required rewrites (Phase 2 doc; drop-in replacement blocks)

These blocks are intended for the orchestrator to paste into `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md` (or its eventual renamed canonical target). They are phrased to avoid modal/provisional language and to lock cross-domain contracts.

### 1) Section 6 intro — remove “conceptual only; Phase 3 will implement schemas”

Replace the first paragraph under “## 6) Target contract matrix …” with:

> This section is a **contract-locking specification**. Every cross-domain artifact listed here is closure-grade: required fields and types, indexing space, units/normalization, lifecycle/freeze point, and determinism/tie-breakers are explicitly defined. Phase 3 implements this contract; it does not complete or reinterpret it.

### 2) Section 6 — `artifact:morphology.topography` schema (bathymetry closure)

Replace the `artifact:morphology.topography` row description with (preferred bathymetry posture):

> Frozen topography truth snapshot (published at **F2**): `elevation` (meters; signed; includes seafloor depth where applicable), `seaLevel` (meters; scalar), and `landMask` (derived invariant: `landMask[i] = elevation[i] > seaLevel ? 1 : 0`). No other step may publish a conflicting landMask for the pass. This artifact excludes all engine/projection indices (terrain IDs, cliffs, tags).

If you must keep `bathymetry` as an explicit field, make it required and add:

> `bathymetry` (meters; non-negative; deterministic derived view: `bathymetry[i] = max(0, seaLevel - elevation[i])` for water tiles; `0` for land tiles).

### 3) Section 6 — `artifact:morphology.coastlineMetrics` must be schema-locked

Replace the `artifact:morphology.coastlineMetrics` row description with:

> Frozen coastline metrics snapshot (published at **F2**): `coastalLand:u8` (1=land tile adjacent to ≥1 water tile), `coastalWater:u8` (1=water tile adjacent to ≥1 land tile), and `distanceToCoast:u16` (graph distance in tiles to the nearest coast; `0` for coastal tiles). Computed from `artifact:morphology.topography` only; does not consult overlays or engine state.

### 4) Section 6 — `artifact:morphology.landmasses` stable IDs + tie-breakers

Replace the `artifact:morphology.landmasses` row description with:

> Frozen landmass decomposition (published at **F2**): `landmassIdByTile:i32` (dense; `-1` for water) and `landmasses[]` where each entry is a connected component under wrapX-aware hex adjacency. **Stable landmass IDs:** components are sorted by `tileCount` (descending), then by `minTileIndex` (ascending; the smallest row-major tile index contained in the component). The stable `id` of a landmass is its index in this sorted list. **Wrap-aware bbox:** `bbox.west/east` encode a minimal X-interval on a cylinder; `west > east` represents a wrapped interval crossing the seam.

### 5) Appendix C scaffold — remove Section 22 reference

Edit “Appendix C: Spec scaffold / spine breakout” to delete the “22: Open questions / deep-dive” bullet, and add:

> This spec intentionally contains **no** open-questions section. Phase 2 is contract-locking; unresolved contract gaps are treated as spec bugs to fix before Phase 3.

## Violations / drift risks to fix (current Phase 2 doc)

Target doc: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md`.

- **Contract matrix is labeled “conceptual; Phase 3 will implement schemas”** — violates Phase 2 posture (“no contract-level unknowns”).
- **Optional public-truth fields** (notably `bathymetry`) — creates branching contract shapes; lock to a single required semantics path.
- **Gameplay overlay namespace drift**: doc uses `overlay:gameplay.*` in diagrams/text; locked decision packet standardizes Gameplay projection artifacts under `artifact:map.*`. If overlays remain a separate dependency kind, Phase 2 must explicitly state how overlays map into `artifact:map.*` (or replace them in the Phase 2 model).
- **Upstream driver mapping ambiguity**: `artifact:foundation.tectonics` is mesh-indexed but Morphology ops are tile-indexed; Phase 2 must explicitly lock the projection rule or require tile-projected drivers from Foundation (do not leave as “ideally uses mesh where possible”).

## Dependencies / questions to route via orchestrator

- **Foundation → Morphology driver closure:** decide whether Foundation must publish additional **tile-projected** driver fields (at minimum `volcanism`/melt/plume intensity by tile) so Morphology can replace legacy `hotspotMask`/`activeMarginMask`/`passiveShelfMask` inputs without inventing ambiguous mesh→tile projection semantics.
- **Gameplay namespace alignment:** confirm whether Gameplay “overlay” outputs are represented as `artifact:map.*` (preferred for the unified namespace decision) or remain a separate dependency kind; update Phase 2 wording accordingly.
- **Tag registry update:** `docs/projects/engine-refactor-v1/resources/spec/SPEC-tag-registry.md` still lists Narrative artifacts and `effect:engine.*`; Phase 2 likely needs to call out updating this registry to `artifact:map.*` + `effect:map.*` to prevent drift.
- **Bathymetry downstream need:** confirm with Agent B/C whether any stamping/materialization step requires explicit bathymetry (likely not; Civ7 derives elevation/cliffs internally), and with Hydrology/Ecology owners whether a separate bathymetry array is beneficial beyond derivability from `elevation` + `seaLevel`.

## Re-anchor (Truth vs Projection vs Stamping)

Posture sources (authoritative for this effort):
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-lockdown-plan.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-full.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md`

Lock: **All projection-like fields and engine-facing indices/materialization are Gameplay-owned.** Any such fields currently embedded in physics-domain artifacts are treated as **legacy** and must be **split/migrated** into Gameplay projection/stamping surfaces.

## Split / Migrate List (mixed truth+projection artifacts to unwind)

These are concrete “mixed surfaces” found in repo wiring; they must not survive into the canonical Morphology truth contract.

- `artifact:morphology.topography.terrain` (engine terrain id per tile) → split/migrate to Gameplay projection/stamping.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (`terrain: u8[]` described as “Engine terrain id per tile”).

- `artifact:morphology.coastlinesExpanded` (engine coastline expansion marker) → split/migrate to Gameplay stamping/effect tagging.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (marker artifact “engine coastline expansion has been applied”).

- `artifact:heightfield.terrain` (terrain classification working layer; projection-only) → split/migrate to Gameplay, or drop from physics-domain artifact surfaces.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`terrain` explicitly “projection-only”).

Notes (not artifacts, but also mixed responsibilities worth tracking for migration planning):
- Morphology steps currently call engine postprocess/materialization functions inside physics stages (e.g., `validateAndFixTerrain`, `recalculateAreas`, `stampContinents`) in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`.
- Ecology step currently stamps engine biomes (`setBiomeType`) in `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`.
- Ecology features apply stamps engine features (`setFeatureType`) in `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/apply.ts`.

## Civ7 Topology Lock (Cylinder: wrapX always true; wrapY=false)

Correction (per Matei): Civ7 maps are cylindrical: **wrap in X always**, **do not wrap in Y**. There is no wrapX config/input; wrap-aware helpers are canonical and must be treated as the baseline behavior.

Evidence (repo):
- Hex-neighborhood wraps X and bounds Y: `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts` (calls `wrapX(nx,width)`; checks `ny` bounds).
- Foundation mesh is periodic in X via `wrapWidth`: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts` and `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`.

Contract implications:
- All tile adjacency and distance computations are on a cylinder: neighbors wrap X modulo `width`; Y is bounded in `[0,height-1]`.
- Contracts must not include wrap flags as inputs (no `Env.wrap`, no `wrapX`/`wrapY` config knobs).
- Landmass bbox semantics must be wrap-aware in X (wrapped intervals are canonical); any contract shape that assumes bounded west/east edges is legacy/invalid.

## Evidence: Current repo contract keys + schemas (verified)

### Foundation → Morphology (upstream)

- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
  - `artifact:foundation.mesh` (mesh-space CSR adjacency + site positions)
  - `artifact:foundation.crust` (mesh-space `type`, `age`)
  - `artifact:foundation.tectonics` (mesh-space `boundaryType`, `upliftPotential`, `riftPotential`, `shearStress`, `volcanism`, `fracture`, `cumulativeUplift`)
  - `artifact:foundation.plates` (tile-space plate + boundary proximity + stress + uplift/rift potentials + movement vectors)

### Morphology published artifacts (as wired today)

- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`
  - `artifact:morphology.topography`
    - `elevation: i16[]` (tile)
    - `terrain: u8[]` (tile) **NOTE: engine terrain id is embedded here today**
    - `landMask: u8[]` (tile)
  - `artifact:morphology.routing` (`flowDir i32[]`, `flowAccum f32[]`, optional `basinId i32[]`)
  - `artifact:morphology.substrate` (`erodibilityK f32[]`, `sedimentDepth f32[]`)
  - `artifact:morphology.coastlineMetrics` (`coastalLand u8[]`, `coastalWater u8[]`)
  - `artifact:morphology.landmasses`
    - `landmasses[]` with `id`, `tileCount`, `bbox {west,east,south,north}` (**LOCK:** bbox is wrap-aware in X; wrapped intervals are canonical)
    - `landmassIdByTile: i32[]` (tile, `-1` for water)
  - `artifact:morphology.coastlinesExpanded` (marker artifact)

## Known boundary violations / contract drift risks

### 1) Narrative overlay as Morphology input (hard-ban violation)

- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts`
  - Requires `narrativePreArtifacts.overlays` for the `volcanoes` morphology step.
  - This violates Phase 2 guardrails: “No overlays/story masks/gameplay constraints as physics inputs (hard ban).”
  - Coordination needed with Agent C (pipeline model) + Agent B (stamping/integration expectations) to remove this dependency while preserving deterministic volcano outputs.

### 2) Engine/projection truth embedded in Morphology artifact (risk)

- `artifact:morphology.topography` includes `terrain: u8[]` described as “Engine terrain id per tile”.
  - Phase 2 doc currently frames engine/projection as derived-only, downstream.
  - This is either:
    - (a) a legacy carry; should be removed from Morphology’s canonical surface, or
    - (b) an explicitly allowed “engine materialization” contract field (but that would shift ownership + must be locked).
  - If (b), Phase 2 needs explicit semantics for `terrain` (authoritative vs derived; mutability; when frozen).

### 3) Routing contract is “public (provisional)” in Phase 2 text (must be locked)

- Phase 2 doc uses `_Public (provisional)_` for `artifact:morphology.routing` and leaves “ownership vs Hydrology recompute” as an open question.
  - Must be closed contract-level: either routing is a published Morphology output consumed by Hydrology OR routing is internal-only for erosion and Hydrology owns canonical routing.
  - Note: current repo wiring already consumes `artifact:morphology.topography` in Hydrology (see `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.contract.ts`).

## Draft: Contract closure map (cross-domain surfaces Agent A owns)

### Contract Closure Checklist (must-lock; no provisional language)

Each entry specifies: `artifact key` → owner → producer (stage/step) → consumers → schema/indexing/units → lifecycle/freeze → determinism notes.

#### Foundation → Morphology inputs (authoritative physics drivers)

- `artifact:foundation.mesh` → **Owner:** Foundation → **Producer:** `foundation/mesh` (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/mesh.contract.ts`) → **Consumers:** Foundation downstream steps; Morphology for mesh-aware sampling/routing when needed
  - **Indexing:** mesh-space (cells) + CSR adjacency
  - **Units:** mesh geometry in “hex space” units (see schema)
  - **Lifecycle:** immutable snapshot after `foundation/mesh`
  - **Determinism:** entirely seed/config driven; no downstream writes.

- `artifact:foundation.crust` → **Owner:** Foundation → **Producer:** `foundation/crust` (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/crust.contract.ts`) → **Consumers:** `foundation/plate-graph`, `foundation/tectonics`; Morphology substrate/topography
  - **Indexing:** mesh-space arrays (`type`, `age`)
  - **Units/semantics:** `type` is categorical (0 oceanic / 1 continental); `age` is normalized ordinal (0..255, newer→older)
  - **Lifecycle:** immutable snapshot after `foundation/crust`
  - **Determinism:** stable; no consumer mutation.

- `artifact:foundation.plateGraph` → **Owner:** Foundation → **Producer:** `foundation/plate-graph` (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/plateGraph.contract.ts`) → **Consumers:** `foundation/tectonics`, `foundation/projection`; Morphology if plate identity is needed beyond tile projection
  - **Indexing:** mesh-space (`cellToPlate`), plus immutable `plates[]` metadata
  - **Lifecycle:** immutable snapshot after `foundation/plate-graph`
  - **Determinism:** plate ordering is stable given seed/config.

- `artifact:foundation.tectonics` → **Owner:** Foundation → **Producer:** `foundation/tectonics` (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/tectonics.contract.ts`) → **Consumers:** `foundation/projection`; Morphology base topography + volcanism drivers
  - **Indexing:** mesh-space
  - **Units/semantics:** all scalar fields are normalized intensities (`0..255`) not physical mm/yr; Morphology interprets them as relative drivers only.
  - **Fields (verified):** `boundaryType`, `upliftPotential`, `riftPotential`, `shearStress`, `volcanism`, `fracture`, `cumulativeUplift` (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`)
  - **Lifecycle:** immutable snapshot after `foundation/tectonics`
  - **Determinism:** stable; no downstream writes.

- `artifact:foundation.plates` → **Owner:** Foundation → **Producer:** `foundation/projection` (`mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.contract.ts`) → **Consumers:** Morphology planning steps (mountains today; volcanoes today); any downstream projections needing tile-space boundary drivers
  - **Indexing:** tile-space (`width*height`)
  - **Units/semantics:** normalized intensities (`0..255`) and signed i8 movement components; `boundaryType` is categorical.
  - **Lifecycle:** immutable snapshot after `foundation/projection`
  - **Determinism:** stable; no downstream writes.

#### Morphology → Hydrology/Ecology/Gameplay outputs (physics truths + derived-only projections)

- `artifact:morphology.topography` → **Owner:** Morphology → **Producer:** `morphology/landmass-plates` today (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts`) → **Consumers (verified today):** Hydrology lakes (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.contract.ts`), Narrative steps (legacy), Morphology internal steps; downstream read-only
  - **Indexing:** tile-space arrays
  - **Canonical schema (lock for Phase 2):**
    - `elevation: i16[]` (signed, units meters)
    - `seaLevel: number` (scalar threshold in the same units as `elevation`)
    - `landMask: u8[]` (1 land / 0 water; derived by `elevation[i] > seaLevel`)
    - **Explicit exclusion:** no engine terrain ids inside Morphology topography (engine terrain is derived-only and Gameplay-owned).
  - **Lifecycle/freeze:** mutable within Morphology; **frozen at end of Morphology Post**; downstream domains treat as immutable truth thereafter.
  - **Determinism:** no RNG in output shape without label-scoped seed; all derived surfaces recomputable from these fields.

- `artifact:morphology.landmasses` → **Owner:** Morphology → **Producer:** `morphology/landmasses` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/landmasses.contract.ts`) → **Consumers (verified):** Gameplay/Placement projection (LandmassRegionId stamping) (`mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`)
  - **Indexing:** `landmassIdByTile: i32[]` tile-space, plus `landmasses[]`
  - **Units/semantics:** `-1` for water; landmass ids are stable within snapshot
  - **BBox semantics (lock; no wrap):** `bbox.west <= bbox.east` and `bbox.south <= bbox.north`; all bounds are conventional axis-aligned bounds in tile coordinates.
  - **Lifecycle/freeze:** immutable snapshot published after landmask is final (end of Morphology)
  - **Determinism/tie-breakers (lock):**
    - Primary ordering: descending `tileCount`
    - Tie-break: ascending `firstEncounterTileIndex` (scan order) to avoid engine-dependent sort stability.

- `artifact:morphology.substrate` → **Owner:** Morphology → **Producer:** `morphology/landmass-plates` today (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts`), then mutated by geomorphology → **Consumers:** Ecology (future), diagnostics
  - **Indexing:** tile-space arrays
  - **Units/semantics (lock):** `erodibilityK` and `sedimentDepth` are normalized non-negative floats; interpretation is relative (no physical meters-of-sediment guarantee).
  - **Lifecycle/freeze:** mutable within Morphology; frozen at end of Morphology.

- `artifact:morphology.coastlineMetrics` → **Owner:** Morphology → **Producer:** `morphology/rugged-coasts` today (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`) → **Consumers:** Hydrology/Ecology/Gameplay (future); diagnostics
  - **Indexing:** tile-space arrays
  - **Canonical schema (lock for Phase 2):**
    - `coastalLand: u8[]` (1/0): land tiles adjacent to water
    - `coastalWater: u8[]` (1/0): water tiles adjacent to land
    - `distanceToCoast: u16[]` (0 at coast, increasing by 1 per hex step; computed from `landMask`)

- `artifact:morphology.routing` → **Owner:** **Hydrology** (canonical routing truth); Morphology may compute routing **internal-only** for erosion
  - **Current wiring (verified):** published by `morphology/routing` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/routing.contract.ts`); consumed by `hydrology/rivers` (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts`).
  - **Phase 2 lock (required by guardrails):**
    - Morphology does not publish routing as a cross-domain truth artifact.
    - Hydrology computes canonical routing + basins from `artifact:morphology.topography` (+ Hydrology climate fields), then publishes `artifact:hydrology.hydrography` as the canonical read path.
  - **Dependency:** Agent C will need to reconcile this with stage wiring and artifact keys.

#### Morphology → Gameplay “feature intent” outputs (needed for deterministic stamping; physics-owned, projection-executed)

- **Volcanism intent (required closure):** Gameplay stamping needs a deterministic, physics-derived volcano placement surface.
  - **Current implementation evidence:** Morphology `volcanoes` step reads `artifact:storyOverlays` hotspots and directly stamps engine `FEATURE_VOLCANO` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`).
  - **Phase 2 lock (per orchestrator instruction):**
    - Morphology volcano planning consumes **Foundation** physics drivers (melt/plumes/volcanism potential), never overlays.
    - Morphology publishes a **volcano placement artifact** (e.g., `artifact:morphology.volcanoes`) containing at minimum `index: number[]` (tile indices), optionally `kind` classification (`plume|rift|arc`) if needed for downstream rules.
    - Gameplay owns the engine materialization: terrain typing + volcano feature stamping; Morphology does not call adapter stamping APIs.

### Foundation → Morphology input contract (must-lock fields)

- `artifact:foundation.tectonics` (mesh-space) + `artifact:foundation.plates` (tile-space) together currently provide:
  - boundary regime (`boundaryType`)
  - uplift/extension/shear (`upliftPotential`, `riftPotential`, `shearStress`)
  - volcanism driver (`volcanism`)
  - fracture (`fracture`)
  - uplift history (`cumulativeUplift`)
  - tile-space convenience fields (boundary closeness, stress, movement vectors)
- Required closures for Phase 2:
  - Choose canonical indexing for Morphology drivers: mesh-space truth vs tile-projection truth (and define projection rules if consuming tile-space).
  - Lock units/normalization: current artifacts are 0..255 byte fields; Phase 2 must define semantics (e.g., “normalized [0,1] meaning”, not physical mm/yr).
  - Lock polar edge boundary handling as *input semantics* (Foundation-supplied vs Morphology-configured virtual boundary); Phase 2 text currently implies Morphology applies edge effects, but ownership must be unambiguous.

### Morphology → Hydrology/Ecology output contracts (must-lock)

- `artifact:morphology.topography` (tile): elevation + landMask (+ currently terrain id)
  - Lock: datum conventions; whether `elevation` includes bathymetry; what 0 means; clamp ranges; determinism.
  - Lock: freeze point (end of Morphology Post) and “no downstream mutation”.
- `artifact:morphology.substrate` (tile): `erodibilityK`, `sedimentDepth`
  - Lock: units (normalized coefficients); relationship to Ecology (fertility proxy vs rock hardness); clamp.
- `artifact:morphology.coastlineMetrics` (tile): currently minimal masks only
  - Lock: whether richer shelf/depth/concavity metrics are required as canonical contract (Phase 2 implies more than current wiring).
- `artifact:morphology.landmasses` (tile + list)
  - Lock: landmass id stability + tie-breakers (size sort + stable secondary key), seam-wrap bbox semantics.
  - Dependency: Gameplay projection/stamping uses this to assign LandmassRegionId (`mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`).

## Questions / dependencies to route to orchestrator

- Decide whether Morphology’s `terrain` buffer remains in `artifact:morphology.topography`:
  - If yes: Phase 2 must explicitly treat it as a *projection/stamping* surface (Gameplay-owned by default per context packet) and define ownership/freeze/mutability; this overlaps Agent B’s lane.
  - If no: remove it from Morphology public contract and shift stamping/terrain typing downstream (also overlaps Agent B/C).
- Remove `narrativePreArtifacts.overlays` dependency from Morphology volcanoes step while preserving current features; requires coordination with Agent C (stage/step model) and Agent B (engine integration needs).
- Remove `narrativePreArtifacts.overlays` dependency from other Morphology steps currently consuming overlays:
  - `morphology/rugged-coasts` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`)
  - `morphology/islands` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`)
  - These are hard-ban violations unless rewritten to consume only Foundation physics + Morphology state.

- Remove legacy “thumb on scale” landmask shaping from Morphology:
  - `morphology/compute-landmask` currently includes `basinSeparation: OceanSeparationConfigSchema` and applies ocean widening (`mods/mod-swooper-maps/src/domain/morphology/ops/compute-landmask/contract.ts`, `mods/mod-swooper-maps/src/domain/morphology/ops/compute-landmask/strategies/default.ts`).
  - This violates Phase 2’s posture (no corridor/sea-lane enforcement inside Morphology) unless moved upstream to Foundation as a macrostructure input.

- Replace overlay-derived “hotspot/margin/sea-lane” inputs for island/volcano planning with Foundation physics drivers:
  - `morphology/plan-volcanoes` currently requires `hotspotMask` (`mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts`).
  - `morphology/plan-island-chains` currently requires `seaLaneMask`, `activeMarginMask`, `passiveShelfMask`, `hotspotMask` (`mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/contract.ts`).
  - Phase 2 closure needs a single Foundation-owned volcanism/plume driver surface (tile-space OR mesh-space with projection rules), and Morphology plan ops must consume only that + Morphology state.

- Align published Morphology artifact schemas with locked Phase 2 semantics:
  - `artifact:morphology.topography` currently publishes `{ elevation, terrain, landMask }` only; Phase 2 lock requires also publishing `seaLevel` (scalar) and removing `terrain` from Morphology-owned truth (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`).
  - `artifact:morphology.coastlineMetrics` currently publishes `{ coastalLand, coastalWater }` only; Phase 2 lock requires also publishing `distanceToCoast: u16[]` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`).

## Proposed Phase 2 doc rewrites (text blocks; orchestrator to apply)

### Replace: “6) Target contract matrix (buffers, artifacts)” (contract closure; wrap-aware)

Proposed replacement block (artifacts only; no provisional language; engine/projection derived-only + Gameplay-owned):

> **6) Target Contract Matrix (Cross-Domain Artifacts)**  
>  
> **Rule: Truth vs projection vs stamping**  
> - Morphology publishes **physics truth** artifacts only.  
> - All engine-facing indices, terrain classes, tags, and stamping are **derived-only** and **Gameplay-owned**.  
> - No projection surface is an input to any physics domain.  
>  
> **Civ7 topology lock:** cylindrical in X (wrapX implicit, always on), bounded in Y (wrapY=false). No wrap flags as inputs.  
> - All hex-neighborhood adjacency wraps X (`x` modulo `width`) and clamps Y to `[0,height-1]`.  
>  
> #### Upstream inputs (Foundation → Morphology)  
> - `artifact:foundation.mesh` (mesh topology + adjacency; periodic in X via `wrapWidth`)  
> - `artifact:foundation.crust` (mesh crust type/age)  
> - `artifact:foundation.tectonics` (mesh tectonic drivers; includes volcanism/melt/plumes)  
> - `artifact:foundation.plates` (tile-projected boundary drivers; convenience only)  
>  
> #### Morphology published truth outputs (Morphology → downstream)  
> - `artifact:morphology.topography`  
>   - `elevation: i16[]` (tile, meters)  
>   - `seaLevel: number` (scalar threshold; same units as `elevation`)  
>   - `landMask: u8[]` (tile; derived by `elevation[i] > seaLevel`)  
>   - Excludes any engine terrain ids.  
> - `artifact:morphology.substrate`  
>   - `erodibilityK: f32[]` (tile, normalized, ≥0)  
>   - `sedimentDepth: f32[]` (tile, normalized, ≥0)  
> - `artifact:morphology.coastlineMetrics`  
>   - `coastalLand: u8[]`, `coastalWater: u8[]`, `distanceToCoast: u16[]` (tile; BFS distance on wrapX adjacency)  
> - `artifact:morphology.landmasses`  
>   - `landmasses[]` (id,tileCount,bbox)  
>   - `landmassIdByTile: i32[]` (-1 water)  
>   - `bbox` is wrap-aware in X (see bbox semantics lock below).  
> - `artifact:morphology.volcanoes` (new; required)  
>   - `volcanoes: { index: number }[]` (tile indices; deterministic placement derived from Foundation drivers; no overlays)  
>  
> #### Freeze points  
> - Morphology truth artifacts may be mutated only within Morphology steps and become immutable at end of Morphology Post.  
> - Gameplay projections/materialization run after Morphology is frozen and must not mutate Morphology truth artifacts.

### Replace: “9) Public vs internal surface ledger” (remove “public (provisional)” routing)

> **9) Public vs Internal Surfaces (Contract Lock)**  
> **Public Morphology truth artifacts:** `artifact:morphology.topography`, `artifact:morphology.substrate`, `artifact:morphology.coastlineMetrics`, `artifact:morphology.landmasses`, `artifact:morphology.volcanoes`.  
> **Internal-only Morphology intermediates:** erosion-internal routing buffers, slope/roughness/debug masks.  
> **Hydrology ownership lock:** canonical routing/basins/discharge/river classification are Hydrology-owned truth; Morphology does not publish routing as a cross-domain truth surface.

### Replace: “22) Open questions and required deep-dive documents” (remove contract-level open questions)

> **22) Closed Decisions (No Contract-Level Open Questions)**  
> - Routing ownership: Hydrology owns canonical routing/basins; Morphology routing is internal-only for erosion.  
> - Volcano integration: Morphology publishes volcano placements derived from Foundation drivers; Gameplay stamps engine features deterministically from that artifact.  
> - Engine terrain typing/indices/stamping: derived-only and Gameplay-owned; physics artifacts are pure truth only.  
> - Civ7 topology: wrapX always true; wrapY always false; do not model wrap flags as inputs; all bbox/center computations are wrap-aware.

### Insert: Determinism + wrap-aware bbox semantics (cross-domain)

> **Determinism locks for published identifiers**  
> - **Landmass ids:** `artifact:morphology.landmasses.landmasses[]` ordered by descending `tileCount`; ties broken by ascending `firstEncounterTileIndex` (row-major scan). `landmassIdByTile` indexes into this ordered array.  
> - **Landmass bbox (wrap-aware X):** `bbox.west`/`bbox.east` encode the minimal arc interval on the X-ring containing all landmass columns. If the interval crosses the seam, encode wrap by `west > east`. Construct bbox by cutting at the largest empty X-gap; tie-break equal gaps by smallest gap start index.  
> - **Volcano placements:** ordered by descending placement score; ties broken by ascending tile index.  
> - **RNG discipline:** any randomized choice affecting public artifacts uses label-scoped seeds derived from `{phase, stepId, opId}` and a fixed iteration order.
