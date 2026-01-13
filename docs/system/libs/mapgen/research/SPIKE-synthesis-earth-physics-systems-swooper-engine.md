# SPIKE: Synthesis — Earth Physics Systems × Swooper Engine

> **Status:** Research spike (seed / non-canonical)
>
> **Do not treat as contract truth.** This document proposes a synthesis pipeline and candidate product surfaces; it predates parts of the current SDK architecture and may contain outdated mechanics.
>
> **Canonical modeling references (preferred):**
> - `docs/system/libs/mapgen/architecture.md`
> - `docs/system/libs/mapgen/foundation.md`
> - `docs/system/libs/mapgen/morphology.md`
> - `docs/system/libs/mapgen/hydrology.md`
> - `docs/system/libs/mapgen/ecology.md`
> - `docs/system/libs/mapgen/narrative.md`
> - `docs/system/libs/mapgen/placement.md`
>
> **How to use this spike now:** use it as a “causal staging and product ideation” seed; salvage enduring causal claims into the canonical system docs rather than copying the proposed API/wiring patterns.

## Cohesive proposal: a causal, physics‑flavored MapGen pipeline that fits your Task‑Graph architecture

Your current draft architecture already has the *right* spine: a **Data‑Driven Task Graph** made of small, swappable `MapGenStep`s, executed in **strict sequential phases** (`setup → foundation → morphology → hydrology → ecology → placement`) with communication only through `MapGenContext` ("canvas fields" vs "artifacts"). What's missing is not a rewrite; it's **a consistent decomposition of the remaining domains into sub‑pipelines**, plus a few **artifact containers** that let the domains exchange physically meaningful fields without leaking implementation details. Your climate doc is already doing this for hydrology (global circulation → regional systems → orographic → routing).

Below is a full pipeline proposal that:

