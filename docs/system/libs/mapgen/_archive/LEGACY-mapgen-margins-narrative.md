# Margins & Narrative Overlay Primer

This note walks through the Swooper pipeline from the physics stack up to the
moment the narrative overlays fire, with a special focus on how continental
margins are derived and consumed. It includes plain-language definitions for
jargon that a typical Civilization player might not know.

## Key terms

- **Stage manifest** – The ordered checklist of generation steps. Each stage
  advertises what data it needs and what it produces so the orchestrator can
  gate execution. The canonical order is captured in `mods/mod-swooper-maps/ENGINE_REFACTOR_PLAN.md`.
- **FoundationContext** – A read-only package emitted by the foundations
  cluster. It bundles the Voronoi plate seeds, tectonic tensors (uplift,
  convergence, rift stress), and atmospheric drivers (wind and currents).
  Everything downstream reads from this single source of physics truth instead
  of recomputing it.
- **Heightfield buffer** – An in-memory staging surface that carries elevation,
  terrain types, and a derived land mask while morphology operates. Instead of
  writing straight to the engine after every tweak, morphology edits this buffer
  and flushes it in controlled batches.
- **Climate field buffer** – The rainfall and humidity arrays maintained in
  parallel with the heightfield. Climate stages nudge these buffers, and the
  narrative overlays consume them when placing rainfall-biased motifs.
- **Margin** – A stretch of coastline sitting on top of a plate boundary.
  Active margins are energetic, collision-heavy fronts (think the Andes or
  Japan); passive shelves are the calmer trailing edges (like the U.S. Atlantic
  seaboard). Margins are represented as sparse coordinate tags.
- **StoryTags** – A frozen object that stores mutable `Set` collections keyed by
  `"x,y"` tile strings. Story layers mark tiles by dropping keys into these sets;
  downstream logic checks membership when deciding where to place a motif.
- **Story overlay** – A lightweight narrative pass (hotspot trails, rifts,
  orogeny belts, corridors, swatches) that reads the physics products and the
  shared buffers, then emits more StoryTags or climate tweaks. Overlays avoid
  rerunning physics; they only annotate the established terrain.

## Pipeline walk-through (physics → narrative setup)

1. **Foundations** build the Voronoi plate solution, apply the configured
   rotation/jitter rules, and emit a deterministic `FoundationContext`. The
   orchestrator threads this context into the shared `MapContext` so later
   stages can inspect plate IDs, uplift fields, and wind tensors before touching
   any terrain.
2. **Landmass shaping** uses the same foundation data to project a plate-aware
   land mask, populate the heightfield buffer, and synchronize the buffer back
   to the engine in one batch. Diagnostics (ASCII slices, window summaries) are
   logged here while the surface is still malleable.
3. **Coastlines** expand and ruggedize the shoreline inside the heightfield
   buffer. The orchestrator then validates the resulting terrain, stamps it into
   the engine, and pulls the updated tiles back into the buffer via
   `syncHeightfield()` so every pass keeps operating on the same authoritative
   arrays.
4. **Margin tagging** resets the StoryTags singleton and calls
   `storyTagContinentalMargins(ctx)` before any narrative overlay runs. The
   helper scans row by row, finds long coastal runs, and marks a sparse subset as
   active or passive margins according to the configured fractions and minimum
   segment length. The result is published to the new `StoryOverlays` registry as
   `ctx.overlays.get("margins")`, and the same snapshot seeds
   `StoryTags.activeMargin` / `StoryTags.passiveShelf` for legacy consumers.
5. **Margin-aware coast polish** (`layerAddRuggedCoasts`) consults those tags to
   add fjords and shelf smoothing where appropriate. Because the overlay lives
   in the shared registry, later passes can rehydrate the StoryTags view at any
   time without recomputing the sweep.
6. **Narrative reset window** – Some story passes (hotspots, rifts) clear tags
   again before writing their own overlays. Once those motifs are stamped, the
   orchestrator simply rehydrates the margin sets from the published overlay so
   the active/passive keys stay in sync for downstream consumers such as island
   placement and feature dressing—no second tagging pass required.
7. **Mountains, volcanoes, lakes** operate on the heightfield buffer with full
   access to the margin tags and the foundation tensors. Mountains pull uplift
   and boundary proximity from the world model, volcanoes bias toward convergent
  and hotspot cues, and lakes respect the staged land mask. The buffered surface
   is synced only at checkpoints so physics and morphology stay in lockstep.
