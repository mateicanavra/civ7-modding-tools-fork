# Earth Physics Systems Modeling - Outline

## Narrative Approach: "Causal Vertical Slices"

Hybrid structure:
- **Pipeline walkthrough spine** (Geomorphology → Oceanography → Climatology → Hydrology → Pedology/Geology → Ecology).
- For each stage, a **consistent vertical slice**: Inputs → Real physics causes → Game abstraction → Technical module/fields/tasks → Outputs & downstream consumers → Design affordances.
- Interleave lightweight architecture reminders so viewers see how causal chains become dataflow in the task graph.

---

## Slide 1: Why Physics‑Based Worlds?
**Purpose**: Motivate causal realism and set expectations for the pipeline.

**Content**:
- Contrast noise‑painted maps vs. physics‑caused maps.
- “Causal realism” goal: believable, debuggable, tunable worlds under game budgets.
- Preview the 6‑stage pipeline and the vertical‑slice pattern.

**Block type**: `explainer` + `diagram` (pipeline overview)

---

## Slide 2: Architecture Primer — Task Graph + Voronoi Fields
**Purpose**: Establish the technical substrate that all stages plug into.

**Content**:
- Data‑Driven Task Graph: stages as nodes with explicit requires/provides.
- Spherical Voronoi mesh: cells hold scalar/vector fields; dual graph for flows.
- Reusable operators: diffusion, advection, flow routing, lookup tables.
- Principle: “Physics before narrative,” feed‑forward core with optional loops.

**Block type**: `explanation` + `diagram` + small `codeBlock` (pseudo stage contract)

---

## Slide 3: Stage 1 — Geomorphology (Land Shape)
**Purpose**: Vertical slice of terrain sculpting: uplift vs erosion.

**Content (vertical slice)**:
1. **Inputs**: Voronoi topology; tectonic uplift map; crust/lithology IDs; initial height field.
2. **Real‑world physics**: endogenic uplift vs exogenic denudation; fluvial SPIM; hillslope diffusion; glacial carving; sediment conservation; differential erosion by rock hardness.
3. **Game abstraction**: Eulerian height/sediment fields; stream‑power law on graph; Laplacian smoothing; optional analytic time‑jump; no droplet sims or CFD.
4. **Technical architecture**: `GeomorphologyStage` tasks: flow routing → area A; incision E=K*A^m*S^n; thermal diffusion; sediment transport/deposition; writes height + sediment arrays.
5. **Outputs / downstream**: final elevation; sediment depth; paleo‑drainage; feeds ocean mask, climate orography, hydrology, soils.
6. **Affordances**: knobs for erosion rate/duration, talus angle, sediment capacity; guarantees plausible mountain chains, valleys, basins.

**Block type**: `explanation` + `codeBlock` (erosion pseudo)

---

## Slide 4: Stage 2 — Oceanography (Heat Engine)
**Purpose**: Vertical slice of ocean circulation and SST.

**Content (vertical slice)**:
1. **Inputs**: land/ocean mask + bathymetry from geomorphology; initial wind field; sea level/rotation params.
2. **Real‑world physics**: wind‑driven gyres; Coriolis deflection; western/eastern boundary currents; thermohaline conveyor; sea‑ice/albedo coupling.
3. **Game abstraction**: procedural gyre centers; blended current vectors; graph advection‑diffusion of heat; no Navier‑Stokes or full density stratification.
4. **Technical architecture**: basin flood‑fill; wind‑stress mapping; construct `CurrentVector = w1*Wind + w2*Gyre + w3*CoastTangent`; advect SST field.
5. **Outputs / downstream**: sea‑surface temperature; current vectors; sea‑ice extent; consumed by climatology (evaporation, moderation) and naval gameplay.
6. **Affordances**: knobs for sea level, rotation direction, heat‑transport efficiency; enables warm‑current coasts, frozen seas, predictable sailing routes.

**Block type**: `explanation` + `diagram`

---

## Slide 5: Stage 3 — Climatology (Atmosphere)
**Purpose**: Vertical slice of winds, temperature, and rainfall.