* **Keeps your phase contract intact** (so you don't blow up orchestration and legacy bridge work).
* **Adds missing scientific causality** by inserting the *minimal* new steps/artifacts to model: (a) geomorphic shaping, (b) ocean heat transport, (c) temperature (not just rainfall), and (d) albedo/cryosphere feedback.
* Respects your constraints: **small map sizes** (~4k–10k cells) and **1–3 snapshots** → prioritize *field/graph ops* (diffusion/advection/accumulation), not iterative high‑step simulations.

### The pipeline, top‑down (what it looks like in practice)

**Setup** creates a "clean room": validated config + seeded RNG + allocated typed arrays for the canvas fields + a mesh size contract (cell count, wrapping). It does *no worldmaking*, but it enforces fail‑fast invariants (no missing adapter; no missing dependencies).

**Foundation** creates the *causes* of geography: a relaxed Voronoi mesh, a crust mask (material + age), a plate partition, and boundary physics that produce uplift/volcanism/fracture potentials. Importantly, it can run in **multiple eras** to encode "geologic history" into `cumulativeUplift` and then interpret *old vs young relief* downstream.

**Morphology (Geomorphology)** converts "potential" to "shape": it transforms uplift + lithology into an elevation field via an **erosion cycle** (stream‑power incision + hillslope diffusion + sediment deposition) implemented as graph operations. This stage is where you reconcile "tectonic realism" with "playable topography." It also produces *sediment depth* and a *paleo drainage skeleton* that hydrology/resources can reuse.

**Hydrology phase becomes your combined fluid/energy system**, consistent with your climate doc's intent ("Wind, Moisture, Rainfall, Drainage"), but with two key additions:

1. **Oceanography as a sub‑pipeline** (currents + sea surface temperature + sea ice), because sea surface temperature (SST) controls evaporation and coastal moderation.
2. **Cryosphere/albedo as an integrated feedback pass**: temperature → snow/ice → albedo → temperature adjustment (1 iteration), enough to create believable ice margins and "ice age / greenhouse" tuning without a full coupled model.

**Ecology phase becomes the bridge to gameplay**, split internally into:

* **Pedology & geology heuristics**: `(parent material, climate, relief, time) → soil type/fertility`, then conditional probability fields → clustered resource basins.
* **Biome classification** (Whittaker/Holdridge‑style lookup), plus sub‑biome variation using drainage/soil and mild noise.

**Placement** is then straightforward: it consumes the *causal layers* to place starts/resources/features in a way that designers can reason about (and debug). The bridge (`MapOrchestrator`) remains the isolation boundary while you port legacy systems phase‑by‑phase.

---

## The architectural moves I'm making (trade‑offs + rationale)

### 1) Keep your phase taxonomy; add "missing domains" as sub‑pipelines inside phases

**Trade‑off:** We don't add new top‑level phases like `oceanography` or `cryosphere`.

**Rationale:** Your architecture explicitly treats phases as sequential integrity boundaries; changing them is a wide refactor with little payoff.

**What we do instead:** Oceanography + cryosphere live inside `hydrology` as steps, because your existing hydrology/climate stage already claims responsibility for "atmospheric and hydrological processes" and produces wind/moisture/rainfall/drainage.

**Alternative:** Add a new phase. Cleaner conceptually, but it forces changes to orchestration, recipes, and legacy bridging early. Do it only if you later need parallelization boundaries or long‑term maintenance benefits.

### 2) Expand artifacts aggressively; expand "canvas fields" conservatively

**Trade‑off:** More artifacts means more types + memory, but fewer cross‑step couplings and easier debugging/modding.

**Rationale:** Your blackboard split is *explicitly* designed for this: fields are "what the map looks like," artifacts are "the math behind the map."

**Concrete decision:** Keep core output fields (elevation/terrain/biomes/features/rainfall) as‑is for engine compatibility, but add artifact containers for crust, climate, ocean, morphology, soils/resources.

### 3) Use field‑based geomorphology (stream‑power + diffusion) instead of droplet erosion

**Trade‑off:** You lose some small‑scale "pretty" artifacts (braided micro‑channels), but gain predictability, speed, and controllable levers.

**Rationale:** The stream‑power incision model is exactly the right abstraction here; it captures the *result* of fluvial erosion with drainage area and slope.

**Bonus fit:** The research doc explicitly calls out analytic "jump to time" approaches for efficiency—perfect for your 1–3 snapshot constraint.

### 4) Oceanography: vector‑field construction + advection/diffusion, not Navier‑Stokes

**Trade‑off:** No mesoscale eddies, no detailed thermohaline cell simulation.

**Rationale:** You only need first‑order effects: gyres, western boundary currents, coastal upwelling analogs—enough to explain climate anomalies and provide gameplay hooks.

**Implementation direction:** The provided model (wind + gyre + coast tangent) is a clean graph‑friendly approximation.

### 5) Cryosphere/albedo is not a phase; it's a feedback *pass*

**Trade‑off:** No full dynamic glaciers.

**Rationale:** The missing‑link mechanism you want is **albedo‑temperature feedback**. Implementing that as one cheap iteration gives you ice margins and tipping behavior without a full coupled simulation.

**Glacial carving** becomes a slow erosion pass in morphology, consistent with the research doc's guidance.

### 6) Hydrology stays "light" but non‑fake: fill depressions + flow accumulation + threshold

**Trade‑off:** We postpone groundwater/aquifers beyond a simple soil‑moisture bucket.

**Rationale:** Your hydrology/climate doc already scopes hydrology refinement to basin filling → flow routing → river generation, with optional erosion. The research doc's hydrology abstraction gives a minimal, correct graph formulation (depression filling + steepest descent + flux accumulation).

---

## Required architecture reconciliation: update the Context "API" once, then stop touching it

Right now, your **architecture.md** context artifact list includes mesh/plateGraph/tectonics and riverGraph. But **foundation.md** clearly defines a `crust` artifact and treats it as foundational input for downstream reasoning. And **hydrology.md** explicitly proposes formalizing a `climate` artifact container.

So: do one deliberate "types expansion" now (core/types.ts), then build everything as steps. My proposed artifact containers:

* `artifacts.foundation`: `mesh`, `crust`, `plateGraph`, `tectonics`
* `artifacts.morphology`: `lithologyK`, `sedimentDepth`, `slope`, `flowDir`, `flowAccum`, `paleoRiverGraph?`
* `artifacts.ocean`: `basinId`, `currentVectors`, `sst`, `seaIceMask`
* `artifacts.climate`: `windVectors`, `moistureMap`, **`temperatureMap`**, `debugLog?`
* `artifacts.hydrology`: `riverGraph`, `lakeMask`, `wetnessIndex`
* `artifacts.pedology`: `soilType`, `soilFertility`, `resourceCandidates`
* `artifacts.ecology`: `vegetationDensity`, `biomeDebug?`

You can keep them as optional properties (like existing artifacts) so recipes can omit expensive layers.

---

# Layer‑by‑layer deep dive

## 0) Setup layer

Setup is where you enforce your "no spaghetti" contract: validated config, stable RNG seed, allocated arrays, and the invariant that *every step can assume array sizes and wrapping rules are correct.* Architecturally, this is exactly what your `MapGenContext` infrastructure section exists for, and it's where schema validation happens once at the boundary.

**Proposed steps**

* `setup.validate` — Validates `MapGenConfig` and recipe schema; hard‑fail on mismatch (you already want fail‑fast).
* `setup.allocateFields` — Allocates `fields.elevation/terrain/biomes/features/rainfall` typed arrays.
* `setup.initRng` — Seeds `context.rng`.

**Sanity checks (baseline invariants)**

* `cellCount == fields.*.length` (hard error, not warning)
* Wrapping rules consistent (e.g., if x wraps, neighbor queries must respect it)

**Gameplay impact**

None directly, but this is what gives you *deterministic regeneration* and reliable debugging.

| Setup summary     | |
| --- | --- |
| Inputs | Raw config + recipe, map dimensions, seed |
| Outputs | Allocated `context.fields.*`, seeded `context.rng` |
| Primary levers | Seed, map size / cellCount |
| Downstream impact | Guarantees deterministic, validated foundation for all phases |

---

## 1) Foundation layer

You already have the right shape: mesh → crust → plates → boundary physics. The two important integration points for the rest of the pipeline are:

1. **Crust must be promoted to a first‑class artifact** (it's required for lithology/erodibility and resources).
2. **Eras** are your time‑snapshot mechanism. You should lean on them to generate "old mountains" vs "young mountains" signals without running long simulations.

**Key responsibilities**

* Produce stable graph geometry (`RegionMesh`) and adjacency.
* Produce parent material and age: `CrustData.type/age`.
* Produce tectonic forcing fields: upliftPotential, riftPotential, volcanism, cumulativeUplift, etc.
* Support multi‑era accumulation.

**Proposed step mapping (fits your fractal "sub‑pipeline" model)**

* `foundation.mesh.voronoi` (Lloyd relaxation Voronoi).
* `foundation.crust.generate` (craton seeding + growth).
* `foundation.plates.partition.weightedFloodFill`
* `foundation.tectonics.resolve` (relative velocity + crust type lookup, hotspots, accumulate).

**Levers**

* Plate/crust topology levers are already well‑defined in your config cluster.
* Add (optional) "eraCount" and per‑era re‑partition toggles.

**Gameplay impact**

* Predictable mountain belts and volcanic arcs; rifts create long valleys and inland seas; transforms are earthquake corridors (can later influence hazards).
* Era accumulation gives a clean hook for: "old ranges = hills + coal; young ranges = mountains + geothermal."

| Foundation summary | |
| --- | --- |
| Inputs | `dimensions`, `rng`, `config.foundation.*` |
| Outputs | `artifacts.mesh`, `artifacts.crust`, `artifacts.plateGraph`, `artifacts.tectonics` |
| Primary levers | continentalRatio, cratonCount, plate counts, collision/volcanism scales, hotspotCount |
| Downstream impact | Drives elevation shape, volcanism features, rock age → resources/soil |

---

## 2) Morphology layer (Geomorphology)

This is the layer that will make your worlds stop looking like "uplift painted on a mesh" and start looking like landscapes with history. The research doc's staging is dead‑on: geomorphology should run after foundation (needs uplift + rock type) and before climate/hydrology (needs terrain shape). It also explicitly recommends a generalized paleo‑climate or a simplified coupled loop instead of full feedback.

### Responsibilities

* Convert `tectonics.*Potential` (+ era history) into a signed elevation field with realistic relief distribution.
* Sculpt with:
  * **Fluvial incision** via stream power (uses drainage area + slope).
  * **Hillslope diffusion** (thermal erosion) to relax slopes.
  * **Sediment transport/deposition** to create plains/deltas (fertility).
  * Optional **glacial carving pass** (if "ice age" temp bias).
* Output not just elevation, but also **sediment depth** and a **paleo drainage skeleton**.

### Proposed internal steps (as MapGenSteps)

**`morphology.uplift.integrate`**

Build an initial height field from tectonic forcings. The doc's canonical form is:

* `z_new = z_old + U * Δt`

In your engine, `U` can be derived from:

* `tectonics.cumulativeUplift` (multi‑era), plus upliftPotential/riftPotential shaping.

**`morphology.lithology.mapErodibility`**

Map `crust.type` and "bedrock hints" into a per‑cell **erodibility coefficient K**, enabling differential erosion. Pragmatic mapping that stays Earth‑like without exotic geology:

* volcanic/subduction arcs → "hard igneous" (low K)
* sedimentary basins (low relief + deposition) → "soft sedimentary" (high K)
* old cratons → very low K (resistant shields)

**`morphology.flow.route`** (shared primitive with hydrology)

Compute steepest‑descent flow direction + drainage area `A` via a DAG/topological traversal.

**`morphology.erosion.fluvial`**

Compute incision via stream power:

* `E = K * A^m * S^n`

Subtract from elevation.

**`morphology.erosion.hillslopeDiffuse`**

A Laplacian smoothing pass gated by a talus/angle‑of‑repose threshold (to avoid over‑smoothing).

**`morphology.sediment.deposit`**

Move detached sediment; deposit in low‑energy zones and coasts. This is your "fertile plains" generator.

**`morphology.volcanism.buildForms`**

Turn `tectonics.volcanism` into volcanic topography and substrate:

* island arcs at ocean‑ocean convergence, stratovolcano belts at ocean‑continent convergence.
* hotspots from foundation become shield volcano chains.

**`morphology.seaLevel.classify`**

Apply global sea level to elevation to produce land/ocean mask (`fields.terrain`). (You can either keep sea level as 0 datum or store it as config and threshold.)

### "Snapshot" fit (1–3 passes)

You do *not* want thousands of erosion iterations. The research doc explicitly points to analytic jump‑to‑time approaches as a performance trick. Practical use in your pipeline:

* Use 1 "big step" for fluvial incision (analytic or coarse iteration).
* 1–2 diffusion passes.
* 1 deposition pass.

Then you already have "old vs young" by modulating effective erosion time by crust age:

* Old crust → longer "effective duration" → hills/rounded ranges
* Young crust → shorter duration → sharp mountains

This matches your own foundation interpretation goals.

### Outputs

* `fields.elevation` (playable).
* `fields.terrain` land/ocean mask
* `artifacts.morphology.sedimentDepth` (critical for soils/fertility).
* `artifacts.morphology.flowDir/flowAccum` (reused by hydrology).
* Optionally `artifacts.morphology.paleoRiverGraph` to seed final rivers.

### Gameplay hooks (the "cool stuff" this enables)

* Old mountain belts become **strategic hill regions** (movement + defense) with coal; young belts become **high mountains** (chokepoints, snowline, geothermal).
* Deltas and sediment basins produce coherent "breadbasket" regions instead of random fertile tiles.
* Volcanic arcs create island chains with unique resources/soils.

| Morphology summary | |
| --- | --- |
| Inputs | `artifacts.mesh`, `artifacts.crust`, `artifacts.tectonics` |
| Outputs | `fields.elevation`, `fields.terrain`; `sedimentDepth`, `flowDir/flowAccum`, `paleoRiverGraph?` |
| Primary levers | erosion rate `K_avg`, "duration"/effective time, sea level |
| Downstream impact | Controls rain shadows, river topology, soil fertility, resource basins |

---

## 3) Hydrology layer (Oceanography + Climatology + Surface hydrology + Cryosphere/albedo)

Your climate doc defines the hydrology phase as the thing that turns elevation/landmasses into wind/moisture/rainfall/drainage. The research doc adds the missing piece: **oceanography must exist** to redistribute heat and set SST, and cryosphere/albedo is the "missing link" feedback loop.

### How this fits your current climate architecture

Your hydrology pipeline today is:

1. `hydrology.climate.circulation` (latitude bands / Hadley)
2. `hydrology.climate.regional` (swatches; monsoons/trades/continental)
3. `hydrology.climate.orographic` (wind + terrain → rain shadow)
4. `hydrology.refinement` (fill basins → route → rivers → optional erosion)

I would keep that *interface*, but insert oceanography + temperature + cryosphere in a way that remains compatible with those steps.

### Proposed sub‑pipeline (the minimal causal version)

**A) Initial climatology pass (winds + baseline temperature)**

You already want global circulation to establish moisture and temperature. The research doc gives the internal steps in the correct order: insolation → base temperature (lapse rate) → pressure/winds.

So: upgrade `hydrology.climate.circulation` to output:

* `climate.windVectors`
* `climate.temperatureMap` (new)
* a first‑pass `climate.moistureMap` (existing)

**B) Oceanography pass (currents + SST + sea ice)**

