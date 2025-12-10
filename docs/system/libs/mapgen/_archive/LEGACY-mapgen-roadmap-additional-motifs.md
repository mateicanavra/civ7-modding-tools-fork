# Roadmap — Additional Climate Story Motifs (Margins, Orogeny, Paleo‑hydrology, Glacial)

Status: Proposed (v0.1)
Layer: Climate Story (Narrative Imprint)
Targets: Huge maps; compatible with v1.0.0 core pipeline and guardrails

Purpose
- Extend the Climate Story layer beyond Hotspot Trails and Rift Valleys with four additional, legible motifs:
  1) Margins: Active vs. Passive Continental Margins
  2) Orogeny: Windward/Lee Amplification Along Mountain Belts
  3) Paleo‑hydrology: Deltas, Oxbows, and Fossil Channels
  4) Glacial Fingerprints: Fjords, Kettle Lakes, and Taiga Emphasis
- Maintain O(width × height) complexity, small radii, strict clamps, and strict validation for feature placement.
- Preserve open ocean lanes and vanilla balance; never introduce heavy elevation edits or cliff/mountain spam.

Related docs
- climate-story/README.md — Concept, StoryTags model, guardrails, and first iteration plan.
- climate-story/HotspotTrails_and_RiftValleys.md — First two motifs and their tunables.


## 1) Iteration Plan and Dependencies

Phase sequencing (recommended)
- Phase A: Margins (Active/Passive) — uses coast/island passes; minimal climate coupling.
- Phase B: Orogeny — leverages existing orographic logic in rainfall refinement with narrow belt amplification.
- Phase C: Paleo‑hydrology — post‑rivers micro‑terrain/feature motifs (deltas/oxbows); minimal rainfall/biome bias.
- Phase D: Glacial — coast bias (fjords), scattered kettle lakes, biome emphasis (taiga vs. tundra), constrained to high latitudes.

Shared safeguards
- Size scaling: use sqrt(area/base) as the primary factor to widen belts, lengthen lines, and slightly raise tiny probabilities on larger maps; keep hard caps and lane/rainfall clamps.
- Sea lanes: enforce minimum lane width for any coast/shelf/island changes.
- Rainfall: clamp to [0, 200] after each adjustment.
- Features: always validate via engine rules and resolve types via lookups; skip on failure.
- Starts: respect minimum distances for intrusive edits (lakes, shelf widening, deltas).
- Stacking: apply diminishing returns when multiple StoryTags affect the same tile to reduce over‑greening or over‑drying.
- Performance: use local neighborhood scans with radius ≤ 4; early exits; sparse tagging.


## 2) Motif: Continental Margins (Active vs. Passive)

Narrative intent
- One side of a continent reads as “active” (narrow shelf, trench tone, island arcs).
- The opposite reads “passive” (broad shelf, reefs/sandbars, calmer relief).

StoryTags
- `ACTIVE_MARGIN`, `PASSIVE_SHELF`
- Optional: `VOLCANIC_ARC` for island arcs co‑located with active margins.

Signals to imprint (sparse and safe)
- Active margins:
  - Slightly higher fjord/bay chance on select segments.
  - Occasional “trench” feel by converting a thin ribbon of shallow water to deep ocean on the seaward side (very sparse, never closing lanes).
  - Aligned, sparse offshore arc islands with generous spacing.
- Passive shelves:
  - Slight widening of shallow‑water shelf in narrow ribbons.
  - Slightly higher validated reef/sandbar feature probability offshore.

Tunables (suggested defaults)
- `marginActiveFractionPerContinent`: 0.25 (fraction of coastline length that can be “active”)
- `marginPassiveFractionPerContinent`: 0.25
- `marginMinSegmentLength`: 10–16 tiles (avoid noisy toggling)
- `marginShelfWideningRadius`: 1 tile (passive) with hard cap frequency
- `marginTrenchRibbonChance`: very low (e.g., 0.02 per eligible segment tile)
- `arcIslandsPerActiveSegmentMax`: 4–6 (with spacing ≥ 6 tiles)
- `reefChanceMultiplierPassive`: 1.15–1.25× (clamped by validation)
- `minSeaLaneWidth`: must not be violated

