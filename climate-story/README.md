# Climate Story — Narrative Imprint Layer (v1.0.0+ concept)

Purpose
- Add legible “signs of history” to maps without heavy simulation.
- Evoke tectonics, volcanism, paleo‑rivers, glaciation, and continental margins through sparse, data‑coupled motifs.
- Preserve vanilla compatibility, balance, and all v1.0.0 guardrails.

Scope
- This directory houses the Climate Story design notes and iterations.
- Start with lightweight tagging (“StoryTags”) and small, composable nudges in existing passes.
- Keep everything O(width × height) with tiny radii and strict clamps.

Contents
- README.md (this doc): concept, motifs, integration points, guardrails, first‑iteration plan.
- Future: split into focused docs per motif as we iterate (e.g., HotspotTrails.md, RiftValleys.md).


## 1) Design Principles

- Tell history with sparse, readable signals:
  - Long arcs, aligned chains, linear basins, deltas, fjords—few, but legible.
- Nudge, don’t overwrite:
  - Use existing knobs: coast/island shape, rainfall biases, biome/feature preferences.
  - No large elevation edits, no cliff/mountain spam.
- Compatibility-first:
  - Respect base systems; validate feature placement; avoid hardcoding IDs.
- Performance:
  - Single-pass tagging + small local scans (radius ≤ 4).
  - No flood fills or global heavy ops.
- Safety:
  - Rainfall clamped to [0, 200].
  - Preserve robust sea lanes; avoid chokepoints.
  - Hard caps per motif per map/continent; minimum distances between motifs and from starts.


## 2) StoryTags (lightweight data model)

Represent “imprints” as transient per‑tile tags and sparse polylines/areas that other passes consult. Suggested tags:

- ACTIVE_MARGIN, PASSIVE_SHELF
- HOTSPOT_TRAIL
- RIFT_LINE
- OROGENY_BELT (collision/suture corridor)
- FOSSIL_CHANNEL
- DELTA_FAN, OXBOW_CANDIDATE
- GLACIAL_ZONE, KETTLE_CHAIN
- VOLCANIC_ARC

Implementation note
- Tags can be kept in simple 2D arrays parallel to the map or as lists of sparse coordinates/segments.
- They are inputs to: coast/island shaping, rainfall refinement, biome nudges, feature density tweaks.
- Tags are ephemeral—only used during generation; nothing persists beyond map creation.


## 3) Motifs (what to imprint and how)

Each motif includes: the real‑world story, a light encoding strategy, and where to integrate it in the pipeline.

3.1 Active vs. Passive Margins (continental coast story)
- Story: One side of a continent is trenchy with island arcs (active), the other has a broad continental shelf (passive).
- Encode:
  - Classify sparse coast segments per continent as ACTIVE_MARGIN or PASSIVE_SHELF (continent centroid + low‑freq noise + coastline length cap).
- Integrations:
  - Coast shaping: slightly more bays/fjords on active segments; slightly wider shallow shelf on passive segments in sparse ribbons.
  - Islands: aligned arc islands just seaward of active segments (low density, hard gaps).
  - Features: reefs/sandbars more probable on passive shelves (validate before placing).

3.2 Hotspot Trails (oceanic volcanism story)
- Story: Linear chains of seamounts/islands, decaying in size, sometimes with a gentle bend.
- Encode:
  - Seed 2–3 deep‑ocean trails as short polylines with decaying island probability.
- Integrations:
  - Island pass: bias cluster placement along these polylines; keep separation generous.

3.3 Rift Valleys and Inland Basins (continental interior story)
- Story: Linear rifts with long lakes; fertile shoulders; rifts that may reach offshore.
- Encode:
  - 1–2 rift polylines per large continent; carve very sparse, small lakes along the line if lowland; tag shoulder tiles.
- Integrations:
  - Rainfall: mild humidity boost along rift line (stronger at low elevation, clamped).
  - Biomes: prefer grassland/forest on shoulders if climate allows.

3.4 Orogenic Belts and Sutures (collision story)
- Story: Long mountain arcs; wetter windward forelands; drier leeward rain shadows; mixed suture textures.
- Encode:
  - Tag corridors that intersect existing mountain belts; don’t add mountains—just classify belt and sides (windward/lee by prevailing wind).
- Integrations:
  - Rainfall: slightly amplify existing orographic logic (more subtraction on lee, small boost on windward); narrow radius (≤ 3).
  - Biomes: steppe/brush in lee (if dry), greener forest/grass on windward sides (if wet).