Oceanography wants to run after geomorphology (continents define basins) and iteratively with climate; the "ideal flow" is winds → currents → adjusted climate.

Implement as:

* `hydrology.ocean.basins` (flood fill / union-find).
* `hydrology.ocean.currents` using vector construction:
  * `CurrentVector = w1*Wind + w2*Gyre + w3*CoastTangent`
* `hydrology.ocean.sst` using advection‑diffusion on the graph.
* `hydrology.ocean.seaIce` thresholded from temperature/salinity knobs, feeding albedo.

**C) Advanced climatology pass (moisture advection + precipitation)**

Now use SST to drive evaporation and coastal moderation. The research doc explicitly notes SST is a hard dependency for climatology because it drives evaporation. Your existing steps map cleanly:

* `hydrology.climate.regional` continues to apply swatch systems (trade winds, monsoon, continental).
* `hydrology.climate.orographic` applies rain shadow via upwind elevation checks (already correct).

**D) Cryosphere/albedo feedback pass (integrated)**

Implement the missing link mechanism:

1. Temperature → snow/ice cover
2. Convert to albedo; adjust effective insolation
3. Recompute temperature (one iteration)

This is cheap and gives you the "tipping point" behavior knob (ice age / greenhouse).

**E) Hydrological refinement (light but real)**