Tagging algorithm (per continent)
- Compute coastline polyline segments; split into long segments.
- Use continent centroid, coastline orientation, and low‑frequency noise to tag disjoint segments as `ACTIVE_MARGIN` and `PASSIVE_SHELF` within the per‑continent fractions and with minimum segment lengths.
- Enforce separation between active/passive segments to avoid toggling every few tiles.

Integration points
- `addRuggedCoasts`:
  - Active: slightly increase bay/fjord probability; low‑probability trench ribbon conversion (shallow → deep) on seaward side; preserve lanes.
  - Passive: occasional shelf widening (convert deep→shallow offshore by 1 tile width) with low frequency and lane checks.
- `addIslandChains`:
  - Where `ACTIVE_MARGIN` is tagged, enable arc islands with generous spacing; cap per segment and globally.
- `addDiverseFeatures`:
  - Along passive shelves, increase reef/sandbar feature probabilities if validation passes.

Guardrails
- Never reduce lanes below `minSeaLaneWidth`.
- Keep trench/shelf effects sparse; apply disjoint, long segments.
- Preserve base balance; no elevation edits.

Diagnostics
- Logs: “Imprinting marginal systems…” with per‑continent segment counts and lengths.
- Optional overlays: `ACTIVE_MARGIN`, `PASSIVE_SHELF`, arc island placements.

Acceptance
- Coasts with a few trenchy/fjordy stretches; passive sides feel broader/reefier.
- Sea lanes remain clearly open; no chokepoint proliferation.


## 3) Motif: Orogeny (Windward/Lee Amplification)

Narrative intent
- Long mountain belts generate stronger windward greening and leeward dryness, aligned with prevailing winds per latitude band. It reads as a coherent “belt,” not a scattered local effect.

StoryTags
- `OROGENY_BELT` (corridor)
- `WINDWARD_FLANK`, `LEE_FLANK` (derived for a narrow radius on either side)

Signals to imprint
- Windward flank: small additional wetness.
- Lee flank: slightly stronger rain shadow (dryness).
- Optional lightweight biome nudges: windward forests/grasslands; lee steppe/brush when climate/elevation permit.

Tunables (suggested defaults)
- `orogenyBeltMaxPerContinent`: 2
- `orogenyBeltMinLength`: 24–36 tiles (dependent on continent size)
- `orogenyRadius`: 2–3 tiles
- `windwardBoost`: +2..+6 rainfall (clamped)
- `leeDrynessAmplifier`: 1.1..1.25× multiplier on existing orographic subtraction (then clamp)
- `orogenyMinSeparation`: 16 tiles
- `orogenyAvoidHighPolar`: true (or reduce strength at extreme latitudes)

Tagging algorithm
- Identify existing contiguous mountain/hill chains (or mountain density corridors) per continent.
- Select up to N belts meeting `orogenyBeltMinLength`, prefer those roughly parallel to a coast.
- For each belt:
  - Determine prevailing wind per latitude band; derive perpendicular sides as `WINDWARD_FLANK` and `LEE_FLANK` within `orogenyRadius`.

Integration points
- `refineRainfallEarthlike`:
  - Apply `windwardBoost` to `WINDWARD_FLANK`.
  - Apply a slightly stronger subtraction on `LEE_FLANK` by multiplying the local orographic deduction, then clamp.
- `designateEnhancedBiomes`:
  - Windward: gentle preference for grassland/forest if rainfall supports it.
  - Lee: gentle preference for steppe/brush if drier; never override base eligibility.

Guardrails
- Belts remain narrow; no broad regional overhaul.
- Clamp rainfall after each local adjustment.
- Avoid stacking with rift or volcanic boosts without diminishing returns.