3.5 Paleo‑Hydrology (river story across time)
- Story: Deltas at mouths, oxbow lakes near meanders, fossil channels across dry plains into basins.
- Encode:
  - After rivers: tag a few major mouths for DELTA_FAN; pick rare OXBOW_CANDIDATE near long lowland turns; draw short FOSSIL_CHANNEL segments toward enclosed basins.
- Integrations:
  - Terrain/features: tiny marsh/floodplain fans near mouths (validated); a couple of 1‑tile oxbow lakes; no rivers added for fossils.
  - Rainfall/biomes: small humidity/green bias along fossil channels (very sparse, clamped).

3.6 Glacial Fingerprints (high‑latitude/mountain story)
- Story: Fjords where ice carved coasts, kettle lakes in glaciated lowlands, taiga belts.
- Encode:
  - Tag GLACIAL_ZONE where latitude is high and elevation transitions are strong; mark KETTLE_CHAIN candidates in lowland pockets near mountains.
- Integrations:
  - Coast: increase fjord chance on glacial coasts (still sparse).
  - Terrain: a few 1‑tile kettle lakes scattered in flagged zones.
  - Biomes: prefer taiga over bare tundra when moisture permits.

3.7 Volcanic Fertility (time since eruption)
- Story: Young volcanic soils are fertile; nearby valleys are lush.
- Encode:
  - Tag VOLCANIC_ARC tiles around active margins/hotspot islands with moderate elevation.
- Integrations:
  - Rainfall: +5–10 local boost (clamped), radius ≤ 2.
  - Biomes: gentle preference for forest/tropical variants if climate supports them.


## 4) Integration Points (use existing passes)

Leverage the current pipeline; do not reorder major steps.

- Landmasses/coasts seeded → Tag StoryTags
  - After continents exist and before Climate Phase A:
    - Derive ACTIVE_MARGIN/PASSIVE_SHELF, HOTSPOT_TRAIL, RIFT_LINE, OROGENY_BELT, GLACIAL_ZONE.

- Coastline shaping (ruggedize) and island seeding
  - Read margin and trail tags to bias:
    - Bays/fjords (active/glacial segments), shelf widening (passive segments), arc/island alignment (active/hotspot).
  - Guard: never reduce sea lanes below accepted width.

- Climate Phase A (baseline + bands)
  - No major changes here; keep bands and light coastal bonuses.

- Rivers (base)
  - No changes; used as a prerequisite for paleo‑hydrology.

- Climate Phase B (earthlike refinement)
  - Read StoryTags to:
    - Slightly increase windward boosts and lee‑side drying within narrow belts.
    - Apply rift humidity, volcanic fertility, fossil‑channel green bias.
  - Always clamp to [0, 200].

- Biomes and Features
  - Biome nudges read StoryTags:
    - Rift shoulders → grassland/forest; lee belts → steppe/brush; volcanic arcs → lusher variants if rainfall permits; glacial zones → taiga preference over barren tundra where wet enough.
  - Features:
    - Reefs/sandbars on passive shelves; rainforest/forest/taiga chances adjusted in tagged belts; deltas/marshes/oxbows (always validated; lookup feature indices safely).


## 5) Tunables (initial set)

Global caps (per map, per continent)
- maxHotspotTrails (map): 3
- maxRiftLines (per large continent): 2
- maxRiftLakeTiles (per continent): 8–12
- maxArcIslandsPerActiveSegment: 6 (with spacing)
- maxDeltaFans (map): 4
- maxOxbowLakes (map): 6
- maxKettleLakes (map): 10

Intensity and radii
- riftHumidityBoost: +5 to +12 (clamped)
- volcanicFertilityBoost: +5 to +10 (clamped)
- fossilChannelHumidity: +3 to +8 (clamped; sparse)
- orogenyLeeDrynessAmplifier: 1.1–1.25× local subtraction (still clamped)
- windwardBoostAmplifier: +2 to +6
- beltRadius: 1–3 (narrow)
- distanceToWaterRadius: keep ~4 (unchanged baseline)

Placement heuristics
- minSeaLaneWidth: maintain current acceptance width (no shelf/arc change can violate this).
- minMotifSeparation: 8–12 tiles
- minDistanceFromStarts: 6–10 tiles for intrusive motif effects (e.g., trench, shelf widening).