Keep your current `hydrology.refinement` step, but treat it as a reusable primitive:

* depression filling
* steepest descent / flow direction
* flux accumulation (precip + upstream sum)
* threshold edges into rivers; lake detection from filled vs original height

### Artifacts and outputs (the API)

**Keep your existing ClimateArtifacts container** but extend it:

* Already defined: `windVectors`, `moistureMap`, `debugLog`
* Add: `temperatureMap` (Float32 or Int16 scaled), and optionally `precipitationFloat` (before quantization)

Then:

* Output `fields.rainfall` as quantized 0–255 as you already specify.
* Output `artifacts.riverGraph` as you already specify.
* Add `artifacts.ocean.{sst,currentVectors,seaIceMask}` based on oceanography outputs.

### Levers (designer‑visible knobs)

From your climate config:

* `moisture.globalModifier` + swatches + orographic uplift/shadow factors

From research:

* Primary: axial tilt, solar constant
* Primary: sea level, rotation direction (ocean gyres)
* Secondary: lapse rate, rain shadow intensity
* Secondary: ocean heat transport efficiency, salinity threshold (sea ice)

### Gameplay hooks (beyond typical Civ)

* **Sailing mechanics**: windVectors stored explicitly for sailing speed modifiers is already in your climate doc.
* **Naval currents**: current vectors affect ship movement and can create strategic "lanes" (Gulf Stream analog).
* **Sea ice**: blocks navigation and shapes polar strategy; also drives albedo.
* **Explainability**: the climate debugLog ("why is this desert here?") becomes a first‑class tool for designers *and players* (map tooltips, lore).
* **Ice age / greenhouse presets**: a single temp bias can flip ice extent due to the albedo feedback pass.

