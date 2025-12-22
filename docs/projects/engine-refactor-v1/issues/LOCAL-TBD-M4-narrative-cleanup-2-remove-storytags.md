---
id: LOCAL-TBD-M4-NARRATIVE-2
title: "[M4] Narrative cleanup: remove StoryTags + caches and update consumers"
state: planned
priority: 3
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Narrative]
parent: LOCAL-TBD-M4-NARRATIVE-CLEANUP
children: []
blocked_by: [LOCAL-TBD-M4-NARRATIVE-1, LOCAL-TBD-M4-PIPELINE-5]
blocked: []
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate consumers off StoryTags and remove module-level narrative caches so narrative correctness relies only on `artifact:narrative.*`.

## Deliverables

- All narrative consumers read from `artifact:narrative.*` (directly or via derived query helpers).
- StoryTags removed or fenced as explicit compatibility tooling (non-default).
- Module-level narrative caches eliminated or made context-scoped and reset-safe.
- DEF-002 and DEF-012 marked resolved.

## Acceptance Criteria

- StoryTags is not required for correctness by any in-repo consumer.
- Narrative caches do not leak across runs (context-scoped or removed).
- DEF-002 and DEF-012 updated to resolved with pointers to the new artifact surface.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A test or smoke run validates narrative outputs without StoryTags/caches.
- Targeted smoke coverage for migrated consumers (verify outputs, not just step execution).

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-NARRATIVE-CLEANUP](LOCAL-TBD-M4-NARRATIVE-CLEANUP.md)
- **Blocked by:** LOCAL-TBD-M4-NARRATIVE-1, LOCAL-TBD-M4-PIPELINE-5
- **Sequencing:** Land after legacy ordering deletion (LOCAL-TBD-M4-PIPELINE-5) to avoid stage/manifest drift while migrating consumers.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Prefer deleting StoryTags rather than maintaining compatibility shims.
- If any cache must remain, make it context-scoped and cleared per run.
- Known StoryTags consumers outside narrative modules to migrate:
  - `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts`
  - `packages/mapgen-core/src/domain/ecology/features/index.ts`
  - `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts`
  - `packages/mapgen-core/src/domain/narrative/tags/*`

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: enumerate every StoryTags consumer and narrative cache so migration is a mechanical, high-parallelism refactor.

Deliverables:
- A StoryTags consumer map: file -> specific tag usage -> replacement artifact/helper.
- A narrative cache/global inventory with a recommendation (delete or make context-scoped).
- A short list of cross-domain consumers that should get targeted smoke coverage.

Where to look:
- Search: `rg "StoryTags" packages/mapgen-core/src`.
- Narrative caches/utilities: `packages/mapgen-core/src/domain/narrative/**`.
- Likely consumers from milestones: `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts`,
  `packages/mapgen-core/src/domain/ecology/features/index.ts`,
  `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts`.
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Narrative),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.4).

Constraints/notes:
- Treat this as high-parallelism mechanical replacement once artifacts exist.
- Do not introduce new StoryTags compatibility surfaces.
- Do not implement code; return the map/inventory as markdown tables/lists.
- Follow the milestone sequencing: land after legacy ordering deletion to keep the pipeline stable.

## Pre-work

Goal: make StoryTags removal a mechanical, high-parallelism refactor by enumerating every consumer and the intended replacement (`artifact:narrative.*` and/or derived helpers), plus a clear inventory of "narrative globals/caches" and what to do with each.

### 1) StoryTags consumer map (file → usage → replacement)

