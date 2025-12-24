---
id: CIV-73
title: "[M4] Narrative cleanup: canonical artifact:narrative.* producers"
state: planned
priority: 3
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Narrative]
parent: CIV-65
children: []
blocked_by: [CIV-59, CIV-61]
blocked: [CIV-74]
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define the canonical `artifact:narrative.*` set and ensure narrative steps publish those artifacts explicitly.

## Deliverables

- [x] Typed, versioned `artifact:narrative.*` definitions registered.
- [x] Narrative steps updated to publish these artifacts and declare their dependencies explicitly.
- [x] Standard recipe updated to consume the new narrative artifacts where applicable.

## Acceptance Criteria

- Narrative producers provide explicit `artifact:narrative.*` outputs (no implicit StoryTags dependency surface).
- No behavior change beyond representation/wiring.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A narrative pipeline run compiles and executes using the new artifacts, and asserts `artifact:narrative.*@v1` outputs are present in `ctx.artifacts`.

## Dependencies / Notes

- **Parent:** [CIV-65](CIV-65-M4-NARRATIVE-CLEANUP.md)
- **Blocks:** CIV-74
- **Blocked by:** CIV-59, CIV-61
- **Sequencing:** Start after the tag registry cutover (CIV-61) and legacy ordering deletion (CIV-59) so narrative artifacts are registered in the canonical catalog without stage/manifest drift.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep behavior stable; focus on artifact products and declared dependencies.
- Use the canonical narrative artifact shapes defined in the target spec.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Implementation Decisions

### 1) Narrative artifact runtime shapes use Set/Map snapshots
- Context: Schema sketches are conceptual; current narrative producers store memberships in StoryTags Sets/Maps.
- Options: (a) Introduce new array/object schemas and derive them per step; (b) snapshot Sets/Maps into artifacts now.
- Choice: Snapshot Sets/Maps into `artifact:narrative.*@v1` objects.
- Rationale: Avoids new derivations and keeps M4 focused on wiring without behavior changes.
- Risk: Future consumers may need explicit array shapes or derived views for serialization.

### 2) Corridors artifact includes island-hop + metadata maps
- Context: Corridors currently track sea, island-hop, land-open, river-chain plus kind/style/attributes maps.
- Options: (a) Publish only sea/land/river and drop island-hop/metadata; (b) publish all existing corridor sets + maps.
- Choice: Publish all corridor sets plus kind/style/attributes maps.
- Rationale: Preserves existing semantics and avoids silent data loss during the cutover.
- Risk: Later contract cleanup may need to consolidate or rename corridor facets.

### 3) Hotspots artifact skips trail polylines in M4
- Context: Hotspot generation tracks point sets but does not retain trail polylines.
- Options: (a) Add trail tracking now; (b) publish point/category sets only in M4.
- Choice: Publish point + category sets only; leave `trails` optional for future.
- Rationale: Keeps changes mechanical and avoids new algorithmic state in M4.
- Risk: Downstream consumers needing trail shapes must extend producers later.

## Prework Prompt (Agent Brief)

Goal: define the canonical `artifact:narrative.*@v1` inventory and map producers so implementation is mechanical.

Deliverables:
- A minimal inventory of narrative artifacts (IDs + short purpose + version).
- Schema sketches for each artifact (conceptual shapes for humans; do not treat these as registry/TypeBox schemas in M4).
- A mapping of which narrative steps produce each artifact and which consumers require them.