| Hydrology summary | |
| --- | --- |
| Inputs | `fields.elevation`, `fields.terrain`, `artifacts.mesh` |
| Outputs | `artifacts.climate` (winds/moisture/temp), `fields.rainfall`, `artifacts.riverGraph` |
| Primary levers | axial tilt, solar constant, sea level, moisture bias, rotation direction |
| Downstream impact | Biomes, soils/fertility, navigation systems, start placement, resource formation |

---

## 4) Ecology layer (Pedology + Resources + Biomes + Features)

Your architecture phase list already assigns ecology to "Biomes, features, resources." So the job here is to turn causal continuous fields (temp/rain/sediment/rock age) into discrete gameplay categories *without* losing the causal story.

### Pedology & geology heuristics (first half of ecology)

The research doc stages pedology after all physical layers and explicitly defines it as:

1. soil classification `(rock, temp, rain)`
2. resource scattering via rules (strategic + luxury)

It also anchors soil formation in CLORPT: `Soil = f(Climate, Organisms, Relief, Parent Material, Time)`. We can't model organisms/time in detail, but we can approximate with the layers you already have:

* **Parent material:** crust type/age + volcanism + sediment depth
* **Climate:** temperature/rainfall (annual mean/total)
* **Relief:** slope/roughness (from morphology)
* **Time:** crust age and "effective erosion duration" from morphology

