---
id: CIV-74
title: "[M4] Narrative cleanup: remove StoryTags + caches and update consumers"
state: planned
priority: 3
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Narrative]
parent: CIV-65
children: []
blocked_by: [CIV-73]
blocked: []
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate consumers off StoryTags and remove module-level narrative caches so narrative correctness relies only on `artifact:narrative.*`.

## Deliverables

- All narrative consumers read from `artifact:narrative.*`. Derived query helpers are permitted only as pure adapters over the artifacts (no new storage).
- **M4 decision:** StoryTags is removed (no compatibility tooling in the default pipeline).
- **M4 decision:** module-level narrative caches are eliminated; any remaining caches are explicitly context-scoped and reset-safe (see the cache inventory below).
- DEF-002 and DEF-012 marked resolved.

## Acceptance Criteria

- StoryTags is not required for correctness by any in-repo consumer.
- Narrative caches do not leak across runs; any remaining caches are context-scoped and reset-safe.
- DEF-002 and DEF-012 updated to resolved with pointers to the new artifact surface.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A smoke run validates narrative outputs without StoryTags/caches.
- Targeted smoke coverage for migrated consumers (verify outputs, not just step execution), at minimum:
  - `domain/morphology/coastlines/rugged-coasts.ts`
  - `domain/morphology/islands/placement.ts`
  - `domain/hydrology/climate/refine/*`
  - `domain/ecology/features/*`
  - `domain/ecology/biomes/*`

## Dependencies / Notes

- **Parent:** [CIV-65](CIV-65-M4-NARRATIVE-CLEANUP.md)
- **Blocked by:** CIV-73
- **Sequencing:** Land after legacy ordering deletion (CIV-59) via the CIV-73 gate to avoid stage/manifest drift while migrating consumers.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Prefer deleting StoryTags rather than maintaining compatibility shims.
- Any cache that remains must be context-scoped and cleared per run.
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
- A narrative cache/global inventory with a recommendation per entry (delete unless it is a context-scoped perf cache derived from canonical artifacts/config; any “keep” recommendation must include rationale).
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

Goal: make StoryTags removal a mechanical, high-parallelism refactor by enumerating every consumer and the intended replacement (canonical `artifact:narrative.*` plus pure derived query helpers; no new storage artifacts beyond the canonical set), plus a clear inventory of "narrative globals/caches" and what to do with each.

### 1) StoryTags consumer map (file → usage → replacement)