Diagnostics
- Logs: “Amplifying orogenic belts…” with belt count and average length.
- Optional overlays: `OROGENY_BELT`, flanks.

Acceptance
- Clear windward/lee patterns along long mountain arcs.
- Regional story emerges without heavy biome changes or extreme dryness.


## 4) Motif: Paleo‑hydrology (Deltas, Oxbows, Fossil Channels)

Narrative intent
- Rivers leave signatures: deltas at mouths, oxbow lakes near meanders, and faint green ghost channels across drylands into enclosed basins.

StoryTags
- `DELTA_FAN`, `OXBOW`, `FOSSIL_CHANNEL`

Signals to imprint
- Deltas: tiny marsh/floodplain fans at select major river mouths; optional small offshore sandbar micro‑islands (sparse, no lane impact).
- Oxbows: a handful of 1‑tile lakes or marshes near strong meanders in lowland.
- Fossil channels: subtle, faint green lines across deserts pointing to basins (humidity/biome bias only, no rivers added).

Tunables (suggested defaults)
- `maxDeltas`: 3–4
- `maxOxbows`: 6
- `maxFossilChannels`: 3 (each 8–16 tiles)
- `deltaFanRadius`: 1 (landward)
- `deltaMarshChance`: 0.35 (validate)
- `oxbowElevationMax`: lowland threshold (implementation‑defined)
- `fossilChannelHumidity`: +3..+8 (clamped)
- `fossilChannelStep`: 2 tiles between points
- `fossilChannelMinDistanceFromCurrentRivers`: 4 tiles
- `minDistanceFromStarts`: 8–10 (for deltas/oxbows)
- `fossilChannelBiomeTilt`: grassland in temperate, savanna/brush in warm dry if rainfall permits

Tagging and placement algorithm (post‑rivers)
- Deltas:
  - Identify “major” rivers (by length or flow proxy) and their mouths.
  - Tag `DELTA_FAN` around 1–2 mouths per large continent; convert a few landward tiles to marsh/floodplain if validation passes; optionally place 1‑tile offshore sandbar islands sparingly (lane‑safe).
- Oxbows:
  - Detect strong meanders in lowland segments; convert a very small set of tiles to 1‑tile lakes or marsh; tag `OXBOW`.
- Fossil channels:
  - For select dry basins and nearby ancient river provenance, draw short polylines toward the basin using `fossilChannelStep`; tag `FOSSIL_CHANNEL` points.
  - Do not place rivers; only apply subtle humidity/biome preferences later.

Integration points
- `refineRainfallEarthlike`:
  - `FOSSIL_CHANNEL`: apply small `fossilChannelHumidity` locally (clamped).
- `addDiverseFeatures`:
  - For `DELTA_FAN` tiles, allow higher chance for floodplain/marsh where rules permit; sandbar/reef nearshore only if validation passes.
- `designateEnhancedBiomes`:
  - Along `FOSSIL_CHANNEL`, allow grassland bias in temperate or savanna/brush in warm dry when rainfall allows.

Guardrails
- Keep counts tiny; avoid clustering near starts.
- No lane narrowing from sandbar micro‑islands.
- No river graph changes; this is purely cosmetic/low‑impact.

Diagnostics
- Logs: “Applying paleo‑hydrology (deltas/oxbows/fossils)…” with counts per motif.
- Optional overlays: mouths with `DELTA_FAN`, oxbow points, fossil polylines.

Acceptance
- Plausible deltas at a few major mouths; a couple of oxbows in long floodplains; faint fossil greens across deserts, not noisy or overpowering.


## 5) Motif: Glacial Fingerprints (Fjords, Kettle Lakes, Taiga Emphasis)

Narrative intent
- High latitudes and mountain‑adjacent lowlands show signs of past glaciation: fjordier coasts, scattered kettle lakes, and a taiga‑forward biome where moisture permits.

StoryTags
- `GLACIAL_COAST`, `GLACIAL_ZONE`, `KETTLE_CHAIN`