**Step: `ecology.soil.classify`**

Map to a small soil enum + fertility scalar.

**Step: `ecology.resources.generate`**

Use conditional probability fields and then cluster with cellular automata smoothing (basins, not specks).

Concrete rules from the research doc you can directly implement:

* `P(Coal)` high in low elevation + high moisture + sedimentary context
* `P(Iron)` high in old igneous/metamorphic (cratonic shields)
* `P(Oil)` high on continental shelves or lowland basins

### Biomes (second half of ecology)

The ecology section provides the staging and abstraction clearly: Classify biomes from temperature + precipitation (Whittaker/Holdridge), then add sub‑biome variation (noise + drainage).

**Step: `ecology.biomes.classify`**

* Inputs: annual average temp + annual total precip.
* Outputs: biome ID + vegetation density.

If you want a meaningful upgrade over plain Whittaker without adding complexity, do Holdridge‑lite: use an "effective moisture" proxy (precip − potential evapotranspiration). The research doc explicitly calls Holdridge superior for distinguishing low‑rain hot deserts vs low‑rain cold tundra.

**Step: `ecology.features.place`**

Use biomes + soil/drainage to place forests, wetlands, reefs, etc into `fields.features`.

### Gameplay hooks

* **Strategic basins**: clustered coal/oil regions worth fighting over (not single‑tile noise).
* **Agriculture that makes sense**: fertility emerges from sediment plains + climate, not just random "grassland."
* **Dynamic seasons as visuals**: don't regenerate biomes every turn; use a shader snow layer driven by seasonal temperature amplitude.