**Content (vertical slice)**:
1. **Inputs**: heightmap + orography; ocean mask; SST; axial tilt & solar constant; sea‑ice/albedo if present.
2. **Real‑world physics**: insolation gradients; three‑cell circulation; Coriolis winds; lapse‑rate cooling; orographic lift → rain shadows.
3. **Game abstraction**: zonal wind bands; moisture “bucket” scalar advection; precipitation on lift; temperature diffusion; no full atmospheric CFD.
4. **Technical architecture**: compute insolation/latitude temps; generate wind vectors; walk moisture packets downwind, extracting rain on upslope; write temp/rain fields.
5. **Outputs / downstream**: air temperature (mean/seasonality), precipitation map, wind field; consumed by hydrology, soils, ecology; affects sailing/fallout.
6. **Affordances**: knobs for axial tilt, lapse rate, rain‑shadow intensity; yields causal deserts, jungles, monsoons, snowlines.

**Block type**: `explanation` + `codeBlock` (moisture bucket pseudo)

---

## Slide 6: Stage 4 — Hydrology (Surface Water)
**Purpose**: Vertical slice of rivers, lakes, and freshwater.

**Content (vertical slice)**:
1. **Inputs**: precipitation map; elevation + sea level; optional soil infiltration.
2. **Real‑world physics**: watersheds/drainage basins; runoff accumulation; lake spillover vs endorheic evaporation; groundwater buffering.
3. **Game abstraction**: depression filling; steepest‑descent flow DAG; flux accumulation; simple soil‑moisture bucket; no full hydraulic routing.
4. **Technical architecture**: Planchon‑Darboux fill; flow direction per node; topological accumulation; classify rivers by threshold; detect lakes from fill delta.
5. **Outputs / downstream**: river segments + discharge; lake bodies; freshwater availability; feeds soils/biomes and city placement.
6. **Affordances**: knobs for river threshold, sea level, endorheic probability; enables deltas, inland seas, fertile corridors.

**Block type**: `explanation` + `codeBlock`

---

## Slide 7: Stage 5 — Pedology & Geology (Soils + Resources)
**Purpose**: Vertical slice from physical history to economic layer.

**Content (vertical slice)**:
1. **Inputs**: bedrock type; temp/rain; hydrology moisture/flux; elevation.
2. **Real‑world physics**: CLORPT soil formation; laterite vs chernozem; resource genesis (coal swamps, oil basins, iron formations).
3. **Game abstraction**: soil lookup (rock,temp,rain→soil); conditional probability fields for resources; CA clustering; no deep‑time sim.
4. **Technical architecture**: compute soil/fertility scalars; scatter resources with logical rules + smoothing; output resource clusters.
5. **Outputs / downstream**: soil fertility field; strategic/luxury resource map; consumed by yields, AI, and biome dressing.
6. **Affordances**: knobs for resource abundance, geological age, strategic balance bias; guarantees resources align with world history.

**Block type**: `explanation`

---

## Slide 8: Stage 6 — Ecology (Biomes)
**Purpose**: Vertical slice turning climate into visible biomes.

**Content (vertical slice)**:
1. **Inputs**: temperature; precipitation; soil moisture/fertility; elevation.
2. **Real‑world physics**: Whittaker / Holdridge life zones; evapotranspiration; ecotones; seasonality.
3. **Game abstraction**: 2D lookup to biome IDs; local noise for sub‑biomes; shader‑based seasons; no dynamic veg sim.
4. **Technical architecture**: classify each cell by temp/rain; compute vegetation density and biome edges.
5. **Outputs / downstream**: biome ID + vegetation density; feeds rendering, feature placement, resources.
6. **Affordances**: knobs for wet/dry bias, temp bias, boundary sharpness; biomes remain explainable by climate causes.

**Block type**: `explanation`

---

## Slide 9: Integration & Missing Links (Feedback Loops)
**Purpose**: Show how to close the loop for “living worlds.”

**Content**:
- Albedo‑temperature feedback: ice extent ↔ albedo ↔ temperature tipping points.
- Cryosphere: glacier accumulation/flow + carving as slow erosion pass.
- Task‑graph impact: add iterative loop stages with convergence guardrails.
- New fields: ice cover, albedo, modified temps/heights.

**Block type**: `explanation` + `diagram`

---

## Slide 10: Design Levers & Emergent Guarantees
**Purpose**: Synthesize what designers gain at each stage.

**Content**:
- Table mapping stage → key levers → player‑visible outcomes.
- Emphasize predictability: tweak levers → consistent causal shifts.

**Block type**: `explanation` + `table`

---

## Slide 11: Takeaways / Next Steps
**Purpose**: Land the story and point to implementation roadmap.

**Content**:
- Re‑state causal chain: physics → abstractions → fields/tasks → gameplay features.
- Highlight modularity, debuggability, extensibility.
- Next steps: implement feedback loop, tune levers, add diagnostics.

**Block type**: `explainer`