Signals to imprint
- Fjords: slightly increased probability of fjord‑like bays where mountains meet high‑latitude coasts.
- Kettle lakes: scattered 1‑tile lakes in glaciated lowlands near mountains.
- Biome: taiga preference over bare tundra when rainfall allows; tundra restraint remains intact.

Tunables (suggested defaults)
- `glacialLatitudeMin`: e.g., ≥ 60° absolute latitude
- `glacialCoastFjordBoost`: small increment to fjord/bay chance
- `kettleLakeCountMax`: 8–12 (map)
- `kettleLakeElevationMax`: lowland threshold
- `kettleLakeMountainProximity`: ≤ 4 tiles
- `taigaPreferenceMultiplier`: 1.15–1.25× chance where rainfall supports coniferous cover
- `minDistanceFromStarts`: 8–10 (for kettle lakes)

Tagging algorithm
- `GLACIAL_COAST`: mark coast tiles within `glacialLatitudeMin` and adjacent to mountains/hills.
- `GLACIAL_ZONE`: mark inland tiles at high latitude with cold climate and near elevation transitions.
- `KETTLE_CHAIN`: select scattered lowland pockets within `GLACIAL_ZONE` and near mountains, up to `kettleLakeCountMax`.

Integration points
- `addRuggedCoasts`:
  - Where `GLACIAL_COAST` is set, increase fjord probability modestly (sparse).
- Terrain conversion:
  - Create a small number of `KETTLE_CHAIN` 1‑tile lakes in valid pockets away from starts.
- `designateEnhancedBiomes`:
  - In `GLACIAL_ZONE`, bias toward taiga over bare tundra when rainfall permits (tundra restraint policy remains).
- `addDiverseFeatures`:
  - Optionally allow slightly higher conifer/taiga feature probability where biome and validation permit.

Guardrails
- Keep fjords sparse; avoid repeated deep cuts that create chokepoints.
- Kettle lakes must be scattered; do not form large clusters.
- Do not override tundra restraint; only reallocate tundra→taiga where justified by moisture.

Diagnostics
- Logs: “Marking glacial zones and fjords…” with counts of glacial coast tiles and kettle lakes.
- Optional overlays: `GLACIAL_COAST`, `GLACIAL_ZONE`, `KETTLE_CHAIN`.

Acceptance
- High‑latitude coasts read a bit fjordier; scattered kettles inland; conifer belts visible where plausible—without heavy biome upheaval.


## 6) Cross‑Cutting: Stacking, Diminishing Returns, Caps, and Size‑Scaling

- Size‑aware scaling (“thumb on the scale” by map size):
  - Prefer sqrt(area/baseArea) to scale radii/lengths/probabilities; use linear(area/baseArea) sparingly for global counts and always with hard caps.
  - Targets: longer hotspot trails, more continuous rifts, slightly higher passive‑shelf/fjord chances, broader rainforest belts, modestly larger clusters on Huge.
  - Guardrails: clamp after every scaled adjustment; never violate minimum sea‑lane width; rainfall always clamped to [0, 200].
- Stacking control:
  - If multiple StoryTags apply to the same tile, use either:
    - Cap: total rainfall delta ≤ +12 / −12 from StoryTags combined, or
    - Diminishing returns: apply 100% of the largest magnitude, then 50% of the next, 25% of the next, etc., and clamp.
- Caps per map/continent:
  - Add per‑motif hard caps already defined; also enforce global caps for intrusive edits (total lake conversions, total shelf conversions, total arc islands).
- Start safety:
  - For intrusive changes (new lakes, shelf widening, deltas), keep a minimum distance from start tiles.
- Lane safety:
  - Any change that converts water depth or places islands must check lane width and skip if risk detected.


## 7) Implementation Checklist (per motif)

- StoryTags:
  - Add minimal arrays/sets and toggles for `ACTIVE_MARGIN`, `PASSIVE_SHELF`, `VOLCANIC_ARC`, `OROGENY_BELT`, `WINDWARD_FLANK`, `LEE_FLANK`, `DELTA_FAN`, `OXBOW`, `FOSSIL_CHANNEL`, `GLACIAL_COAST`, `GLACIAL_ZONE`, `KETTLE_CHAIN`.