Where to look:
- SPEC: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Narrative model, tag registry).
- SPIKE: `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.4).
- Code: `packages/mapgen-core/src/domain/narrative/**`, `packages/mapgen-core/src/pipeline/narrative/**`,
  and any `artifact:storyOverlays` or StoryTags outputs.

Constraints/notes:
- Narrative artifacts must be typed, versioned, and optional via recipe composition.
- No StoryTags surface in the target contract.
- Do not implement code; return the inventory and mappings as markdown tables/lists.
- Coordinate with the tag registry cutover so artifacts are registered in the canonical catalog.

## Pre-work

Goal: define the canonical `artifact:narrative.*@v1` set so narrative producers can be migrated mechanically.

### Canon anchors (SPIKE §2.4)

- Narrative/playability is expressed as normal pipeline steps publishing **typed, versioned, categorized narrative artifacts** (`artifact:narrative.*`).
- No canonical `StoryTags` surface; any convenience views must be derived from artifacts and context-scoped.
- Narrative work is optional via recipe composition; consumers must explicitly require publishers.

### Current narrative surface (M3)

Existing "story overlays" are keyed by:
- `margins`, `hotspots`, `rifts`, `orogeny`, `corridors`, `swatches`, `paleo`
  - `packages/mapgen-core/src/domain/narrative/overlays/keys.ts`

These overlays are stored in `ctx.overlays` and (partially) hydrated into `StoryTags` (margins/rifts/corridors; hotspots are not hydrated today).

### 1) Artifact inventory: `artifact:narrative.*@v1`

| Artifact ID | Purpose | Producer step | Schema sketch | Demo guidance |
| --- | --- | --- | --- | --- |
| `artifact:narrative.corridors@v1` | Corridor metadata (sea lanes, land corridors, river corridors) | `storyCorridorsPre`, `storyCorridorsPost` | `{ seaLanes: Set<string>; landCorridors: Set<string>; riverCorridors: Set<string>; attributes: Map<string, CorridorAttrs> }` | **M4 decision:** omit demo payloads for narrative artifacts. |
| `artifact:narrative.motifs.margins@v1` | Continental margins tagging (active/passive shelf) | `storySeed` (margins tagging) | `{ activeMargin: Set<string>; passiveShelf: Set<string> }` | Same as above. |
| `artifact:narrative.motifs.hotspots@v1` | Hotspot trails (+ categorized sets; ADR-ER1-024) | `storyHotspots` (trails) + islands placement (categories) | `{ trails: Array<{ coords: Array<{ x: number; y: number }>; kind: string }>; paradise: Set<string>; volcanic: Set<string> }` | Same as above. |
| `artifact:narrative.motifs.rifts@v1` | Rift lines and shoulders | `storyRifts` | `{ riftLine: Set<string>; riftShoulder: Set<string> }` | Same as above. |
| `artifact:narrative.motifs.orogeny@v1` | Orogenic belt metadata | `storyOrogeny` | `{ belts: Array<{ coords: Array<{ x: number; y: number }>; windwardBoost: number; leeDrynessAmplifier: number }> }` | Same as above. |

### 2) Producer → artifact map (current story steps)

| Current step | StoryTags / overlays produced | Target artifact |
| --- | --- | --- |
| `storySeed` (margins tagging) | `StoryTags.activeMargin`, `StoryTags.passiveShelf`; margins overlay | `artifact:narrative.motifs.margins@v1` |
| `storyHotspots` | `StoryTags.hotspot`; hotspots overlay | `artifact:narrative.motifs.hotspots@v1` |
| `storyRifts` | `StoryTags.riftLine`, `StoryTags.riftShoulder`; rifts overlay | `artifact:narrative.motifs.rifts@v1` |
| `storyOrogeny` | Orogeny cache; orogeny overlay | `artifact:narrative.motifs.orogeny@v1` |
| `storyCorridorsPre` | `StoryTags.corridor*`; corridors overlay | `artifact:narrative.corridors@v1` (partial; sea + land) |
| `storyCorridorsPost` | `StoryTags.corridorRiver*`; corridors overlay (river) | `artifact:narrative.corridors@v1` (river append) |

### 3) Consumer map: who reads StoryTags / overlays?

| File | StoryTags / overlay usage | Target artifact / helper |
| --- | --- | --- |
| `domain/ecology/biomes/index.ts` | Reads `StoryTags.corridor*`, `StoryTags.riftShoulder` | `artifact:narrative.corridors@v1`, `artifact:narrative.motifs.rifts@v1` |
| `domain/ecology/features/index.ts` | Reads `StoryTags.passiveShelf`, `StoryTags.hotspotParadise/Volcanic` | `artifact:narrative.motifs.margins@v1`, `artifact:narrative.motifs.hotspots@v1` (categories inside; use derived query helpers, not new artifacts) |
| `domain/hydrology/climate/refine/*` | Reads `StoryTags.riftLine`, `StoryTags.hotspotParadise/Volcanic` | `artifact:narrative.motifs.rifts@v1`, `artifact:narrative.motifs.hotspots@v1` (categories inside) |
| `domain/morphology/coastlines/rugged-coasts.ts` | Reads `StoryTags.corridorSeaLane`, `StoryTags.activeMargin/passiveShelf` | `artifact:narrative.corridors@v1`, `artifact:narrative.motifs.margins@v1` |
| `domain/morphology/islands/placement.ts` | Reads `StoryTags.hotspot`, `StoryTags.corridorSeaLane`, `StoryTags.activeMargin/passiveShelf`; **writes** `StoryTags.hotspotParadise/Volcanic` | Consume artifacts; publish hotspot categories into `artifact:narrative.motifs.hotspots@v1` (ADR-ER1-024; **M4 decision:** keep islands placement as the classifier) |

### 4) Hotspot classification note (tag-set drift)

Current reality:
- `StoryTags.hotspot` is produced by `storyHotspots`.
- `StoryTags.hotspotParadise` and `StoryTags.hotspotVolcanic` are produced by **islands placement**, not by `storyHotspots`.

**Decision (ADR-ER1-024):** Hotspot categories live inside the single `artifact:narrative.motifs.hotspots@v1` (no split artifacts); producers/consumers must align to that representation during the StoryTags cutover.

This resolves the producer/consumer drift where narrative consumers expect hotspot categories but they're produced by a morphology step.

### 5) Demo payload guidance

- **M4 decision:** omit demo payloads for narrative artifacts.
- If you believe narrative artifact demos are required for tooling/tests, stop and add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting which artifacts + why, then ask for confirmation before proceeding.
