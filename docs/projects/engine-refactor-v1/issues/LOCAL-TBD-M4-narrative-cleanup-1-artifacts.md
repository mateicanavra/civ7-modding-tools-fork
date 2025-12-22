---
id: LOCAL-TBD-M4-NARRATIVE-1
title: "[M4] Narrative cleanup: canonical artifact:narrative.* producers"
state: planned
priority: 3
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Narrative]
parent: LOCAL-TBD-M4-NARRATIVE-CLEANUP
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-NARRATIVE-2]
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define the canonical `artifact:narrative.*` set and ensure narrative steps publish those artifacts explicitly.

## Deliverables

- Typed, versioned `artifact:narrative.*` definitions registered (optional safe demos where useful for tooling/tests).
- Narrative steps updated to publish these artifacts and declare their dependencies explicitly.
- Standard recipe updated to consume the new narrative artifacts where applicable.

## Acceptance Criteria

- Narrative producers provide explicit `artifact:narrative.*` outputs (no implicit StoryTags dependency surface).
- Artifacts are versioned; demo payloads are optional (recommended when useful for tooling/tests).
- No behavior change beyond representation/wiring.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A narrative pipeline run compiles and executes using the new artifacts.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-NARRATIVE-CLEANUP](LOCAL-TBD-M4-NARRATIVE-CLEANUP.md)
- **Blocks:** LOCAL-TBD-M4-NARRATIVE-2
- **Sequencing:** Start after the tag registry cutover (LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER) so narrative artifacts are registered in the canonical catalog.

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

## Prework Prompt (Agent Brief)

Goal: define the canonical `artifact:narrative.*@v1` inventory and map producers so implementation is mechanical.

Deliverables:
- A minimal inventory of narrative artifacts (IDs + short purpose + version).
- Schema sketches for each artifact, including any demo payloads we choose to provide (optional; recommended for tooling/tests).
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
| `artifact:narrative.corridors@v1` | Corridor metadata (sea lanes, land corridors, river corridors) | `storyCorridorsPre`, `storyCorridorsPost` | `{ seaLanes: Set<string>; landCorridors: Set<string>; riverCorridors: Set<string>; attributes: Map<string, CorridorAttrs> }` | Optional; empty sets/maps for demo. |
| `artifact:narrative.motifs.margins@v1` | Continental margins tagging (active/passive shelf) | `storySeed` (margins tagging) | `{ activeMargin: Set<string>; passiveShelf: Set<string> }` | Optional; empty sets for demo. |
| `artifact:narrative.motifs.hotspots@v1` | Hotspot trails | `storyHotspots` | `{ trails: Array<{ coords: Array<{ x: number; y: number }>; kind: string }> }` | Optional; empty array for demo. |
| `artifact:narrative.motifs.rifts@v1` | Rift lines and shoulders | `storyRifts` | `{ riftLine: Set<string>; riftShoulder: Set<string> }` | Optional; empty sets for demo. |
| `artifact:narrative.motifs.orogeny@v1` | Orogenic belt metadata | `storyOrogeny` | `{ belts: Array<{ coords: Array<{ x: number; y: number }>; windwardBoost: number; leeDrynessAmplifier: number }> }` | Optional; empty array for demo. |
| `artifact:narrative.overlays@v1` (compat) | Story overlays snapshot (compat-only) | Multiple story steps | `Map<string, OverlayData>` | Keep as transitional; prefer explicit artifacts above. |

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
| `domain/ecology/features/index.ts` | Reads `StoryTags.passiveShelf`, `StoryTags.hotspotParadise/Volcanic` | `artifact:narrative.motifs.margins@v1`, `artifact:narrative.motifs.hotspots.classified@v1` (or derived) |
| `domain/hydrology/climate/refine/*` | Reads `StoryTags.riftLine`, `StoryTags.hotspotParadise/Volcanic` | `artifact:narrative.motifs.rifts@v1`, hotspot artifacts |
| `domain/morphology/coastlines/rugged-coasts.ts` | Reads `StoryTags.corridorSeaLane`, `StoryTags.activeMargin/passiveShelf` | `artifact:narrative.corridors@v1`, `artifact:narrative.motifs.margins@v1` |
| `domain/morphology/islands/placement.ts` | Reads `StoryTags.hotspot`, `StoryTags.corridorSeaLane`, `StoryTags.activeMargin/passiveShelf`; **writes** `StoryTags.hotspotParadise/Volcanic` | Consume artifacts; publish `artifact:narrative.motifs.hotspots.classified@v1` |

### 4) Hotspot classification note (tag-set drift)

Current reality:
- `StoryTags.hotspot` is produced by `storyHotspots`.
- `StoryTags.hotspotParadise` and `StoryTags.hotspotVolcanic` are produced by **islands placement**, not by `storyHotspots`.

**Decision (ADR-ER1-024):** Hotspot categories live inside the single `artifact:narrative.motifs.hotspots@v1` (no split artifacts); producers/consumers must align to that representation during the StoryTags cutover.

This resolves the producer/consumer drift where narrative consumers expect hotspot categories but they're produced by a morphology step.

### 5) Demo payload guidance

- Demo payloads are optional for narrative artifacts.
- If provided, use empty sets/maps/arrays (safe for tooling/tests).
- Validate shape at registry build time; do not validate content correctness.
