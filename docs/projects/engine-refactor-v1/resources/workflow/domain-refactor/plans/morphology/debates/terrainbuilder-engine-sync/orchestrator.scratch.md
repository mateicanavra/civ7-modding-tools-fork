# Orchestrator Scratchpad — Engine-Derived Elevation/Cliffs vs Physics Truth (Lock Candidate)

## Status / intent

This is a working scratchpad to consolidate the concrete posture and examples for the TerrainBuilder “engine sync” derisk decision, to be integrated with Agent B2’s findings before we lock updates across in-scope docs.

---

## Verbatim capture (from orchestrator message to user)

You’re right to push here. If we “just say Physics doesn’t read engine elevation/cliffs” without also saying **where cliff/elevation-dependent decisions move to**, we *would* be implicitly accepting a mismatch bug class.

### 1) Are we accepting “two sources of truth” that can diverge?
There are unavoidably **two representations** of “height/relief” in the system because Civ7 does **not** let us set elevation/cliffs directly:
- Physics has its own elevation (our truth artifacts).
- Civ7 engine produces **derived** elevation/cliffs via `TerrainBuilder.buildElevation()` and exposes them via `GameplayMap.getElevation()` / `GameplayMap.isCliffCrossing()`.

The key is: that’s only a “two truths” problem **if we treat them as truth for the same decision**.

So the rule has to be explicit:

- **Physics truth is the source of truth for physics computations.**
- **Engine-derived elevation/cliffs are the source of truth for any decision that must match the actual shipped map’s cliffs/elevation bands.**

If we follow that, your cliff/plateau example does *not* become “outcome is fucked”, because the decision that cares about cliffs does not run off Physics’ idea of cliffs.

### 2) Your concrete example (“plateau → paint plains, but engine cliff differs”)
That decision is *map-facing*. If it depends on cliffs (even implicitly), it must be **Gameplay/map logic after elevation is built**, and it must use engine cliffs.

Concretely, the rule becomes something like:
- Physics computes `plateauScoreByTile` (or other physics signals).
- Gameplay, after `effect:map.elevationPlotted`, decides terrain painting using:
  - Physics signals (plateauScore),
  - **and** engine-derived `isCliffCrossing` / `getElevation` (because that’s what will actually exist for the player).

If instead you keep “cliff” inside Physics and use it to pick terrain types/biomes, then yes: you can get exactly the mismatch you described. That’s precisely what we must forbid by *decision ownership*, not by vibes.

### 3) Why avoid reading engine for this in Physics?
Not dogma. It’s because **engine-derived elevation/cliffs depend on prior stamping**, and we cannot control them directly. If Physics reads them and uses them to produce more “truth”, then:
- Physics becomes coupled to engine postprocess ordering and engine fixups.
- You get silent backfeeding (today’s `syncHeightfield()` issue), and you can literally overwrite/discard physics work.
- You lose a stable, deterministic, engine-agnostic physics model (and you still can’t “close the loop” by pushing corrected elevation back).

Engine reads are fine and necessary — **in Gameplay/map steps**, where the goal is “make the shipped map correct” and where using the engine’s derived cliffs is exactly correct.

### 4) What this looks like, concretely (one coherent path)
A safe concrete pattern (no `map.realized.*`, no shims) is:

1) Physics/Morphology produces truth:
- `artifact:morphology.topography.elevation`
- `artifact:morphology.topography.landMask`
- optional physics signals (slope/roughness/plateauScore) as morphology outputs if useful.

2) Gameplay projects + stamps terrain types from physics truth:
- publish `artifact:map.terrain` (tile terrain IDs/types to stamp)
- run `plot-terrain` (adapter writes)
- assert `effect:map.terrainPlotted`

3) Gameplay runs Civ7 derived elevation:
- run `plot-elevation`: `TerrainBuilder.buildElevation()` (+ required `AreaBuilder.recalculateAreas()` ordering)
- assert `effect:map.elevationPlotted`
- optionally publish observability layers for later use: `artifact:map.elevation`, `artifact:map.cliffs` (derived by reading engine after the effect)

4) Any rule that depends on elevation bands/cliffs runs now (Gameplay):
- `plot-hills` (vanilla does this: it reads `getElevation` + checks `isCliffCrossing`)
- biome tweaks, etc.

Physics never tries to “decide cliffs” as part of truth. It can compute cliff-*likeness* for erosion/landforms; but if a later step needs “where are the actual Civ7 cliffs”, that’s Gameplay and it reads the engine.

---

