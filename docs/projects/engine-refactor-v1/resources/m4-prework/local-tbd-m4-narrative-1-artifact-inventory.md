# Prework — `LOCAL-TBD-M4-NARRATIVE-1` (Canonical `artifact:narrative.*` inventory)

Goal: define a minimal, versioned `artifact:narrative.*@v1` set (IDs + purposes + schema sketches) and map current producers/consumers so implementation is mechanical.

## Canon anchors (SPIKE §2.4)

- Narrative/playability is expressed as normal pipeline steps publishing **typed, versioned, categorized narrative artifacts** (`artifact:narrative.*`).
- No canonical `StoryTags` surface; any convenience views must be derived from artifacts and context-scoped.
- Narrative work is optional via recipe composition; consumers must explicitly require publishers.

## Current narrative surface (M3)

Existing “story overlays” are keyed by:
- `margins`, `hotspots`, `rifts`, `orogeny`, `corridors`, `swatches`, `paleo`
  - `packages/mapgen-core/src/domain/narrative/overlays/keys.ts`

These overlays are stored in `ctx.overlays` and (partially) hydrated into `StoryTags` (margins/rifts/corridors; hotspots are not hydrated today).

## Proposed canonical artifact set (v1)

This mirrors the *current* overlay kinds with a more explicit, registry-friendly naming scheme.

| Artifact tag | Purpose | Shape sketch (JSON-friendly) | Demo payload (optional) |
| --- | --- | --- | --- |
| `artifact:narrative.motifs.margins@v1` | Active/passive margin motifs along coasts | `{ width,height, active: string[], passive: string[], summary: {...} }` | Empty arrays + zeroed summary. |
| `artifact:narrative.motifs.hotspots@v1` | Hotspot trail motifs (used for island-hop corridor seeding) | `{ width,height, active: string[], summary: { trails:number, points:number } }` | Empty `active`, `trails:0`, `points:0`. |
| `artifact:narrative.motifs.rifts@v1` | Rift line + shoulder motifs | `{ width,height, active: string[], passive: string[], summary: {...} }` | Empty arrays + zeroed summary. |
| `artifact:narrative.motifs.orogeny@v1` | Orogeny belts + windward/lee tagging | `{ width,height, active: string[], passive: string[], summary: {...} }` | Empty arrays + zeroed summary. |
| `artifact:narrative.corridors@v1` | Strategic corridor tiles + metadata maps | `{ width,height, active: string[], summary: { stage: \"preIslands\"|\"postRivers\", kindByTile: Record<string,string>, ... } }` | Empty arrays + empty maps. |
| `artifact:narrative.swatches@v1` | Macro-climate “swatches” summary | `{ width,height, summary: { applied:boolean, kind:string, tiles?:number } }` | `{ applied:false, kind:\"none\" }`. |
| `artifact:narrative.paleo@v1` | Paleo hydrology summary (post-rivers; optional) | `{ width,height, summary: { deltas:number, oxbows:number, fossils:number, kind:string } }` | Zeroed counts + `kind:\"none\"`. |

Notes:
- Keys are currently `storyKey(x,y)` strings (`"x,y"`). Keep the v1 schema JSON-friendly; performance-oriented encodings (indices/typed arrays) can be a v2 evolution.
- These shapes intentionally track current overlay payloads so the cutover is representational, not semantic.

## Producer → artifact mapping (current code)

| Producer step / module | Current overlay kind | Proposed artifact |
| --- | --- | --- |
| `storySeed` (`pipeline/narrative/StorySeedStep.ts`) | `margins` | `artifact:narrative.motifs.margins@v1` |
| `storyHotspots` (`pipeline/narrative/StoryHotspotsStep.ts`) | `hotspots` | `artifact:narrative.motifs.hotspots@v1` |
| `storyRifts` (`pipeline/narrative/StoryRiftsStep.ts`) | `rifts` | `artifact:narrative.motifs.rifts@v1` |
| `storyOrogeny` (`pipeline/narrative/StoryOrogenyStep.ts`) | `orogeny` | `artifact:narrative.motifs.orogeny@v1` |
| `storyCorridorsPre` / `storyCorridorsPost` (`pipeline/narrative/StoryCorridorsStep.ts` via `storyTagStrategicCorridors`) | `corridors` | `artifact:narrative.corridors@v1` (include `stage` in summary) |
| `storySwatches` (`pipeline/narrative/StorySwatchesStep.ts`) | `swatches` | `artifact:narrative.swatches@v1` |
| `rivers` (`pipeline/hydrology/RiversStep.ts`, conditional) | `paleo` | `artifact:narrative.paleo@v1` (only when paleo enabled) |

## Consumer map (who reads narrative today)

Current consumers via StoryTags/overlays (must migrate off StoryTags in NARRATIVE‑2):
- Corridors tagging consumes:
  - hotspots + rifts (reads `StoryTags.hotspot` / `StoryTags.rift*`) inside `storyTagStrategicCorridors` → should instead require the corresponding narrative artifacts.
- Ecology consumes:
  - biomes step hydrates corridors + rifts StoryTags from overlays (`pipeline/ecology/BiomesStep.ts`) → should instead require `artifact:narrative.corridors@v1` and `artifact:narrative.motifs.rifts@v1` (or derived views).
  - features step hydrates margins StoryTags (`pipeline/ecology/FeaturesStep.ts`) → should instead require `artifact:narrative.motifs.margins@v1` (or derived view).

Potential surprise / drift to resolve during implementation:
- `StoryTags.hotspotParadise` / `StoryTags.hotspotVolcanic` exist and are used by features, but no producer currently populates them (hotspots tagging populates `StoryTags.hotspot` only). This likely needs either:
  - aligning producers/consumers to a single hotspot artifact, or
  - splitting hotspots into categorized artifacts (paradise/volcanic) if that’s the intended semantics.