- Tagging:
  - Margins: segment classification per coastline; ensure min segment length and separation.
  - Orogeny: detect belts from mountain density; compute flanks by prevailing wind.
  - Paleo‑hydrology: detect river mouths/meanders; trace fossil polylines to basins.
  - Glacial: high‑latitude coastal and inland classification; select kettle pockets.
- Integration hooks:
  - Coast shaping (ruggedize), island seeding, rainfall refinement, biome/feature nudges, micro terrain conversions (lake tiles).
- Safeguards:
  - Sea‑lane checks, start distance checks, rainfall clamps, feature validation, stacking diminisher.
- Logging and dumps:
  - Per‑motif “BEGIN/END” logs with small summaries and seed references for reproducibility.
  - Optional debug overlays for StoryTags.
- Docs:
  - Update climate-story/README.md change log and add motif status once enabled.


## 8) Risks and Mitigations

- Sea‑lane narrowing:
  - Strict lane checks; keep shelf/arc adjustments sparse and ribbon‑limited.
- Over‑greening from stacked boosts:
  - Diminishing returns and hard clamp per tile.
- Visual clutter:
  - Favor long, clean segments; enforce min segment lengths and motif separation.
- Start fairness:
  - Min start distances for intrusive edits; tiny deltas/oxbows; conservative counts.
- Performance:
  - Keep all scans local (r ≤ 4); avoid global flood operations; early‑exit validations.


## 9) Definition of Done (per motif)

- Passes compile and integrate with no new diagnostics.
- Visual acceptance:
  - Margins: at least one clear active and passive segment on large continents; lanes intact.
  - Orogeny: visible windward/lee gradient along ≥ 1 long belt; rainfall histograms within tolerance.
  - Paleo: ≤ 4 deltas, ≤ 6 oxbows, ≤ 3 fossil channels; all placements validated; lanes intact.
  - Glacial: fjord bias present at high latitudes; 8–12 kettles scattered; taiga preference visible without tundra proliferation.
- Performance:
  - Generation time increase negligible; no radii > 4; no flood fills.
- Docs:
  - Tunables recorded; Climate Story README updated; change log entries added.


## 10) Default Tunables (consolidated suggestions)

- Margins:
  - `marginActiveFractionPerContinent`: 0.25
  - `marginPassiveFractionPerContinent`: 0.25
  - `marginMinSegmentLength`: 12
  - `marginShelfWideningRadius`: 1
  - `marginTrenchRibbonChance`: 0.02
  - `arcIslandsPerActiveSegmentMax`: 5
  - `reefChanceMultiplierPassive`: 1.2
- Orogeny:
  - `orogenyBeltMaxPerContinent`: 2
  - `orogenyBeltMinLength`: 30
  - `orogenyRadius`: 2
  - `windwardBoost`: +4
  - `leeDrynessAmplifier`: 1.15
- Paleo‑hydrology:
  - `maxDeltas`: 4
  - `maxOxbows`: 6
  - `maxFossilChannels`: 3
  - `deltaFanRadius`: 1
  - `deltaMarshChance`: 0.35
  - `fossilChannelHumidity`: +5
  - `fossilChannelStep`: 2
- Glacial:
  - `glacialLatitudeMin`: 60°
  - `glacialCoastFjordBoost`: small (implementation‑relative)
  - `kettleLakeCountMax`: 10
  - `kettleLakeElevationMax`: lowland threshold
  - `kettleLakeMountainProximity`: 4
  - `taigaPreferenceMultiplier`: 1.2

Change Log
- v0.1 (proposed): Roadmap with specifications, tunables, algorithms, guardrails, diagnostics, acceptance, and DoD for Margins, Orogeny, Paleo‑hydrology, and Glacial motifs.

— End of Roadmap: Additional Motifs —