## Lock candidate (maximal, explicit posture)

### Core invariants

1) **Two representations exist; only one is valid per decision**
- Physics truth elevation is authoritative for physics simulation/analysis.
- Engine-derived elevation/cliffs are authoritative for any decision that must match the shipped Civ7 map’s movement/pathing/cliff layout and elevation bands.
- Therefore: a decision may not simultaneously treat both as “the truth” for the same semantic predicate.

2) **No “Civ7 cliff truth” inside Physics**
- Physics may compute slope/roughness/relief/escarpment-likelihood signals.
- Physics must not publish an artifact described as “cliffs” in the Civ7 sense.
- Any policy that needs actual Civ7 cliffs must run after `buildElevation` and read `GameplayMap.isCliffCrossing`.

3) **Gameplay/map steps may combine Physics signals + engine reality**
- This is not optional: any plot/stamp policy that needs both “why” (physics causes) and “what actually exists in-engine now” must combine both inputs.
- This is the canonical, cornerstone model: **Physics supplies best-available causes and continuous signals; engine supplies derived discrete constraints; Gameplay policies reconcile them into final stamping.**

4) **Physics should publish complementary signals needed for good plotting**
- If Gameplay has to make a projection decision and a useful physics corollary exists, we publish it (deterministically, as a Physics truth artifact) so Gameplay does not operate blind.
- Example signals (illustrative, not exhaustive): `slope`, `roughness`, `localRelief`, `plateauScore`, `ridgeScore`, `volcanicPotential`, `erodibility`, `orographicLiftProxy`.

### Example (the user’s plateau/cliff mismatch)

Goal: “Plateaus should be painted as plains; cliffs should not be painted as plains if they create impassable seams.”

Correct ownership split:
- Physics (Morphology) publishes:
  - `artifact:morphology.topography.elevation` (truth)
  - `artifact:morphology.signals.plateauScoreByTile` (truth signal)
  - `artifact:morphology.signals.slopeByTile` (truth signal)
- Gameplay/map:
  - `plot-terrain` uses Physics signals to create an intent (e.g., `artifact:map.terrain`).
  - `plot-elevation` runs `buildElevation` and asserts `effect:map.elevationPlotted`.
  - `plot-plateau-terrain-tweaks` runs after `effect:map.elevationPlotted` and reads:
    - Physics: plateau/slope signals,
    - Engine: `isCliffCrossing` / `getElevation`,
    then adjusts final terrain decisions *as a gameplay policy* to avoid cliff-adjacent inconsistencies.

Important: nothing here requires “syncing engine cliffs into Physics.” The policy that cares about cliffs is placed where cliffs exist.

### “map.<thing>Plotted” naming flexibility (lock candidate)

We should treat the effect namespace as:
- `effect:map.<thing><Verb>` where `<Verb>` uses existing convention (short, not versioned; no wordy names).
- `...Plotted` is the default; other verbs allowed when semantics are clearer.

Examples:
- `effect:map.terrainPlotted`
- `effect:map.elevationPlotted`
- `effect:map.riversPlotted`
- `effect:map.biomesPlotted`
- `effect:map.featuresPlotted`

### Implication: Gameplay domain setup is required (Phase 3 structural prerequisite)

We are not taking on “all Gameplay,” but we must create a stable home for:
- projection/stamping policies (rules/strategies),
- their operation boundaries (so they are testable and reusable),
- and their step wiring.

Key clarification (to prevent the “we moved physics into gameplay” confusion):
- Physics decides *physical causes and continuous fields* (“where uplift happens”, “where volcanism potential is high”, “topography elevation field”).
- Gameplay decides *representation and game-facing discretization* (“which tiles become mountain terrain”, “where cliffs/hills are considered for movement”, “final terrain typing adjustments based on engine cliff adjacency”).

This mirrors the narrative/placement absorption: “nudge it right” decisions belong in Gameplay policies, not in Physics inputs.

---

## Next integration steps (after Agent B2)

1) Confirm the minimal set of engine-derived surfaces that are used downstream in base-standard scripts and must be modeled as postprocess-aware Gameplay decisions (elevation/cliffs at minimum).
2) Turn the above into final “locked rules” in the in-scope docs (Phase 2 stamping spec + Phase 3 plan + shared modeling guidelines if needed).
3) Add an explicit Phase 3 requirement: migrate cliff/elevation-band-dependent rules out of Physics into Gameplay plot steps; ensure Physics publishes the needed complementary signals to keep decisions high-quality and deterministic.