| File | StoryTags usage (today) | Replacement artifact/helper (target) | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/pipeline/ecology/BiomesStep.ts` | Hydrates `corridors` + `rifts` overlays into StoryTags, then biomes domain reads StoryTags | Require `artifact:narrative.corridors@v1` + `artifact:narrative.motifs.rifts@v1`; pass derived views into biomes logic | Removes overlay→tags hydration; consumers read artifacts directly. |
| `packages/mapgen-core/src/pipeline/ecology/FeaturesStep.ts` | Hydrates `margins` overlay into StoryTags | Require `artifact:narrative.motifs.margins@v1` (or derived view) | Features domain currently reads `passiveShelf` and hotspot categories; see below. |
| `packages/mapgen-core/src/domain/ecology/biomes/index.ts` | Reads corridor metadata + rift shoulder membership for biome nudges | Read from `artifact:narrative.corridors@v1` and `artifact:narrative.motifs.rifts@v1` (or derived query helpers like `getCorridorKindAt(x,y)`, `isRiftShoulder(x,y)`) | Keep algorithm stable; only data source changes. |
| `packages/mapgen-core/src/domain/ecology/features/index.ts` | Reads `passiveShelf`, `hotspotParadise`, `hotspotVolcanic` for reefs/vegetation/density | Read from `artifact:narrative.motifs.margins@v1` and **hotspot-category artifacts** (see islands placement producer) | The hotspot categories are not produced by `storyHotspots`; they're produced by islands. |
| `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts` (+ `rift-humidity.ts`, `hotspot-microclimates.ts`) | Reads `riftLine`, `hotspotParadise`, `hotspotVolcanic` for climate refinements | Read from `artifact:narrative.motifs.rifts@v1` and hotspot-category artifacts (or derived views) | Keep as "optional via recipe composition": if refinements require these artifacts, compilation should enforce publishers are present. |
| `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts` | Reads `corridorSeaLane` membership and corridor edge attributes; reads `activeMargin`/`passiveShelf` | Read from `artifact:narrative.corridors@v1` (sea lane tiles + attributes) and `artifact:narrative.motifs.margins@v1` | This is a key cross-domain consumer; include smoke coverage. |
| `packages/mapgen-core/src/domain/morphology/islands/placement.ts` | Reads `corridorSeaLane`, `hotspot`, `activeMargin`, `passiveShelf`; **writes** `hotspotParadise`/`hotspotVolcanic` | Consume `artifact:narrative.corridors@v1`, `artifact:narrative.motifs.hotspots@v1`, `artifact:narrative.motifs.margins@v1`; publish new categorized hotspot artifacts (below) | This is the real producer of paradise/volcanic hotspot categories. |
| `packages/mapgen-core/src/domain/narrative/corridors/**` | Stores corridor sets + metadata in StoryTags (`corridor*`, `corridorKind/style/attributes`) | Build `artifact:narrative.corridors@v1` directly (no StoryTags) | Likely easiest as a refactor: use local sets/maps and return a typed artifact. |
| `packages/mapgen-core/src/domain/narrative/tagging/{margins,hotspots,rifts}.ts` | Populates StoryTags sets, then publishes overlays; margins also hydrates tags | Build and publish `artifact:narrative.motifs.*@v1` directly (optionally keep overlays as compat-only) | These producers already have local sets; StoryTags can be removed as an intermediate representation. |
| `packages/mapgen-core/src/domain/narrative/overlays/hydrate-*.ts` | Hydrates overlays into StoryTags | Delete (or fence as non-default debug tooling) | Target contract: no StoryTags surface. |
| `packages/mapgen-core/src/orchestrator/task-graph.ts` | Resets StoryTags and logs StoryTags summary | Replace with narrative artifact resets + artifact summaries (optional) | Keep "no leak across runs" invariant; StoryTags reset becomes unnecessary once removed. |

### Hotspot category artifacts (paradise/volcanic)

Current reality:
- `StoryTags.hotspot` is produced by `storyHotspots` (hotspot trails).
- `StoryTags.hotspotParadise` and `StoryTags.hotspotVolcanic` are produced by **islands placement** (`domain/morphology/islands/placement.ts`) when placing hotspot islands.
- These categorized sets are consumed by ecology features + climate microclimates.

Target-friendly replacement:
- Publish two additional narrative artifacts (versioned motifs) from islands placement:
  - `artifact:narrative.motifs.hotspots.paradise@v1`
  - `artifact:narrative.motifs.hotspots.volcanic@v1`
- Or publish a single categorized artifact:
  - `artifact:narrative.motifs.hotspots.classified@v1` with `{ paradise: string[], volcanic: string[] }`.

### 2) Narrative cache / global inventory

| Cache / global | Location today | Scope | Recommendation |
| --- | --- | --- | --- |
| StoryTags container | `ctx.artifacts["story:tags"]` (`domain/narrative/tags/ops.ts`) | context-scoped | Remove as a correctness surface; if anything remains, fence as explicit debug tooling only. |
| Story overlays registry | `ctx.overlays` (`domain/narrative/overlays/registry.ts`) | context-scoped | Prefer removing from the target contract; if kept, treat as derived/compat-only view of narrative artifacts. |
| Orogeny cache | `ctx.artifacts["story:orogenyCache"]` (`domain/narrative/orogeny/cache.ts`) | context-scoped | Either delete (derive from `artifact:narrative.motifs.orogeny@v1`) or keep as context-scoped perf cache, but do not treat it as canonical. |
| Corridor style primitive cache | `ctx.artifacts["story:corridorStyleCache"]` (`domain/narrative/corridors/style-cache.ts`) | context-scoped | Keep only if it remains purely a perf cache derived from config; remove any dependency on StoryTags as a storage surface. |
| Corridor metadata maps | currently stored in StoryTags (`corridorKind/style/attributes`) | context-scoped | Move into `artifact:narrative.corridors@v1` (canonical) or a derived view keyed to that artifact. |

### 3) Cross-domain consumers needing targeted smoke coverage

These are the "fragile" consumers where StoryTags removal is likely to cause subtle behavior drift:
- `domain/morphology/coastlines/rugged-coasts.ts` (corridor edge policy + margins bias)
- `domain/morphology/islands/placement.ts` (hotspot island classification + corridor avoidance)
- `domain/hydrology/climate/refine/*` (rift humidity + hotspot microclimates)
- `domain/ecology/features/*` (reefs + volcanic vegetation + density tweaks)
- `domain/ecology/biomes/*` (corridor + rift shoulder biome biases)