| Ecology summary | |
| --- | --- |
| Inputs | Temp/rain (climate), sediment/slope (morphology), bedrock age/type (foundation) |
| Outputs | `fields.biomes`, `fields.features`, soil fertility, resource map |
| Primary levers | resource abundance, geologic age, wet/dry bias, temp bias |
| Downstream impact | City yields, tech pacing (resources), civ start biases, exploration incentives |

---

## 5) Placement layer

Placement is where "physics" cashes out into fairness and strategy. Your phase list explicitly reserves placement for "Civilizations, units." With the causal layers above, placement can become *explainable and tunable* instead of heuristics piled on heuristics.

**Responsibilities**

* Score candidate start tiles by:
  * Freshwater access (riverGraph + lakeMask)
  * Fertility (soilFertility + biome)
  * Coastal access + currents/winds (naval civs)
  * Proximity to strategic resources (with balance constraints)

**Trade‑off: realism vs fairness**

A purely causal world can "start screw" players. Your pedology doc explicitly anticipates a strategic balance bias parameter for resource spread. So placement should be allowed to violate pure geology *in controlled, logged ways*:

* "Guarantee iron within X tiles" as a post‑process that annotates the debug log.

**Gameplay hooks**

* Civ‑specific start biases become coherent: seafaring civs near favorable currents; desert civs near endorheic basins/oases; mountain civs near young orogens.
* World narratives: players can infer why starts are where they are ("river plain near rain shadow gap").

| Placement summary | |
| --- | --- |
| Inputs | biomes, features, riverGraph, soil fertility, resources, coast/ocean currents |
| Outputs | start positions, placed civ assets, final engine commit |
| Primary levers | fairness constraints, start distance, "guarantee resource" rules |
| Downstream impact | Player experience, strategic diversity, replayability |

---

# Concrete "pipeline recipe" shape (how you actually build it in your system)

Because your engine is recipe‑driven (steps + per‑step config), the pipeline is a *list of step IDs* bound to phases, and the executor validates `requires/provides`.

A default recipe would look conceptually like:

* setup:
  * validate, allocateFields, initRng
* foundation:
  * mesh.voronoi
  * crust.generate
  * plates.partition.weighted
  * tectonics.resolve
  * (optional) era rerun: plates.partition + tectonics.resolve to accumulate history
* morphology:
  * uplift.integrate
  * lithology.mapErodibility
  * flow.route
  * erosion.fluvial
  * erosion.hillslopeDiffuse
  * sediment.deposit
  * volcanism.buildForms
  * seaLevel.classify
* hydrology:
  * climate.circulation (winds + baseline temp + moisture)
  * ocean.basins
  * ocean.currents
  * ocean.sst
  * ocean.seaIce
  * climate.regional (swatches)
  * climate.orographic
  * cryosphere.albedoFeedback (optional but recommended)
  * refinement (route rivers, lakes)
* ecology:
  * soil.classify
  * resources.generate
  * biomes.classify
  * features.place
* placement:
  * starts.place
  * finalize.commit (adapter flush)

This remains perfectly compatible with:

* pipeline modding (insert erosion, reorder hydrology substeps)
* logic modding (register new step IDs)
* climate swatch extensibility via a WeatherSystemRegistry.

---

# What this enables in gameplay that "typical Civ" can't easily do

**1) Coherent regional "stories" that players can read**

* Deserts form because of orographic rain shadows, and you can show the wind vectors/debug log as an explanation.
* Europe‑warmer‑than‑Canada analogs become possible because SST and ocean heat transport exist.

**2) Navigation becomes a strategic layer**

* Winds already exist for sailing.
* Add currents and sea ice and suddenly polar routes / warm current lanes / chokepoints are emergent.

**3) "World presets" that actually behave like knobs**

* Sea level changes land/ocean ratio and basin connectivity ("Panama exists?"), affecting climate and exploration.
* Axial tilt changes seasonality patterns.
* A small temp bias can push ice extent across a threshold due to albedo feedback (ice age mode).