| File | StoryTags usage (today) | Replacement artifact/helper (target) | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/pipeline/ecology/BiomesStep.ts` | Hydrates `corridors` + `rifts` overlays into StoryTags, then biomes domain reads StoryTags | Require `artifact:narrative.corridors@v1` + `artifact:narrative.motifs.rifts@v1`; pass derived views into biomes logic | Removes overlay→tags hydration; consumers read artifacts directly. |
| `packages/mapgen-core/src/pipeline/ecology/FeaturesStep.ts` | Hydrates `margins` overlay into StoryTags | Require `artifact:narrative.motifs.margins@v1`; pass an ephemeral derived view into the features domain (pure helper; no new storage). | Features domain currently reads `passiveShelf` and hotspot categories; see below. |
| `packages/mapgen-core/src/domain/ecology/biomes/index.ts` | Reads corridor metadata + rift shoulder membership for biome nudges | Read from `artifact:narrative.corridors@v1` and `artifact:narrative.motifs.rifts@v1` via derived query helpers (pure, context-scoped), e.g. `getCorridorKindAt(x,y)`, `isRiftShoulder(x,y)`. | Keep algorithm stable; only data source changes. |
| `packages/mapgen-core/src/domain/ecology/features/index.ts` | Reads `passiveShelf`, `hotspotParadise`, `hotspotVolcanic` for reefs/vegetation/density | Read from `artifact:narrative.motifs.margins@v1` and `artifact:narrative.motifs.hotspots@v1` (categories inside; ADR-ER1-024) | Hotspot categories are currently produced by islands placement; M4 must surface them via the hotspots artifact before consumers run. |
| `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts` (+ `rift-humidity.ts`, `hotspot-microclimates.ts`) | Reads `riftLine`, `hotspotParadise`, `hotspotVolcanic` for climate refinements | Read from `artifact:narrative.motifs.rifts@v1` and `artifact:narrative.motifs.hotspots@v1` (categories inside; ADR-ER1-024) | Recipe-optional: when included, compilation must enforce required publishers are present. |
| `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts` | Reads `corridorSeaLane` membership and corridor edge attributes; reads `activeMargin`/`passiveShelf` | Read from `artifact:narrative.corridors@v1` (sea lane tiles + attributes) and `artifact:narrative.motifs.margins@v1` | This is a key cross-domain consumer; include smoke coverage. |
| `packages/mapgen-core/src/domain/morphology/islands/placement.ts` | Reads `corridorSeaLane`, `hotspot`, `activeMargin`, `passiveShelf`; **writes** `hotspotParadise`/`hotspotVolcanic` | Consume `artifact:narrative.corridors@v1`, `artifact:narrative.motifs.hotspots@v1`, `artifact:narrative.motifs.margins@v1`; publish hotspot categories into `artifact:narrative.motifs.hotspots@v1` (ADR-ER1-024; **M4 decision:** keep islands placement as the classifier). | This is the real producer of paradise/volcanic hotspot categories. |
| `packages/mapgen-core/src/domain/narrative/corridors/**` | Stores corridor sets + metadata in StoryTags (`corridor*`, `corridorKind/style/attributes`) | Build `artifact:narrative.corridors@v1` directly (no StoryTags) | Likely easiest as a refactor: use local sets/maps and return a typed artifact. |
| `packages/mapgen-core/src/domain/narrative/tagging/{margins,hotspots,rifts}.ts` | Populates StoryTags sets, then publishes overlays; margins also hydrates tags | Build and publish `artifact:narrative.motifs.*@v1` directly; keep overlays publication as explicit legacy/compat-only in M4 (no new consumers). | These producers already have local sets; StoryTags can be removed as an intermediate representation. |
| `packages/mapgen-core/src/domain/narrative/overlays/hydrate-*.ts` | Hydrates overlays into StoryTags | **M4 decision:** delete as part of StoryTags removal. | Target contract: no StoryTags surface. |
| `packages/mapgen-core/src/orchestrator/task-graph.ts` | Resets StoryTags and logs StoryTags summary | Replace with narrative artifact resets + minimal artifact summaries. | Keep "no leak across runs" invariant; StoryTags reset becomes unnecessary once removed. |

### Hotspot category representation (paradise/volcanic)

Current reality:
- `StoryTags.hotspot` is produced by `storyHotspots` (hotspot trails).
- `StoryTags.hotspotParadise` and `StoryTags.hotspotVolcanic` are produced by **islands placement** (`domain/morphology/islands/placement.ts`) when placing hotspot islands.
- These categorized sets are consumed by ecology features + climate microclimates.

Target-friendly replacement:
- **Decision (ADR-ER1-024, accepted):** publish hotspot outputs as a **single** canonical artifact: `artifact:narrative.motifs.hotspots@v1`, with categorized sets encoded **within** that artifact (no split artifacts in v1).
- **M4 decision:** keep the category computation in islands placement; surface the output via `artifact:narrative.motifs.hotspots@v1` before any consumers run.
- If encoding categories inside the hotspots artifact forces a deeper cross-layer refactor than intended for M4, **stop**: immediately add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting the blocker + options, then pause execution and ask the user how to proceed.

### 2) Narrative cache / global inventory

| Cache / global | Location today | Scope | Recommendation |
| --- | --- | --- | --- |
| StoryTags container | `ctx.artifacts["story:tags"]` (`domain/narrative/tags/ops.ts`) | context-scoped | **M4 decision:** remove entirely as part of StoryTags removal. If you believe any StoryTags surface must remain (even for debug), stop and add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting why, then ask for confirmation before proceeding. |
| Story overlays registry | `ctx.overlays` (`domain/narrative/overlays/registry.ts`) | context-scoped | **M4 decision:** keep as explicit legacy/compat-only view (not a contract surface); do not add new consumers. Remove once all consumers are migrated to canonical narrative artifacts. |
| Orogeny cache | `ctx.artifacts["story:orogenyCache"]` (`domain/narrative/orogeny/cache.ts`) | context-scoped | **Decision:** keep as a context-scoped perf cache in M4; treat as derived from `artifact:narrative.motifs.orogeny@v1` and do not treat it as canonical. |
| Corridor style primitive cache | `ctx.artifacts["story:corridorStyleCache"]` (`domain/narrative/corridors/style-cache.ts`) | context-scoped | **M4 decision:** keep as a perf cache derived from config; remove any dependency on StoryTags as a storage surface. |
| Corridor metadata maps | currently stored in StoryTags (`corridorKind/style/attributes`) | context-scoped | Move into `artifact:narrative.corridors@v1` (canonical); any derived view must be an ephemeral helper keyed to that artifact (no additional storage). |

### 3) Cross-domain consumers needing targeted smoke coverage

These are the "fragile" consumers where StoryTags removal is likely to cause subtle behavior drift:
- `domain/morphology/coastlines/rugged-coasts.ts` (corridor edge policy + margins bias)
- `domain/morphology/islands/placement.ts` (hotspot island classification + corridor avoidance)
- `domain/hydrology/climate/refine/*` (rift humidity + hotspot microclimates)
- `domain/ecology/features/*` (reefs + volcanic vegetation + density tweaks)
- `domain/ecology/biomes/*` (corridor + rift shoulder biome biases)
