# Narrative & Story System Architecture

> **Target vs Current:** This doc describes the target Narrative design (M3+). Current implementations rely on ad-hoc "Story Tags" and scattered logic. This document unifies them into a coherent **Cross-Cutting Subsystem**.

## 1. Overview

The **Narrative System** is the "Soul" of the map generation engine. While the physical layers (Foundation, Morphology, Hydrology) determine *what* the world looks like, the Narrative system determines *why* it matters and *how* it feels.

Unlike other systems which map 1:1 to a pipeline phase, **Narrative is a Cross-Cutting Concern**. It runs *alongside* every phase, observing the physical generation and annotating it with meaning (Metadata), or injecting specific "Story Steps" to shape the world in non-random ways.

### Core Responsibilities
1.  **Region Identification:** Grouping tiles into named, meaningful areas (e.g., "The Atlas Mountains", "The Great Desert").
2.  **Metadata Tagging:** Annotating cells with semantic tags (e.g., `RiftValley`, `OldWorld`, `Chokepoint`) for downstream logic.
3.  **Narrative Injection:** Inserting specific features that defy pure physics (e.g., Natural Wonders, Strategic Corridors, "Atlantis" myths).
4.  **Naming:** Generating coherent names for landmasses, oceans, and features based on their history.

---

## 2. Data Model

The Narrative system maintains the **Story Overlay**, a parallel data structure that grows as the map is built.

### 2.1. Inputs (Read-Only)
*   **All Physical Artifacts:** The Narrative system reads `mesh`, `tectonics`, `elevation`, `climate`, etc., to interpret the world.

### 2.2. Artifacts (`context.artifacts.story`)
The central repository for narrative data.

```typescript
interface StoryArtifacts {
  /**
   * Named geographical regions.
   * Used for UI labels, text logs, and scoped logic.
   */
  regions: Array<{
    id: string;
    type: 'continent' | 'ocean' | 'mountain_range' | 'desert' | 'valley';
    name: string;
    cells: Int32Array; // List of cell indices
    tags: Set<string>;
  }>;

  /**
   * Per-cell semantic tags.
   * A sparse map or bitmask allowing steps to query "Is this a Rift Valley?".
   */
  tags: Map<number, Set<string>>;

  /**
   * Strategic paths or corridors identified during generation.
   * e.g., "The only pass through the mountains".
   */
  corridors: Array<Path>;

  /**
   * The "History Log" of the world.
   * Records major events (e.g., "Continent A collided with B in Era 1").
   */
  history: Array<WorldEvent>;
}
```

### 2.3. Outputs (Mutable Fields)
*   `context.fields.features`: Placing Natural Wonders.
*   `context.fields.names`: (Future) Text labels for the UI.

---

## 3. Integration Across the Pipeline

The Narrative system integrates via two mechanisms: **Observers** (which tag data) and **Injectors** (which modify data).

### 3.1. Foundation Phase: The "Deep Time" Story
*   **Concept:** Tectonics define the "Old World" vs. "New World".
*   **Observer:** When plates collide, tag the boundary cells as `Orogeny` (Mountain Building). When plates separate, tag as `Rift`.
*   **Artifact:** `regions` (Continents, Oceans).
*   **Example:** "The Great Rift Valley" is identified here, even before it has water or vegetation.

### 3.2. Morphology Phase: The "Landform" Story
*   **Concept:** Erosion creates "Passes" and "Basins".
*   **Observer:** Identify `Chokepoint` cells (narrow flat areas between mountains). Identify `EndorheicBasin` (sinks that don't drain to the ocean).
*   **Injector:** **"Fjord Carver" Step**. A specific step that runs after erosion to artificially deepen coastal valleys in high latitudes, enforcing a "Viking" aesthetic.

### 3.3. Hydrology Phase: The "Climate" Story
*   **Concept:** Weather isn't random; it follows patterns (Swatches).
*   **Injector:** **Climate Swatches**. The `RegionalWeatherStep` *is* a narrative tool. It allows a designer to say "Place a Monsoon here" or "Make this continent dry."
*   **Observer:** Tag regions as `RainShadow` or `TradeWindBelt`.

### 3.4. Ecology Phase: The "Living" Story
*   **Concept:** Unique biomes and wonders.
*   **Injector:** **Natural Wonder Placement**. Uses `story.tags` to find perfect spots (e.g., "Place Mt. Kilimanjaro in a `Rift` near the `Equator`").
*   **Injector:** **Legendary Resources**. "King Solomon's Mines" placed in a specific `MountainRange`.

### 3.5. Placement Phase: The "Human" Story
*   **Concept:** Fairness vs. Flavor.
*   **Consumer:** The Start Positioner reads `story.corridors` to ensure players aren't isolated. It reads `story.regions` to try and place Civs on their "home" continent types.

---

## 4. Extension Points

How do we add more narrative?

### 4.1. Adding a New "Story" (e.g., "The Ring of Fire")
1.  **Create a Step:** `TagRingOfFireStep`.
2.  **Insert in Foundation:** Run after `tectonics.resolve`.
3.  **Logic:** Iterate `tectonics.volcanism`. If high, tag cell as `RingOfFire`.
4.  **Downstream:** In Ecology, a `VolcanicSoilStep` checks for the `RingOfFire` tag and boosts fertility.

### 4.2. Adding a "Scripted Feature" (e.g., "The Canal")
1.  **Create a Step:** `CarveCanalStep`.
2.  **Insert in Morphology:** Run after `erosion`.
3.  **Logic:** Find a narrow isthmus (1-2 cells wide) separating two large `Ocean` regions. Lower elevation to `SeaLevel`.

---

## 5. Configuration

Narrative configuration is often scattered, but can be centralized in `MapGenConfig.narrative` for global toggles.

```typescript
interface NarrativeConfig {
  /**
   * Named presets for world flavor.
   * e.g., "Primordial" (more volcanoes), "Arid" (more deserts).
   */
  flavor: string;

  /**
   * Toggles for specific narrative injections.
   */
  features: {
    naturalWonders: boolean;
    namedRegions: boolean;
    strategicChokepoints: boolean;
  };

  /**
   * Rules for naming things.
   * e.g., "Use Tolkienesque names".
   */
  naming: NamingRules;
}
```