8. **Climate baseline/refinement** write rainfall and humidity into the climate
   buffer. These arrays stay authoritative; later swatches and story moisture
   adjustments read and tweak them instead of editing engine tiles directly.
9. **Narrative overlays** finally run, now that the terrain, coasts, and climate
   grids are settled. Each overlay reads the `FoundationContext`, the heightfield
   buffer, the climate buffer, and the StoryTags that were seeded earlier. The
   overlays add their own tags (e.g., `StoryTags.riftLine`, `StoryTags.hotspot`)
   or climate deltas, but they never rerun foundations or morphology.

## Margin system deep dive

### How margins are detected

`storyTagContinentalMargins()` performs a sweep across coastal tiles:

1. Count every coastal land tile to establish target quotas for active vs.
   passive segments.
2. Walk each row, identify contiguous coastal runs, and discard anything shorter
   than the minimum segment length (defaults scale with map size).
3. Alternate between active and passive picks so tags do not cluster too hard on
   one side of a continent. When a run is chosen, each tile in the stretch is
   recorded as a `"x,y"` key in the matching StoryTag set.

The helper only tags coastal land tiles, so inland morphology is unaffected.
Because StoryTags are sparse sets, the data is cheap to store and easy for later
passes to query.

### How margins are used today

- **Coastlines** – `layerAddRuggedCoasts()` reads the active-margin keys to seed
  dramatic fjords and applies gentler smoothing on passive shelves. The result is
  a coastline that reflects tectonic energy without needing another simulation.
- **Islands** – `layerAddIslandChains()` biases volcanic arcs toward active
  margins and coral archipelagos toward passive shelves by checking the same tag
  sets before sampling placement chances.
- **Features** – The feature embellisher rewards passive shelves with extra reef
  rolls and leans on the active set when promoting volcanic vegetation. The
  helper still validates every placement through the engine to keep gameplay
  fair.
- **Overlay registry** – Phase B now publishes the “margin metadata” snapshot via
  `StoryOverlays`. Narrative passes and downstream layers hydrate their local tag
  view straight from this registry, so resets no longer force another
  `storyTagContinentalMargins()` sweep.

### Why this does not rerun physics

Margins are annotations layered on top of the heightfield. They are cheap, sparse
sets that describe where tectonic boundaries touch the coast. Applying or
reapplying them does not modify the elevation buffer; it simply updates the
lookup tables that downstream modules consult. No additional Voronoi solve or
morphology replay is needed.

## Narrative overlays and terrain manipulation

Story overlays operate after the physics-driven heightfield and climate buffers
are locked. When an overlay wants to hint at a canyon, plateau, or ancient rift,
 it does so indirectly:

- **Placement cues** – Overlays mark tiles in StoryTags (`riftLine`,
  `riftShoulder`, `hotspot`, etc.). Later layers (features, biomes, swatches)
  interpret those cues to sprinkle vegetation, adjust rainfall, or place
  corridor metadata.
- **Rainfall tweaks** – Climate swatches and paleo hydrology call helpers in the
  climate engine to nudge rainfall/humidity within strict clamps. They write to
  the staged climate buffer and let the orchestrator synchronize the arrays back
  to the engine at the end of the cluster.
- **No direct height edits** – Elevation changes happen only in morphology
  stages (coast shaping, mountains, volcanoes, lakes). Once the narrative phase
  begins, the heightfield buffer is treated as read-only, so there is no “rerun”
  of terrain physics.

If you need a canyon-scale depression, you sculpt it during morphology (for
example, as part of the plate-driven mountain/rift logic) and expose the result
through tags or metadata. The narrative overlay then references those tags to
place river corridors, arid swatches, or discovery hooks. This keeps the physics
pass deterministic while still giving authors a vocabulary for long-lived
geological stories.

## Putting it together

1. Physics establishes a single authoritative terrain and climate snapshot.
2. Margins and other StoryTags annotate that snapshot with tectonic context.
3. Narrative overlays consult both the physics data (heightfield, climate,
   FoundationContext) and the annotations to place story-driven flourishes.
4. Downstream consumers (biomes, features, placement) read the same annotations
   so narrative intent carries through without mutating the locked terrain.

The result is a pipeline where dramatic formations (canyons, plateaus, shelves)
are still rooted in physics, but the narrative layer can emphasize or reinterpret
those formations through lightweight overlays rather than by rewinding the
simulation.
