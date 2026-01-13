# Narrative

> **Status:** Canonical (domain-only causality + contract spec)
>
> **This doc is:** what Narrative/Playability *means* in the pipeline: responsibilities, canonical products, and modeling posture.
>
> **This doc is not:** SDK wiring guidance (step/stage file layout, authoring mechanics, adapters).

## Overview

Narrative is the "soul" of map generation. While the physical systems determine *what* the world looks like, Narrative determines *why* it matters and *how* it feels.

Unlike other domains that have clear physical ownership, Narrative is a **cross-cutting concern**:

- It **observes** the evolving world and annotates it with meaning (regions, motifs, strategic cues).
- It can **inject** bespoke features that intentionally deviate from pure physics (wonders, corridors, myths).

**Target model (locked):**
- Narrative **story entries** are the published primitives (immutable artifacts).
- Narrative “views” (overlays/snapshots) are **derived on demand** from story entries (and, where relevant, current buffers) for inspection/debug/contracts; they are not published dependency surfaces.
  - “Buffers” are mutable working layers (e.g., heightfield, climate fields) distinct from artifacts; see `docs/system/libs/mapgen/architecture.md` (“Pipeline state kinds”).

### Core responsibilities

1. **Region identification:** Group tiles/cells into named, meaningful areas (mountain ranges, deserts, continents).
2. **Semantic annotation:** Mark places with high-level meaning (rift zones, chokepoints, trade-wind belts).
3. **Narrative injection:** Add specific features that enforce theme or gameplay beats.
4. **Naming:** Generate coherent names for landmasses, oceans, and features based on their interpreted history.

## Conceptual products

```typescript
interface NarrativeProducts {
  /**
   * Named geographical regions.
   * Used for UI labels, text logs, and scoped logic.
   */
  regions: Array<{
    id: string;
    type: "continent" | "ocean" | "mountain_range" | "desert" | "valley";
    name: string;
    cells: readonly number[];
    annotations: readonly string[];
  }>;

  /**
   * Per-cell semantic annotations (sparse map or bitmask).
   * Allows consumers to query “is this a rift zone?” without embedding domain heuristics everywhere.
   */
  annotationsByCellId: Readonly<Record<string, readonly string[]>>;

  /**
   * Strategic paths or corridors identified during generation.
   * Example: “the only pass through the mountains”.
   */
  corridors: Array<Path>;

  /**
   * A compact “history log” of the world.
   * Records major interpreted events (e.g., collisions, rifting, regime changes).
   */
  history: Array<WorldEvent>;
}
```

## Observer vs injector

- **Observers** interpret existing physical signals and add semantic meaning (markers, regions, corridors, history entries).
- **Injectors** deliberately modify the world when a motif or gameplay beat needs enforcement (fjords, canals, bespoke wonders).

Injectors should be used sparingly: prefer “wrap existing signals with meaning” over “rewrite the world” unless the motif is intentional and testable.

## Examples across layers

### Deep-time story (foundation signals)

- Plate interactions can suggest “old world” vs “new world” divides.
- Collision zones can be interpreted as mountain-building belts; separation as rift basins.

### Landform story (morphology signals)

- Erosion patterns can imply passes, basins, chokepoints, and endorheic sinks.
- Coastal/high-latitude conditions can justify fjord-like carving as a deliberate motif.

### Climate story (hydrology/climate signals)

- Macro climate patterns can be nudged by themed regional constraints (monsoon belts, rain shadows, trade-wind regimes).

### Living story (ecology signals)

- Unique biomes and wonders can be placed where physical + narrative signals agree (rift + equator; volcanic belt; fertile delta).
- “Legendary resources” can be scoped to named regions or motifs to support flavor.

### Human story (placement signals)

- Corridors and regions can be used to balance fairness (avoid isolation) while preserving strong thematic geography.

## Related references (contract truth lives elsewhere)

- Narrative/playability contract (story entries, optionality, and “no StoryTags” posture): `docs/projects/engine-refactor-v1/resources/PRD-target-narrative-and-playability.md`