**4) Resources feel geologic, not random**

* Coal/oil/iron rules produce basins and shields you can fight over, clustered intentionally.

**5) Better designer tooling**

* Climate debug logs already envisioned ("why desert"). Extend the same pattern to: "why is this tile fertile?", "why is this coast cold?", "why did this lake become endorheic?" This is the difference between "procedural" and "authorable procedural."

---

# Missing systems check (what's still not fully covered, and how to slot it in cleanly)

### Already identified missing links, now explicitly integrated

* **Albedo feedback loop**: implement as a 1‑iteration pass in hydrology (temperature → ice → albedo → temperature).
* **Cryosphere modeling**: sea ice in oceanography; glacial carving as slow geomorphology pass.

### Additional "big levers" worth acknowledging (optional modules)

1. **Fire regime / disturbance ecology** — Not needed for base worldgen, but a great gameplay layer. Can be added as an ecology substep consuming vegetation density + dryness.

2. **Atmospheric aerosols / volcanism climate impact** — You already have volcanism fields. A very cheap extension is: high volcanism → regional cooling/dimming modifier (or fertility boost). It adds "Ring of Fire" personality.

3. **Teleconnections (ENSO‑like patterns)** — Your climate swatch system is a natural home for this (a mod can register "El Niño"). You don't need to simulate ENSO; you just need a controllable regional moisture anomaly generator.

4. **Biogeography (species dispersal / endemism)** — Probably overkill for Civ‑style gameplay, but if you ever want "Australia‑like" uniqueness, you'd add a very light "isolation index" from ocean barriers and climate stability.

---

# Sanity checks you should bake in (fast, brutal, and catch "this will break because…" early)

These are cheap to compute at ~10k nodes and save you from debugging "why is everything jungle."

**Global checks**

* **Water fraction**: computed from `terrain` must match config target within tolerance; else your sea level logic is wrong.
* **Hypsometry**: histogram of elevation should not be bimodal in absurd ways unless specifically configured (catch "everything is plateau" bugs).

**Climate checks**

* Rainfall should correlate with windward mountains and decouple on leeward side; if not, your orographic step's upwind neighbor sampling is wrong.
* SST gradient should generally decrease toward poles unless ocean heat transport is extreme (catch currents bugs).

**Hydrology checks**

* Every land node must drain to ocean or lake after depression filling (guarantee valid flow).
* River graph should have a heavy‑tail discharge distribution (few big rivers, many small).

**Ecology checks**

* Biomes should be explainable by temp/rain thresholds; if you see tundra at 25°C, your temp units or lookup table is wrong.

---

# Assumptions & uncertainty ledger (things I can't fully verify from the provided docs)

1. **Voronoi cell count vs final hex tiles** — Docs clearly use a Voronoi mesh as the core surface representation, but the mapping to your "hex tile" presentation layer isn't specified here. My proposal assumes "one mesh cell = one gameplay tile," or that the adapter handles resampling cleanly.

2. **Units / scaling for elevation and temperature** — `fields.elevation` is `Int16Array` but the unit scale (meters? decameters?) isn't defined in these docs. The morphology and climate formulas assume meters/°C; you'll want an explicit scaling constant and conversion utilities.

3. **Terrain encoding** — `fields.terrain` is `Uint8Array` but the enum values aren't included. I'm assuming at least land/water mask exists; if terrain already encodes more (coast, deep ocean, etc.), oceanography can consume it directly.

4. **Bathymetry availability** — Oceanography benefits from bathymetry as a hard dependency if you want shelf resources or deep‑water formation. Your current pipeline doesn't expose bathymetry explicitly; you can either (a) store negative elevations for oceans or (b) add a separate bathymetry artifact.

---

If you want, I can also produce:

* A concrete `MapGenContext` type diff (what to add where),
* A "default recipe JSON" draft with step IDs,
* And a dependency graph (`requires/provides`) that the Pipeline Executor can validate (including the new artifact containers).