## 6) Guardrails and Invariants

- Do not reintroduce aggressive cliffs or heavy mountain amplification.
- Keep rainfall within [0, 200] at all times.
- Validate features via TerrainBuilder.canHaveFeature and resolve via GameInfo.Features.lookup; skip on failure.
- Maintain pass order:
  - Rivers before earthlike refinements; biomes after rainfall; features after biomes.
- Keep oceans truly open:
  - Any coastline/island adjustments must not create chokepoint spam.
- Performance:
  - All passes remain O(width × height); local scans radius ≤ 4; sparse motif elements only.
- Documentation:
  - Record changes and tunables in DESIGN.md change log (v1.0.0+ deltas).


## 7) Debugging and Validation

Logging
- Add phase messages:
  - “Imprinting tectonic margins…”
  - “Drawing hotspot trails…”
  - “Marking rift lines and basins…”
  - “Applying paleo‑hydrology (deltas/oxbows/fossils)…”
  - “Amplifying orographic belts…”
- Optionally add JSON start/end events co‑located with existing optional telemetry.

Data dumps (optional)
- Toggle temporary dump helpers for StoryTags:
  - activeMargin/passiveShelf overlays
  - hotspotTrail polylines
  - riftLine + rift lakes
  - orogeny belts with windward/lee sides
  - fossil channels / deltas / oxbows
  - glacial zones / kettles

Visual acceptance checks (augment existing)
- Oceans: lanes remain robust; arc islands don’t bridge gaps.
- Coasts: a few trenchy/fjordy segments; shelf feels broader on passive sides.
- Interiors: rift lake chains with greener shoulders; long belts show expected windward/lee patterns.
- Rivers: occasional deltas and oxbows; fossil green lines are subtle, rare, and coherent.
- High‑latitudes: scattered kettles; taiga preference where wet enough; restrained tundra remains.


## 8) First Iteration Plan (low risk, high signal)

Start with two motifs that are visually legible and safe:

1) Hotspot Trails (deep ocean)
- Add 2–3 short trails with decaying island probability and generous spacing.
- Verify: no lane closures; islands align; overall density remains low.

2) Rift Valleys (interior)
- Tag 1–2 rift lines per large continent; place 6–10 total lake tiles (1–3 chains).
- Apply riftHumidityBoost (+8 max) and narrow radius (≤ 2).
- Biome preference for grassland/forest on shoulders when rainfall allows.
- Verify: shoulder greening visible; rainfall clamped; no over‑lake clustering.

Instrumentation
- Enable phase logs; optionally dump StoryTags overlays.
- Compare visuals vs. outputs/1.0.0; ensure acceptance criteria still pass.

If both pass:
- Layer in small orogeny amplifiers (windward/lee), then limited paleo‑hydrology (few deltas/oxbows).


## 9) Risks and Mitigations

- Risk: Sea‑lane narrowing by shelves/arc islands.
  - Mitigation: enforce minSeaLaneWidth; cap length/width of shelf ribbons; arc spacing must exceed threshold.
- Risk: Over‑greening from multiple boosts stacking.
  - Mitigation: clamp at each application; enforce exclusive zones or diminishing returns.
- Risk: Visual noise from too many tags.
  - Mitigation: hard cap motif counts; minimum separation; bias toward longer, cleaner lines.
- Risk: Start bias (too fertile/too hostile near spawns).
  - Mitigation: minDistanceFromStarts for intrusive changes; keep fertility nudges mild.


## 10) Roadmap

Phase A (Weeks 1–2)
- Implement StoryTags scaffolding and toggles.
- Hotspot Trails + Rift Valleys minimal set with tunables.
- Add logs and optional dumps; validate acceptance criteria.

Phase B (Weeks 3–4)
- Orogenic belts windward/lee amplifiers.
- Passive/active margins with conservative coast/shelf tweaks and reef validation.

Phase C (Weeks 5+)
- Paleo‑hydrology (deltas/oxbows/fossil channels) in small quantities.
- Glacial fingerprints (fjord bias + kettle scatter + taiga preferences).

Ongoing
- Parameter sweeps per motif with screenshots and seed snapshots.
- Update DESIGN.md change log and AGENTS.md quick notes when knobs stabilize.


## 11) Change Log (for this directory)

- v0.1 (proposed): Introduce Climate Story layer concept, StoryTags model, motif catalog, tunables, guardrails, and first iteration plan.


— End of Climate Story README —