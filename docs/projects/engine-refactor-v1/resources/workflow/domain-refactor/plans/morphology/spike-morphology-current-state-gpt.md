# Morphology Domain Refactor — Phase 1 Current-State Spike

> **HISTORICAL SPIKE / NOT CANONICAL**
> This is Phase 1 current-state inventory. Canonical Phase 2 spec surfaces live in `plans/morphology/spec/` and win on conflict.

Purpose: Document the current state of the Morphology domain in Civ7 MapGen, based strictly on existing code and behavior. This serves to ground the Morphology refactor (Phase 2 modeling and Phase 3 planning) in reality – exposing how Morphology is wired today, what it consumes and produces, and where legacy or cross-domain couplings exist. No redesigns are proposed here; this is a factual snapshot of Morphology as-is.

## References:

- Workflow reference (domain refactor): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Phase 0.5 (Morphology greenfield sketch): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield-gpt.md`
- Phase 1 template: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-1-current-state.md` (structure guidelines)
- Morphology context packet: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-CONTEXT.md`
- Phase 0.5 spike (greenfield): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield-gpt.md`

## Scope guardrails:

- Current-state only. No target design or Phase 2 modeling is included – all content is evidence from the current code.
- Evidence-based. Every claim (step behavior, dependencies, artifacts, etc.) is backed by code references. No speculation or future-state design.
- Legacy posture. Assume any narrative/story overlay integration or engine workarounds are legacy to be removed unless explicitly part of new contracts. Highlight them, but do not propose solutions here.
- Greenfield deltas. Note where the Phase 0.5 ideal vision conflicts with the current state (e.g. unwanted dependencies, hidden constants), without resolving them – just flagging for Phase 2/3.

## Authority stack (code sources for Phase 1)

### Canonical code sources (current truth):

- Recipe and stages: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` – defines stage order and domain ops wiring (which Morphology currently lacks). The recipe includes all Morphology stages in order. Each stage’s module in .../stages/morphology-{pre|mid|post}/ defines its steps and artifacts.
- Morphology domain code: `mods/mod-swooper-maps/src/domain/morphology/**` – includes the domain definition and all Morphology operation (op) implementations and contracts (in ops/ subdirectory). This is where Morphology’s core logic resides (landmass generation, coast shaping, mountain placement, etc.).
- Domain config schemas: `mods/mod-swooper-maps/src/domain/morphology/config.ts` (plus sub-configs like landmass/config.ts) – defines author-facing configuration keys for Morphology (e.g. oceanSeparation, coastlines, etc.).
- Cross-domain artifacts: Upstream artifacts produced by Foundation (e.g. tectonic plates data) and Narrative-Pre (story overlays) that Morphology consumes; downstream artifacts Morphology produces for Hydrology and Placement. These are defined in the respective stages’ artifacts.ts files (e.g. foundation/artifacts.ts, narrative-pre/artifacts.ts, etc.).
- Engine adapter interactions: Morphology steps often call engine-provided methods via `context.adapter` (e.g. terrain validation, fractal generation). These indicate where Morphology defers to engine logic.
- Standard runtime state: The pipeline maintains some state outside explicit artifacts (e.g. StandardRuntime continent bounds). Morphology steps writing to or reading from this runtime state are noted as hidden couplings.

### Supporting references (context, not authoritative):

- Morphology context doc: High-level intended domain boundaries and pitfalls (e.g. “Morphology owns shape of world; narrative overlays are forbidden”). Used here to flag current vs intended differences (Greenfield deltas).
- Legacy design docs: e.g. `docs/system/libs/mapgen/morphology.md` (original domain meaning) and ADRs like adr-001-era-tagged-morphology.md. These provide background but may conflict with current code – they are not the source of truth for implementation.
- Prior planning notes: LOCAL-TBD-morphology-vertical-domain-refactor.md (archived) for any hints of known issues. Only used to corroborate evidence from code (e.g. confirming that Morphology ops were historically excluded from recipe ops compilation).

## Domain surface inventory (external view of Morphology)

This section enumerates the public-facing surface of the Morphology domain – modules and exports that other parts of the pipeline can or do rely on. It shows how Morphology is represented as a domain and what implementation hooks are exposed.

### A) Domain entry point and ops contracts

Domain definition: @mapgen/domain/morphology → `mods/mod-swooper-maps/src/domain/morphology/index.ts` – registers the Morphology domain with id "morphology". This uses defineDomain({ id: "morphology", ops }), pointing to ops imported from ./ops/contracts.js.

Ops contract surface: `mods/mod-swooper-maps/src/domain/morphology/ops/contracts.ts` – defines the contract objects for each Morphology operation (function). Currently, all expected ops are listed but many have empty implementations or are not fully utilized by steps. For example, contracts exist for computeBaseTopography, computeLandmask, computeSubstrate, computeLandmasses, etc.. However, until recently, the recipe did not compile Morphology ops into the pipeline, meaning steps couldn’t call ops.* functions unless they imported implementations directly. (This is a key legacy gap: Morphology wasn’t truly “contract-first” – see Boundary Violations). Some steps have started using these ops via the contract mapping (e.g. landmass-plates uses morphology.ops.computeSubstrate etc. via its contract), but historically Morphology logic often bypassed the ops abstraction.

Domain ops implementations: For each contract, there is an implementation under src/domain/morphology/ops/<operation>/index.ts. For instance, compute-substrate/index.ts, compute-base-topography/index.ts, etc. These contain the actual logic for those operations. In current state, some steps call these via the ops injection, while others still invoke older module functions (see below). The domain router (`mods/mod-swooper-maps/src/domain/morphology/ops.ts`) ties together contracts with implementations using createDomain(domain, implementations) – but since ops weren’t fully wired in recipe, this router wasn’t effectively used in runtime.

### B) Key Morphology modules and exports (implementation functions)

Outside the ops system, Morphology has several modules representing sub-domains of terrain generation. Steps historically imported functions from these modules directly (pre-refactor style). The notable modules and their functions used are:

Landmass generation: `mods/mod-swooper-maps/src/domain/morphology/landmass/index.ts` – provides functions to create initial continents from tectonic plate data. Exports used by steps include createPlateDrivenLandmasses, applyLandmassPostAdjustments, and applyPlateAwareOceanSeparation. These functions ingest the Foundation plates output and produce a base land elevation and land/ocean mask. Current usage: The landmass-plates step effectively achieves this via ops calls, but under the hood those ops likely use these functions. (Previously, steps might import them directly; now computeLandmasses op encapsulates similar logic.)

Coastline shaping: `mods/mod-swooper-maps/src/domain/morphology/coastlines/index.ts` – includes logic for refining coastlines. The primary export in use is addRuggedCoasts, which applies perturbations to coasts (carving sea lanes, adding coastal detail). In current pipeline, the rugged-coasts step performs this via the computeCoastlineMetrics op and some in-step logic, rather than calling addRuggedCoasts directly – but the op is effectively a wrapper for similar functionality. There is also a coastline corridor policy helper in coastlines/corridor-policy.ts (with exports like resolveSeaCorridorPolicy) used internally to decide how to treat narrow seas between landmasses (legacy policy constant).

Islands addition: `mods/mod-swooper-maps/src/domain/morphology/islands/index.ts` – defines how and where to add island chains. Export used: `addIslandChains`, which places clusters of small landmasses, often in gaps or along certain latitudes. The islands step in Morphology Post uses this functionality (via the planIslandChains op contract). It also relies on inputs like the narrative “hotspots” overlay to decide island placement (current state coupling).

Mountain ranges: `mods/mod-swooper-maps/src/domain/morphology/mountains/index.ts` – handles placement of mountain ranges and highlands. Export used: `layerAddMountainsPhysics`, which likely raises terrain for mountains based on plate collision zones (and possibly narrative orogeny hints). The mountains step uses this logic (via planRidgesAndFoothills op or direct import historically). There is also a mountains/scoring.ts module with internal constants/heuristics for mountain placement (e.g. thresholds for mountain height or cluster scoring), which even imports foundation constants like BOUNDARY_TYPE (coupling).

Volcanoes: `mods/mod-swooper-maps/src/domain/morphology/volcanoes/index.ts` – places volcanoes (often at plate boundaries or hotspots). Export used: `layerAddVolcanoesPlateAware`, which adds volcanic terrain features informed by plate rift zones. The volcanoes step invokes this (via planVolcanoes op). Similar to mountains, a volcanoes/scoring.ts contains rules for how volcano sites are chosen, also importing BOUNDARY_TYPE constants (legacy coupling to Foundation).

Observation: The above modules represent “subdomains” within Morphology (landmass shaping, coastlines, islands, mountains, volcanoes). In the current code, they exist as implementation details. Many of their functions are called in the steps either directly (old approach) or via the new op contracts. The presence of direct imports in steps (bypassing ops) is a legacy artifact we highlight later. For now, these modules indicate what Morphology is responsible for: generating the world’s physical shape (continents, coasts, ranges, islands, etc.).

### C) Stage-owned artifacts (Morphology outputs)

Morphology publishes several artifacts (data outputs) through its recipe stages. These artifacts serve as contracts between stages (e.g. passed to later steps or other domains). All Morphology artifacts are defined in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (notably, there are no separate artifact files under mid/ or post/, so the pre stage file collects all Morphology artifact definitions):

`artifact:morphology.topography` – the main topography buffer (object with elevation (Int16), terrain (Uint8), landMask (Uint8) arrays for every tile). This is a publish-once mutable buffer that represents the base heightfield and land/water layout. Morphology Pre’s landmass-plates step publishes this artifact initially, and subsequent steps (even in later stages) mutate the underlying ctx.buffers.heightfield in-place (e.g. carving coasts, adding terrain) without re-publishing. Downstream, other domains (Hydrology, Ecology, etc.) use the heightfield via their own artifact or directly.

`artifact:morphology.substrate` – a buffer with substrate properties per tile (erodibilityK, sedimentDepth, Float32 arrays), published by landmass-plates. This represents the geological substrate (how easily land erodes, how much sediment exists). Like topography, it’s a buffer updated in-place later (e.g. the Geomorphology step will adjust sediment depth).

`artifact:morphology.coastlinesExpanded` – a marker artifact (empty object schema) indicating that engine coast expansion has been applied. Published by the coastlines step in Morphology Pre. This artifact has no data; it serves as a flag that coastlines were processed by the engine’s expansion algorithm (which fills in shallow water along coasts). Essentially a legacy effect placeholder (used for ordering or validation).

`artifact:morphology.routing` – a buffer for hydrological routing info (flowDir, flowAccum, and optional basinId per tile). The Morphology Mid routing step computes and publishes this. It encodes, for each tile, the index of the downstream tile (steepest descent) and accumulated flow, effectively delineating drainage basins. Currently, this is computed in Morphology (likely as a preliminary step for erosion or for future use), but Hydrology also performs its own river routing later – leading to potential redundancy.

`artifact:morphology.coastlineMetrics` – a snapshot of coastline adjacency info (coastalLand and coastalWater masks, each Uint8 per tile). Published by the rugged-coasts step in Morphology Mid. It marks which land tiles are adjacent to water and vice versa after all coastline adjustments. This appears to be used for debugging or potential downstream logic (e.g. ecology might use coastal proximity), but in current state no other step explicitly requires it (it’s a candidate for removal if truly unused).

`artifact:morphology.landmasses` – a composite artifact produced at the end of Morphology Post, containing a list of landmass components and a mapping of tiles to landmass ID. The landmasses step computes connected land components from the final landMask and publishes this artifact. Each landmass entry has an id, tileCount, and bounding box. This artifact is consumed by the Placement domain for gameplay purposes (e.g. ensuring each civilization start is on a separate landmass). It replaces the old practice of using runtime continent bounds or engine area IDs by providing an explicit snapshot of landmasses.

Legacy note: Morphology historically relied on engine-provided tags or runtime fields for some of these concepts. For example, continent identification was partly handled by engine calls like stampContinents() which set global westContinent/eastContinent markers. The introduction of `artifact:morphology.landmasses` is a move towards an explicit artifact for landmass data instead of implicit runtime state. However, as of now, both mechanisms exist (see Hidden Couplings).

### D) Morphology in the recipe pipeline (stage overview)

The Morphology domain is split into three recipe stages interwoven with Narrative stages in the standard pipeline:

- Stage morphology-pre – an early stage that seeds the world’s basic land topology (continents and initial coasts). It runs right after foundation and before any narrative steps.
- Stage morphology-mid – a mid-pipeline stage that further refines terrain (coastline ruggedness, drainage, erosion) after some narrative context is established. It runs after narrative-pre and before narrative-mid.
- Stage morphology-post – a later stage that finalizes terrain features (islands, mountains, volcanoes) and computes final landmass data. It runs after narrative-mid and before Hydrology stages.

This braided ordering is intentional: narrative “story” steps occur between Morphology phases, and they exchange signals via effect tags and overlay artifacts (e.g. Morphology provides coastlines for story generation, story provides overlays that Morphology uses for fine terrain adjustments). The exact ordering from the recipe is: foundation → morphology-pre → narrative-pre → morphology-mid → narrative-mid → morphology-post → hydrology-pre (then narrative-swatches, hydrology-core, etc.).

## Step map (Morphology callsites and data flow)

This is the complete map of Morphology-related steps in the standard recipe, with their contracts, implementations, and interactions. It includes Morphology’s own steps and any cross-domain steps that directly consume Morphology outputs. The focus is on where Morphology logic runs and what each step does (calls, artifacts, side effects).

Standard recipe stage order (for context): foundation → morphology-pre → narrative-pre → morphology-mid → narrative-mid → morphology-post → hydrology-pre → .... Below, each Morphology stage is listed with its steps:

### Stage morphology-pre (early terrain initialization)

#### Step morphology-pre/landmass-plates: Seeds the initial landmasses using tectonic plates data.

- **Contract**: .../morphology-pre/steps/landmassPlates.contract.ts – requires `artifact:foundation.plates` from Foundation and provides `artifact:morphology.topography` and `artifact:morphology.substrate`. No config knobs (empty schema). Injects ops: computeSubstrate, computeBaseTopography, computeSeaLevel, computeLandmask from Morphology ops.
- **Implementation**: .../morphology-pre/steps/landmassPlates.ts – calls multiple Morphology ops in sequence to generate terrain:
  - `ops.substrate(...)` – computes initial substrate buffers (erodibility & sediment) for the map.
  - `ops.baseTopography(...)` – generates base elevation values using plate uplift/rift fields.
  - `ops.seaLevel(...)` – determines a sea level threshold to achieve target land/ocean ratio.
  - `ops.landmask(...)` – produces a binary land/water mask from elevation and sea level.
  - `applyBaseTerrain(...)` – a local helper that writes terrain types (flat land vs ocean) into the heightfield buffer for each tile based on the land mask.
  - Calls to the engine via `context.adapter`: after shaping the heightfield, it invokes `validateAndFixTerrain()`, `recalculateAreas()`, and `stampContinents()` on the adapter. These engine calls ensure the terrain types are consistent, compute area connectivity, and mark the “westmost/eastmost” continents for gameplay (a legacy global state).
  - Logs an ASCII map of landmasses for debugging (`logLandmassAscii`).
- **Outputs**: Publishes topography and substrate artifacts: deps.artifacts.topography.publish(context, context.buffers.heightfield) and deps.artifacts.substrate.publish(context, substrate). The heightfield buffer now holds initial elevation and terrain for all tiles, and substrate holds base erosion parameters. Also triggers `effect:engine.landmassApplied` as a side effect (not via explicit publish, but by virtue of completing the landmass generation step; see Effect Tags below).

#### Step morphology-pre/coastlines: Expands coastlines using the game engine’s algorithm for more natural shores.

- **Contract**: .../morphology-pre/steps/coastlines.contract.ts – requires the `effect:engine.landmassApplied` tag (implicitly, to run after landmass-plates) and provides a marker `effect:engine.coastlinesApplied` (via tag) and `artifact:morphology.coastlinesExpanded`. Note: The contract file was not directly visible, but effect tag usage confirms these dependencies.
- **Implementation**: .../morphology-pre/steps/coastlines.ts – a simple orchestration around engine calls:
  - Calls `context.adapter.expandCoasts(width, height)` to invoke the engine’s coastline expansion on the current heightfield. The engine likely floods certain low-lying coastal tiles to create more realistic coast outlines.
  - Then iterates over every tile to sync the heightfield buffers with the engine’s updated terrain: for each tile, gets the engine’s terrain type (`getTerrainType(x,y)`) and writes it into `heightfield.terrain[i]`, and updates `landMask[i]` by checking `isWater(x,y)`. This ensures the topography artifact’s buffers reflect the changes made by the engine.
  - No Morphology ops or complex logic here – it’s a direct engine post-process.
- **Outputs**: Publishes the coastlinesExpanded artifact as an empty object. This artifact is a dummy; its presence just marks that the coast expansion occurred. More importantly, this step signals `effect:engine.coastlinesApplied` (declared in its contract), which acts as a synchronization point for downstream steps.

Stage outcome: After Morphology-Pre, we have a preliminary world: continents placed, a baseline elevation map, terrain typed (land/ocean), and smoothed coasts. The topography buffer (heightfield) is populated and will be shared through later stages. Narrative Pre now runs, possibly creating story overlays based on this world.

### Stage morphology-mid (terrain refinement)

Morphology-Mid runs after Narrative-Pre. By this point, narrative steps (like story-seed) have produced an overlays artifact capturing some “story” elements (like planned corridors, hotspots, etc.), which Morphology-Mid will use. Morphology-Mid focuses on refining coasts, computing drainage, and simulating erosion.

#### Step morphology-mid/rugged-coasts: Introduces coastal “ruggedization” – carving sea lanes and adjusting coasts using narrative inputs – and computes coastline metrics.

- **Contract**: .../morphology-mid/steps/ruggedCoasts.contract.ts – requires `artifact:foundation.plates` (again using plate data) and `artifact:storyOverlays` from Narrative-Pre, provides `artifact:morphology.coastlineMetrics`. This step notably consumes the overlays produced by the narrative story-seed phase. It maps ops.coastlines to morphology.ops.computeCoastlineMetrics (despite the name "coastlines", it’s about metrics and mask generation).
- **Implementation**: .../morphology-mid/steps/ruggedCoasts.ts – a complex step mixing engine data, narrative data, and Morphology logic:
  - Reads required artifacts: foundation plate data (`plates = deps.artifacts.foundationPlates.read(context)`) and narrative overlays (`overlays = deps.artifacts.overlays.read(context)`).
  - Builds binary masks from the narrative overlays for use in coast adjustments: it calls `buildOverlayMasks(width, height, overlays)` which internally uses helper functions:
    - `readOverlayMotifsMargins` and `readOverlayCorridors` (from `recipes/standard/overlays.js`) to extract specific overlay keys. For example, from the motifs.margins overlay it gets activeMargin and passiveShelf key sets (areas marked for coastline extension or shelf retention by the narrative), and from corridors it gets seaLanes keys (planned narrow sea routes).
  - These sets of tile coordinates are converted into boolean masks (Uint8Array per tile) via `fillMaskFromKeys`. The result is an OverlayMasks object with seaLanes, activeMargin, passiveShelf masks.
  - Generates a fractal noise array via the engine: `buildFractalArray(context, width, height, fractalId=1, grain=4)` creates an Int16Array of pseudo-random height offsets using engine’s `context.adapter.createFractal` and `getFractalHeight` (this provides randomness for coast perturbation). The use of a specific fractal ID and grain is essentially a hidden constant influencing coast shape (grain 4, fractal series 1) – not exposed in config, just embedded.
  - Calls the op: result = `ops.coastlines({...inputs...}, config.coastlines)`. Inputs include:
    - Current landMask (from the heightfield),
    - Plate boundary data (boundaryCloseness and boundaryType from foundation plates),
    - The three overlay masks (seaLaneMask, activeMarginMask, passiveShelfMask),
    - The fractal noise array,
    - An RNG seed (unique per map/step).
  - The config.coastlines advanced config object is passed to allow tuning (though the schema is basically empty; any constants are internal).
  - The computeCoastlineMetrics op presumably returns an object with:
    - updated landMask (possibly modified by carving out sea lanes or adding land in shelf areas),
    - A coastMask (tiles designated as coastal water – for special terrain type),
    - coastalLand and coastalWater masks (for output metrics).
  - Applies the terrain adjustments from the op result to the heightfield buffer:
    - For each tile, if `coastMask[i] == 1`, it sets that tile’s terrain to a special coast terrain type (COAST_TERRAIN) and marks it as water (isLand: false). This effectively turns certain land tiles into shallow coastal water with a distinct terrain code (engine uses COAST_TERRAIN to mark shallows).
    - Otherwise, it checks if the op’s updatedLandMask differs from the current landMask (meaning the op decided to add or remove land in that tile). If so, it writes either flat terrain or ocean terrain accordingly using `writeHeightfield` (which updates both terrain and landMask in the buffer).
    - It also cleans up any tiles that are no longer land: if a tile became water but still had a coast terrain from before, it resets it to true ocean terrain.
    - After this loop, the heightfield’s land/water distribution and coastal terrain edges reflect the “ruggedized” result – narrower straits (sea lanes) cut through land where narrative corridors were, active margins extended or preserved, etc., plus some random noise perturbation.
- **Outputs**: Publishes coastlineMetrics artifact with the two masks: coastalLand and coastalWater from the result. These indicate adjacency (land next to water and water next to land). Also, although not an explicit contract output, this step effectively refreshes `effect:engine.coastlinesApplied` – in the tags map, rugged-coasts is noted to “re-provide” the coastlinesApplied tag. Re-emitting this effect tag ensures that any logic gated on coastlinesApplied will consider the final coast state (it forces downstream consumers to wait until after rugged-coasts as well, not just the earlier coastlines step). For example, the placement/derive-placement-inputs step requires engine.coastlinesApplied and will thus run after this step in the pipeline.

#### Step morphology-mid/routing: Computes terrain routing (water flow paths and basins) on the current topography. This provides data for erosion and possibly informs river generation later.

- **Contract**: .../morphology-mid/steps/routing.contract.ts – requires `artifact:morphology.topography` (the latest heightfield) and provides `artifact:morphology.routing`. It maps an op: routing: morphology.ops.computeFlowRouting (which likely implements a flow algorithm). Config schema is empty (no author knobs).
- **Implementation**: .../morphology-mid/steps/routing.ts – not fully shown, but by contract we infer:
  - It reads the current topography (heightfield) via deps.artifacts.topography and likely uses it as input to `ops.routing(...)`.
  - The op computeFlowRouting presumably calculates for each tile the index of the downslope tile (flowDir) and cumulative catchment area or flow accumulation (flowAccum), possibly also identifying watershed basins (basinId). These correspond to the artifact schema fields.
  - After calling the op, the step would publish the routing artifact with the resulting arrays. Indeed, the contract’s implementArtifacts call indicates it validates and publishes those typed arrays as output (we see the contract lists provides: morphologyArtifacts.routing).
- **Outputs**: Publishes `artifact:morphology.routing` containing flow direction, flow accumulation, and basin IDs. This data is available for the next step (geomorphology) and could be used by Hydrology (though in practice Hydrology recomputes rivers on its own later).

#### Step morphology-mid/geomorphology: Applies an erosion/deposition simulation (a “geomorphic cycle”) to refine elevation based on the flow of water and substrate softness. Essentially, this step modifies the terrain to be more realistic by simulating geological processes.

- **Contract**: .../morphology-mid/steps/geomorphology.contract.ts – requires `artifact:morphology.topography`, `artifact:morphology.routing`, and `artifact:morphology.substrate`. (It needs the elevation map, the flow map, and the substrate hardness to compute erosion.) Provides no new artifacts – it purely updates existing ones. Maps op: geomorphology: morphology.ops.computeGeomorphicCycle. Schema empty (no direct knobs).
- **Implementation**: Likely .../morphology-mid/steps/geomorphology.ts (not shown here). Based on the contract and context:
  - It would gather the current heightfield (topography), flow data (routing), and substrate data.
  - Calls `ops.geomorphology({ ... }, config.geomorphology)` to compute erosion and deposition changes. The op uses some internal model (e.g. stream power law or simpler heuristics) to produce deltas: lowering elevation in areas of high flow (rivers carving) and maybe raising or depositing sediment in low flow areas (deltas, basins). It likely also updates the substrate’s sediment depth (increasing where deposition occurs, decreasing where erosion takes sediment).
  - The result might be a set of modified arrays or just directly mutate the passed-in buffers.
  - The step would then apply those changes: e.g., subtracting some elevation in each tile according to an erosion mask, adding to others, and adjusting the sedimentDepth accordingly.
  - It does not publish a new artifact; instead, it mutates the existing topography and substrate buffers in place (which is allowed as these were published once in pre and are considered “buffers” thereafter). After this step, the heightfield (elevation) and substrate arrays reflect a more eroded landscape.
- **Outputs**: No new artifacts; instead, side effects: the topography artifact’s content is updated (elevation and landMask might change slightly if erosion causes any previously land tile to sink below sea level, though unlikely at this stage without sea-level feedback) and the substrate artifact is updated (sediment distribution changed). The routing artifact remains as was computed (though it no longer perfectly matches the slightly altered heightfield; a small inconsistency that likely doesn’t matter unless large changes occurred). This step has no effect tag signals.

Stage outcome: By end of Morphology-Mid, the world elevation model has been further refined: coasts are detailed and possibly punctured by straits per narrative designs, river pathways are identified, and some erosion has occurred. The coastlinesApplied effect tag has been reasserted by rugged-coasts (ensuring anything that cares about “final” coastlines waits until now), and we have coastline metrics and routing data artifacts for reference. Narrative-Mid can now run (e.g. story orogeny might create narrative elements for mountains, though notably it runs before we place mountains in Morphology-Post).

### Stage morphology-post (final terrain features)

Morphology-Post occurs after Narrative-Mid and before Hydrology. At this point, any narrative “motifs” for mountains, rifts, etc., have been established (Narrative-Mid steps run between mid and post). Morphology-Post will add the remaining physical features (islands, mountains, volcanoes) to the world, using both the physical state and any narrative hints. It then finalizes the landmass data.

#### Step morphology-post/islands: Fills in strategic island chains, often in empty ocean or along archipelagos, possibly guided by narrative hotspot motifs (e.g. areas designated for island clusters).

- **Contract**: .../morphology-post/steps/islands.contract.ts – requires `artifact:storyOverlays` (the narrative overlays, specifically looking for hotspots and related motifs) and likely `artifact:foundation.plates` as well (though not explicitly in the excerpt, it might not need plates if islands are free-form). Provides no artifact, but in practice it produces `effect:engine.landmassApplied` again. (Reusing the landmassApplied tag signals that new land has been added.) No new artifact since it modifies topography.
- **Implementation**: .../morphology-post/steps/islands.ts:
  - Reads narrative overlays (motifs.hotspots probably) via `readOverlayMotifsHotspots` (similar pattern to rugged-coasts reading margins). Hotspots might indicate volcanic island chains or archipelago regions planned by narrative.
  - Possibly reads margin/corridor overlays if islands should fill narrative corridors (but primarily hotspots).
  - Likely calls `ops.planIslandChains({ ... }, config.islands)` or directly uses `addIslandChains` function with inputs such as the hotspots mask, world layout, and random seeds.
  - The logic would decide positions for islands: e.g. scatter small land patches in designated regions or random open ocean areas for balance.
  - Then for each chosen island location, it would elevate some tiles: possibly by directly writing to context.buffers.heightfield (setting landMask=1 and some elevation, terrain type flat) or calling an engine method to raise terrain.
  - It might also call `context.adapter.stampContinents()` again after adding islands, to update the engine’s continent labeling (so that these new land tiles are integrated into area calculations).
- **Outputs**: No artifact output; instead, side effect: the topography buffer is updated (new land tiles appear). It triggers `effect:engine.landmassApplied` (in the tag dependency map, islands is a producer of this tag) to indicate that landmasses have been updated/expanded. This tag is required by any downstream step that needs the final land configuration (e.g. Hydrology’s lake generation and Placement inputs). Indeed, hydrology-pre/lakes listens for landmassApplied, ensuring it runs after islands. Also, placement’s derive-inputs waits on coastlinesApplied (already satisfied) and implicitly final landmass state by stage order.

#### Step morphology-post/mountains: Raises mountain ranges according to plate collisions (and possibly narrative “orogeny” hints).

- **Contract**: .../morphology-post/steps/mountains.contract.ts – requires `artifact:foundation.plates` (to know where plate boundaries and high uplift areas are) and possibly also requires the narrative orogeny overlay (if any) – though narrative orogeny motif is likely a conceptual overlay rather than a data artifact (the narrative-mid step might not produce a tile mask, just story elements). Provides no artifacts or tags (mountains are just part of the terrain).
- **Implementation**: .../morphology-post/steps/mountains.ts:
  - Uses foundation plate data: in particular, plates.boundaryType and plates.upliftPotential to locate convergent boundaries (where mountains form). Possibly also uses plates.shieldStability or other fields if present.
  - Could incorporate narrative orogeny motif indirectly: the narrative-mid story-orogeny might mark certain plate boundaries as especially significant. However, since Morphology doesn’t explicitly consume a story orogeny artifact (none exists; narrative orogeny likely just logs or influences narrative, not a data overlay), mountains rely primarily on physics (foundation data).
  - Likely calls `ops.planRidgesAndFoothills({ ... }, config.mountains)` which wraps the `layerAddMountainsPhysics` logic. This would raise elevations along major collision zones and perhaps add some noise for variability.
  - Implementation might directly manipulate the heightfield: increasing heightfield.elevation for clusters of tiles to create mountain peaks and slopes, and possibly adjusting terrain to a “mountain” terrain type if defined (though often mountains might still use generic terrain types unless the engine has a specific terrain tag for mountain).
  - Some smoothing or foothill generation might occur around the peaks (hence “ridges and foothills”).
- **Outputs**: No direct artifact; side effect: the topography buffer’s elevation values are increased in mountain areas. These changes propagate to downstream consumers (ecology will see higher altitudes for biome classification, placement sees mountains affecting passability, etc.). Mountains do not emit a specific effect tag – they are implicitly done before Hydrology (by stage ordering) and before ecology.

#### Step morphology-post/volcanoes: Adds volcanic features, typically at rifts or hotspots.

- **Contract**: .../morphology-post/steps/volcanoes.contract.ts – requires `artifact:foundation.plates` (to identify rift zones or hotspots from plate data). No new artifacts or tags. Maps to op `planVolcanoes` (for layerAddVolcanoesPlateAware logic).
- **Implementation**: .../morphology-post/steps/volcanoes.ts:
  - Uses plate data, especially areas of high rift potential or hot spot (if foundation plates carry a field for intra-plate hotspots or rift lines).
  - Possibly also checks the narrative “rifts” motif overlay: note, narrative-pre had a story-rifts step which produced a motifs.rifts overlay artifact (though Morphology doesn’t explicitly consume it; it might not be needed here if foundation data suffices).
  - Calls `ops.planVolcanoes({ ... }, config.volcanoes)` or directly uses `layerAddVolcanoesPlateAware`. This would decide positions for volcanoes (which could be represented as small mountain peaks or tags for later placement of volcano entities).
  - Implementation likely raises small peaks on the heightfield at those locations (increasing elevation sharply) or flags them somehow for engine (the engine might place actual volcano gameplay objects later based on terrain, but our concern is just the heightfield).
  - May adjust terrain type to indicate volcano (if the engine has a volcano terrain, but likely not – volcanoes are usually gameplay objects, not a terrain tile type).
- **Outputs**: No artifact; side effect: heightfield updated with volcanic peaks (tiny mountain-like protrusions). No effect tags from this step. By end of this, the physical terrain is fully shaped.

#### Step morphology-post/landmasses: Computes the final landmass connectivity and publishes the landmasses artifact.

- **Contract**: .../morphology-post/steps/landmasses.contract.ts – requires `artifact:morphology.topography` (to access the final landMask) and provides `artifact:morphology.landmasses`. Maps op: landmasses: morphology.ops.computeLandmasses.
- **Implementation**: .../morphology-post/steps/landmasses.ts:
  - Reads the final heightfield.landMask via the topography artifact.
  - Calls `ops.landmasses({ landMask, ... }, config.landmasses)` (if any config) to identify connected land regions. This likely does a flood-fill or union-find over all land tiles to group them into distinct landmasses. It may also compute properties like tile count and bounding boxes for each landmass.
  - The result would be an array of landmass descriptors and an array mapping each tile index to a landmass id (or -1 for water) – aligning with the schema.
  - Publishes those as the landmasses artifact.
  - Possibly calls no engine functions; purely data computation.
- **Outputs**: Provides `artifact:morphology.landmasses` containing { landmasses: [...], landmassIdByTile: [...] }. This artifact is immediately used by the Placement stage: the placement step contract requires morphologyArtifacts.landmasses to ensure it can consider landmass boundaries when placing starting positions (so two players aren’t on the same landmass, for example).

Stage outcome: Morphology-Post completes the world’s physical generation. At this point, the heightfield (topography) is final – all terrain features are in place. The final outputs from Morphology are the updated heightfield buffer and associated artifacts: substrate (updated), routing (from mid, still available), coastlineMetrics (from mid), and landmasses (new). Effect tags from Morphology (`landmassApplied`, `coastlinesApplied`) have been signaled to downstream stages, ensuring proper ordering.

## Current dependency matrix (contracts: inputs & outputs)

This section presents the producer/consumer relationships for Morphology-related contracts: artifact flows between stages and effect tags for ordering. It captures what Morphology reads from upstream and what it provides to downstream (and any cross-domain couplings), effectively mapping the current pipeline contracts.

### A) Upstream inputs to Morphology (what Morphology reads)

Foundation Plates Artifact: `artifact:foundation.plates` – Produced by Foundation stage (the world generation seed stage) and consumed by multiple Morphology steps. It contains tectonic plate data (boundary maps, uplift/rift potentials, etc.) that Morphology uses to shape continents and mountains.
Consumers in Morphology:

- morphology-pre/landmass-plates (initial continents)
- morphology-mid/rugged-coasts (for coastal adjustments relative to plate boundaries)
- morphology-post/mountains (for mountain placement at convergent boundaries)
- morphology-post/volcanoes (for volcano placement at rifts)
Each of these requires foundationArtifacts.plates in its contract. This tight coupling means Morphology heavily relies on upstream tectonic modeling. (If Foundation changes its plate outputs, multiple Morphology behaviors shift.)

Narrative Overlays Artifact: `artifact:storyOverlays` – Produced by Narrative-Pre stage (specifically the story-seed step provides the initial overlays structure with sub-keys for corridors, swatches, motifs). It is essentially a catch-all object carrying various narrative “overlay” plans (e.g. planned rivers as corridors, climate zones as swatches, special regions as motifs like hotspots, margins, etc.). The schema is extremely loose (Type.Any() for each sub-field and additionalProperties allowed), meaning it’s an ad-hoc data container.
Consumers in Morphology:

- morphology-mid/rugged-coasts requires the overlays artifact (reads motifs.margins for activeMargin/passiveShelf and corridors for seaLanes). This coupling lets narrative dictate some coastline shaping (e.g. where to keep straits open).
- morphology-post/islands requires the overlays artifact (uses motifs.hotspots and possibly other motif info for island placement). Hotspot regions from narrative influence where islands appear.

Implicitly: Other Morphology steps do not directly require overlays, but narrative overlays also include “rifts” and “orogeny” motifs that conceptually relate to volcanoes and mountains. However, those steps didn’t declare an overlay requirement – meaning any narrative hints for rifts/orogeny are not directly read by Morphology code (mountains/volcanoes purely use plate data). This indicates either narrative orogeny is purely story (not affecting generation), or it’s an oversight/area for improvement.

Schema note: The overlay artifact’s looseness has led to Morphology (and Hydrology) treating it as a kind of global registry with keys set by narrative. E.g., Morphology’s readOverlayMotifsMargins simply trusts certain keys (activeMargin, passiveShelf) exist. There is no strict contract – a fragile integration. This will be targeted for removal in refactor (overlay concept is legacy).

### B) Morphology outputs and their consumers (downstream or cross-domain)

Topography Artifact (`artifact:morphology.topography`): Produced by Morphology-Pre (landmass-plates) and then mutated through the pipeline. It serves as the primary elevation and terrain dataset.
Consumers:

- morphology-mid/routing and morphology-mid/geomorphology (internal Morphology steps) require it to ensure they run after base topography is available.

Hydrology: The hydrology-pre/lakes step explicitly requires `artifact:morphology.topography`. This is a gating contract to make sure lakes generation (which modifies the heightfield by digging lakes) occurs after the initial land is in place. In practice, lakes reads the heightfield via engine context rather than directly from the artifact (since it operates on the live adapter), but the requirement guarantees ordering. After lakes runs, the heightfield is published anew as `artifact:heightfield` in Hydrology (with any lake modifications). Downstream domains (Climate, Ecology, etc.) then use that hydrology heightfield artifact. So Morphology’s topography is a transient artifact whose data is effectively handed off to Hydrology’s heightfield artifact.

No other explicit consumers of morphology.topography outside Morphology; Hydrology is the main one (and by extension everyone uses the heightfield, just under hydrology’s ownership after lakes).

Substrate Artifact (`artifact:morphology.substrate`): Produced by Morphology-Pre (landmass-plates), updated by geomorphology.
Consumers: No downstream stage outside Morphology explicitly requires substrate (e.g., Hydrology and Ecology do not). In current state it’s an internal Morphology buffer. Possibly considered for use in erosion or future geology slices. (It’s essentially a legacy artifact right now – kept for the geomorphic simulation but not leveraged elsewhere.)

Coastlines Expanded Artifact (`artifact:morphology.coastlinesExpanded`): Produced by Morphology-Pre (coastlines).
Consumers: None explicitly. This artifact’s presence is mostly checked in tests or guardrails (to ensure the step ran). It’s not read by any downstream logic; instead, the effect tag engine.coastlinesApplied is used for ordering (see tags below). This artifact can be seen as a legacy placeholder (in a refactor it might be removed in favor of just using the effect tag or verifying terrain state).

Coastline Metrics Artifact (`artifact:morphology.coastlineMetrics`): Produced by Morphology-Mid (rugged-coasts).
Consumers: None in current pipeline. No step in narrative, hydrology, or ecology explicitly requires coastlineMetrics. Potentially, it could be used by Ecology or Placement to know which land tiles are coastal (to influence biome or city placement logic), but currently those domains seem to derive that themselves if needed (e.g. placement might check adjacency via engine). The coastlineMetrics artifact is effectively unused data at the moment – a product of refactored thinking that hasn’t yet found a consumer. (It’s a candidate for removal or promotion in the future – right now it’s a dead artifact.)

Routing Artifact (`artifact:morphology.routing`): Produced by Morphology-Mid (routing).
Consumers: No explicit consumer outside Morphology. Hydrology’s river generation (hydrology-core/rivers) does not list this artifact as an input; it recalculates flow using its own logic on the post-lake heightfield. Nor does ecology use it (e.g., to determine fertile river valleys – ecology relies on water adjacency differently). Therefore, the routing artifact currently doesn’t inform any downstream steps – it appears to be calculated for completeness or future use. (It might be used in future erosion passes or to compare pre/post-hydrology, but as of now it’s not required by another contract.)

Landmasses Artifact (`artifact:morphology.landmasses`): Produced by Morphology-Post (landmasses).
Consumers: Placement domain. The final placement/placement step (which places civilizations and features) requires morphologyArtifacts.landmasses. Placement uses this to ensure each civ start is on a separate landmass and possibly to label continents in the UI. By providing a clear list of landmasses and their extents, Morphology enables placement to avoid relying on engine continent IDs or global state. Additionally, having landmass size info can feed into gameplay balancing (though details are outside this scope). No other domain uses this artifact directly, but it’s a crucial link between world gen and gameplay setup.

### C) Effect tags (ordering signals involving Morphology)

Morphology uses effect tags as lightweight signals to enforce ordering constraints with other domains (particularly Narrative and Placement). These tags are defined in recipes/standard/tags.ts as M4_EFFECT_TAGS.engine.* and are referenced in step contracts as requires or provides without carrying data. The relevant tags are:

`effect:engine.landmassApplied`: Signifies that base landmasses are generated.
Producers:

- morphology-pre/landmass-plates (after continents placed)
- morphology-post/islands (after adding new landmasses) (re-emits to signal land has changed).
Consumers:

- morphology-pre/coastlines requires this tag, ensuring coastlines step runs only after initial land is ready.
- hydrology-pre/lakes requires this tag (so that lakes fill after all landmasses, including islands, are finalized). If islands add new land, the lakes step will wait for that second emission in Morphology-Post.

Effect: This tag creates a two-tier dependency: after landmass-plates, coastlines can run (within Morphology-Pre), and at the very end, after islands, it prompts any waiting steps (lakes). Without re-emitting in islands, the lakes step might have proceeded after Morphology-Mid, missing the islands – hence the dual production of the same tag to cover both intervals.

`effect:engine.coastlinesApplied`: Indicates coastline processing is done.
Producers:

- morphology-pre/coastlines (initial engine coast expansion)
- morphology-mid/rugged-coasts (after ruggedizing coasts, essentially updating coasts).
Consumers:

Narrative steps that add story elements needing final coast info all require this:

- narrative-pre/story-seed (initial narrative generation may wait for coasts to be done),
- narrative-pre/story-hotspots, story-corridors-pre, story-rifts (various motif placements that benefit from knowing coastlines),
- narrative-mid/story-orogeny (perhaps ensures coastlines are finalized before doing any mountain lore),
- narrative-post/story-corridors-post (final narrative adjustments like connecting rivers might wait for coast info).
- morphology-post/islands is listed as consuming coastlinesApplied. This is interesting since by stage order islands comes after rugged-coasts anyway, but the tag requirement ensures that if, for instance, narrative-mid or other factors changed scheduling, islands strictly won’t run until coastlines are fully done. It likely is there to guarantee islands run after rugged-coasts in any scenario (even though in practice they are different stages).
- placement/derive-placement-inputs requires coastlinesApplied. The placement input gathering consolidates all final map data for city placement; requiring coastlinesApplied means it will only run after all coast shaping (through rugged-coasts) is done. This is likely redundant given it runs after morphology-post naturally, but it acts as a safety net.

(No other Morphology-specific tags) – Morphology does not produce a tag for “mountainsApplied” or similar; those are purely internal. It also doesn’t consume other domain tags (e.g., it doesn’t wait on any narrative tags, it directly consumes overlays instead).

Tag satisfaction: It’s worth noting that currently the engine effect tags like landmassApplied and coastlinesApplied do not have explicit “satisfies” validation in code (unlike, say, biomesApplied or placementApplied which have validators). They are used purely for ordering and carry no payload. This means steps may re-emit them (like Morphology does) without any conflict – the system doesn’t check a value, just the event.

### D) Hidden couplings (implicit dependencies not in contracts)

In addition to formal contracts, Morphology has implicit consumers/producers via global or runtime state:

StandardRuntime Continent Bounds: When landmass-plates calls `context.adapter.stampContinents()`, it sets StandardRuntime.westContinent and eastContinent indices (the engine picks two extreme landmasses as “west/east”). This is not exposed via artifact or tag – it’s an engine side-effect.
Consumers:

- hydrology-pre/climate-baseline (in Hydrology) reads these runtime.continentBounds to influence wind patterns (the climate baseline code checks ctx.runtime.westContinent etc.). However, the climateBaseline contract does not declare a dependency on landmassApplied or anything – it implicitly assumes those runtime values are set by then (hence a hidden ordering constraint).
- placement/derive-placement-inputs and placement/placement also use continent bounds: the placement code passes continent boundary info to the engine’s start position allocator. In fact, the Placement op plan-starts contract includes fields for continent bounds (ensuring players start on different continents). Currently, placement pulls those from the same StandardRuntime values (populated in foundation and updated in landmass-plates and possibly islands).

Implication: The use of stampContinents and reliance on StandardRuntime is a legacy mechanism that breaks the usual dependency tracking – nothing in contracts guarantees climate-baseline happens after stampContinents except the stage order. It’s a point of fragility: if Morphology didn’t call stampContinents, Hydrology and Placement might lack needed info or use stale data. The Phase 1 mapping identifies this as a critical hidden dependency to eliminate (in favor of explicit artifacts like landmasses).

Engine Terrain & Adjacency: Morphology steps sometimes use engine queries as inputs. For example, after coast expansion, the code uses adapter.getTerrainType and isWater to update buffers. In rugged-coasts, engine fractal generation is used as an input for randomness. These are not declared as dependencies – the engine is always available via context. It’s not a dependency order issue, but it is a coupling (Morphology’s outcome depends on engine algorithms). In a refactor, these might be replaced with internal noise generation or contract parameters, but for now they are part of the current state.

## Legacy surface inventory (config, constants, and policy rules)

This section inventories the legacy authoring surfaces in Morphology – configuration structures, hardcoded rules, and functions – that are candidates for change in the refactor. At Phase 1, we treat them as “existing facts” without judgment, but we flag them for Phase 2/3 to decide whether to keep, rework, or remove.

### A) Configuration schema and usage (Morphology config knobs)

Morphology’s author-facing configuration is defined in the domain config schemas. Notably:

Morphology Config Schema: `mods/mod-swooper-maps/src/domain/morphology/config.ts` – defines top-level config object for the Morphology domain. The schema lists keys such as oceanSeparation, coastlines, islands, mountains, volcanoes. Each is likely an object with sub-settings (or in some cases just flags). In the current code, these correspond to the high-level aspects of morphology. For example:

oceanSeparation (perhaps controlling continent separation logic – relates to how we ensure oceans between landmasses; used in landmass generation) – used by landmass-plates step (likely passed as part of config.landmass or similar).

coastlines – used by rugged-coasts step (config.coastlines passed to ops.coastlines).

islands – used by islands step (config.islands for planIslandChains).

mountains – used by mountains step (config.mountains for planRidgesAndFoothills).

volcanoes – used by volcanoes step (config.volcanoes).
Each of these keys likely contains tunable parameters (e.g., number of islands, mountain height scaling, etc.), but importantly, current usage of config in code often falls back on internal defaults. Many Morphology functions check if a config value exists, else use a constant. For instance, some ops might have default values for unspecified parameters (like default mountain height if not provided).

Landmass Config Schema: `mods/mod-swooper-maps/src/domain/morphology/landmass/config.ts` – defines config for landmass generation (maybe parameters like target land percentage, min distance between continents, etc.). The landmass-plates step likely pulls this in as config.landmass (the contract doesn’t list it explicitly, but the code passes config.substrate, config.baseTopography, etc. individually). Historical note: Before refactor, some of these might have been author settings, but as of now they might be mostly default-driven.

Observed config posture: The code tends to handle missing config by applying defaults on the fly. For example, if config.coastlines doesn’t specify a value for “seaLaneDepth”, the computeCoastlineMetrics implementation might have a hardcoded default. This is against the ideal posture of “schema-defaulted and normalized upfront”. In Phase 1, we note that hidden fallback behaviors exist. E.g., the context doc explicitly warns about hidden tuning constants and fallback logic. We see this in practice: Morphology functions often have if (param === undefined) use X patterns. For instance, DEFAULT_OCEAN_SEPARATION in ocean-separation/policy.ts provides a default separation distance used if config doesn’t override it. Similarly, resolveSeaCorridorPolicy likely uses internal thresholds not exposed to config. These defaults need to be catalogued so Phase 2 can decide to expose or remove them.

Config vs. knobs: Currently, Morphology’s config keys (coastlines, mountains, etc.) behave as advanced config inputs. There are also per-map “knobs” (sliders) that players can adjust (for instance, “World Age” might tweak mountains). In current state, those knobs typically map to slight adjustments in these config values or are not implemented at all. For example, a “Landmass Separation” knob might scale oceanSeparation distance. If not explicitly handled, those knobs are effectively no-ops. We should note any such high-level knobs that exist in UI but are not wired due to unfinished config handling (e.g., if ctx.config.worldAge is supposed to affect mountains but isn’t used).

### B) Policy constants and rules

Morphology retains some hardcoded policy modules – encapsulating legacy rules that ideally would be data-driven or physics-based. Key ones:

Ocean Separation Policy: `mods/mod-swooper-maps/src/domain/morphology/landmass/ocean-separation/policy.ts` – defines rules for separating continents by ocean gaps. Exports include a constant DEFAULT_OCEAN_SEPARATION (distance). This is used by applyPlateAwareOceanSeparation to ensure a minimum ocean width between landmasses. It’s a fixed value (or formula) not tied to config, thus a buried constant. This influences continent spacing silently.

Coastlines Corridor Policy: `mods/mod-swooper-maps/src/domain/morphology/coastlines/corridor-policy.ts` – contains logic to handle “sea corridors” between land (e.g., how to treat one-tile straits). Exports include functions like findNeighborSeaLaneAttributes and findNeighborSeaLaneEdgeConfig. These likely contain thresholds for when to keep a sea lane open vs fill it (maybe based on tile count or plate boundary type). They may reference narrative corridor overlay keys, but also might include constants (e.g., always keep at least 1-tile channel). These rules are currently static – not exposed as config – another example of legacy encoded behavior.

Mountain/Volcano Placement Rules: While not a separate policy module, the mountains/scoring.ts and volcanoes/scoring.ts implement scoring algorithms for placing peaks. They likely define thresholds like “if upliftPotential > 0.8, create a mountain” or “max one volcano per X tiles of rift”. They also contain constants for random variance and distribution. For instance, volcano spacing or how many tiles constitute a volcano cluster can be constants in code. These qualify as hidden multipliers or thresholds – values like MIN_VOLCANO_SPACING = 5 or similar if present. They also directly use FOUNDATION.BOUNDARY_TYPE enums to decide if a plate boundary is convergent/divergent. This direct import ties Morphology logic to Foundation’s internal classification rather than treating it as data, which is a boundary violation.

Erosion Parameters: The geomorphic cycle likely has internal constants (e.g., how many iterations, what coefficient for erosion vs deposition). If computeGeomorphicCycle doesn’t take them from config, they’re hardcoded. We haven’t seen the code, but typical constants might be “erosionRate = 0.1” or “sedimentCarryCapacity = some value”. These are presently opaque.

In summary, many “magic numbers” persist in Morphology:

The fractal grain used for coast noise (4) – not configured anywhere.

Threshold values in coastline and landmass separation policies (distance thresholds, etc.).

Mountain and volcano placement cutoffs.

Possibly island spacing or size parameters (e.g., islands function might have a default radius for island clusters).

These are exactly the kind of values Phase 0.5 identified to inventory. We will list specific ones found:

DEFAULT_OCEAN_SEPARATION – constant for ocean gap width.

Hardcoded fractal usage (always fractalId=1, grain=4 for coast perturbation).

No. of iterations or scale in erosion (not seen, but likely internal to ops).

The tile indices used for fractal are fixed (fractalId 1 might always correspond to a particular noise pattern).

Constants in corridor-policy for what counts as “neighbor sea lane” (likely something like a lookup radius or threshold).

The engine’s use of COAST_TERRAIN is hardcoded to mark coasts, implying reliance on a specific terrain ID in engine data (which is effectively a constant mapping).

Field tags for terrain/elevation existed in recipe but are not dynamically set by steps (as noted in a refactor doc: tags field:terrainType, etc., were defined but no step provides them). This is more of a tagging inconsistency but indicates leftover surfaces.

### C) Legacy functions and surfaces (not behind contracts)

Here we note elements of Morphology that violate the intended contract-first architecture (i.e., steps importing implementation details directly, or cross-domain imports):

Direct implementation imports in steps: Despite the new op contract system, some Morphology steps still import domain functions instead of using ops. For example, (based on earlier code or pre-refactor state) the islands.ts, mountains.ts, and volcanoes.ts steps were known to directly import from @mapgen/domain/morphology/<module> to call addIslandChains, layerAddMountainsPhysics, etc.. This bypasses the op contracts and makes the step depend on internal implementations. In our current code inspection, it appears landmassPlates and ruggedCoasts have been updated to use ops, whereas likely islands, mountains, volcanoes may or may not be updated (the contracts exist, so presumably they do use ops now via ops.planIslandChains etc., but we lack direct code confirmation in this doc). If any still import directly, that’s a clear boundary violation. Regardless, historically they did, so Phase 1 flags those step files as ones that used to deep-import:

morphology-pre/landmassPlates.ts (used to import landmass index) – now uses ops.

morphology-mid/ruggedCoasts.ts (used to import coastlines index) – now uses ops for metrics but still imports overlay readers (recipe-level functions) and uses engine calls.

morphology-post/islands.ts, mountains.ts, volcanoes.ts – presumably still import their domain functions or at least rely on them via ops.

Cross-domain constant imports: As noted, coastlines/rugged-coasts.ts, coastlines/plate-bias.ts, mountains/scoring.ts, volcanoes/scoring.ts all import BOUNDARY_TYPE from @mapgen/domain/foundation/constants.js. This means Morphology implementation code is reaching into Foundation’s internal enum of boundary types (e.g., to check if a boundary is convergent, divergent, transform). Ideally, Foundation’s plate artifact should carry that info (which it does, via boundaryType array), and Morphology should use the data. In fact, our rugged-coasts step does use plates.boundaryType from the artifact, making the direct import technically unnecessary – but it likely still exists in some older utility function. This is a layout coupling that Phase 1 identifies to remove: Morphology should depend on Foundation outputs through data, not module imports.

Narrative overlays in Morphology: We reiterate this as a legacy surface: Morphology reading storyOverlays (which includes narrative “story” constructs like motifs and corridors) is contrary to the ideal domain boundaries. Narrative overlays are considered an authored/story concept, not a physical truth, and their use in Morphology steps (rugged-coasts, islands) is marked for elimination. Currently, those overlays act as inputs to physical generation (effectively letting narrative influence geography). This coupling is explicitly forbidden in the refactor plan, so it’s inventoried here as legacy. (The overlays themselves will be replaced by more physically-grounded inputs or removed.)

Engine field tags and placeholders: In the current system, some artifact definitions or tags exist without real use. For instance, the recipe defines field tags like field:terrainType, field:elevation, etc., which are not provided by any step. They were possibly meant to mark that these data exist in the heightfield, but no step explicitly publishes them, so they remain placeholders (tests might reference them). Similarly, certain artifact definitions (like coastlineMetrics, routing) exist “just in case” but have no consumers, as noted. We highlight these as “dead placeholder” surfaces:

field:terrainType/field:elevation tags: defined in tags.ts but no producer (legacy from older code expecting engine to fill them).

`artifact:morphology.coastlineMetrics` and `artifact:morphology.routing`: produced but no current consumer (they exist mostly for completeness or future use).

These will either gain a use in Phase 2 (if deemed valuable) or be removed to streamline the surface.

## Boundary issues and planned deletions (Phase 1 findings)

In summary, Phase 1 has surfaced several boundary violations and legacy elements that the refactor needs to address. This section lists them explicitly, as these will drive Phase 2 modeling decisions and Phase 3 implementation slices aimed at “driving them to zero.”

1. Domain boundary violations (ops and imports)

Missing ops integration: Morphology is not fully integrated as a contract-first domain in the current recipe. The compileOpsById in the recipe explicitly excludes Morphology, meaning historically Morphology ops weren’t automatically wired. This forced steps to import implementation directly. Status: In current code, contracts exist and some steps use them (we saw LandmassPlates, RuggedCoasts using morphology.ops.*). But unless the recipe has been updated to compile Morphology ops, those ops calls might still be working only because the step contract imported morphology domain (with presumably empty ops object) – which is concerning. This needs confirmation and likely a fix (the refactor will formally include Morphology in ops compilation). The violation is that Morphology domain logic wasn’t behind stable op contracts as intended.

Direct implementation imports: As noted, several Morphology steps access domain internals:

landmass-plates.ts (likely fixed now to use ops, but flagged just in case).

rugged-coasts.ts (imports overlay readers from recipe and maybe used to import addRuggedCoasts logic earlier).

islands.ts, mountains.ts, volcanoes.ts (almost certainly call domain functions – e.g., addIslandChains – either via an import or through the ops which are basically thin wrappers around those functions). This mixing of layers violates the intended separation (steps should call ops, not module internals).

Plan: Phase 3 will ensure steps do not import from @mapgen/domain/morphology except the domain barrel (for ops types). All these calls will go through injected ops, after we properly wire Morphology ops in the recipe. The existence of those contract files suggests this is underway.

2. Cross-domain coupling (Foundation constants and Narrative overlays)

Foundation constant imports: Morphology code importing foundation/constants.js (specifically BOUNDARY_TYPE enum) is a cross-domain implementation reach-in. It couples Morphology to Foundation’s code structure. Instead, Morphology should rely only on data passed (the foundationArtifacts.plates includes a boundaryType array which serves the same purpose). This import is a leftover that should be removed. Any logic keyed off boundary types will use the numeric codes provided in the plates artifact instead of the enum (ensuring if Foundation changes or moves that enum, Morphology isn’t broken).

Narrative overlay dependence: Morphology-mid and -post steps consume narrative overlays for physical generation. This is a major conceptual boundary violation – narrative/story should not dictate physical simulation in the target architecture. The specific instances:

Rugged coasts using motifs.margins and corridors overlays to decide coastline changes.

Islands using motifs.hotspots for island placement.
These will be rethought. Possibly, what narrative was trying to achieve (ensuring certain terrain features for story) will be done either purely in Morphology (with config/parameters) or narrative will adjust after the fact without being an input. Phase 0.5 already said treat those overlays as legacy-only. Removing this means the storyOverlays artifact can be eliminated from Morphology’s inputs. For now, we mark these as surfaces to delete: the overlay readers in Morphology (readOverlayMotifsMargins, etc.) and the reliance on narrativePreArtifacts.overlays in step contracts.

StandardRuntime global usage: Not having an explicit artifact for continent bounds and instead relying on stampContinents global state is a hidden cross-stage coupling (Morphology writes, Hydrology/Placement read). It violates the contract principle of local reasoning (one has to know that stampContinents was called). The refactor will introduce a formal way to convey this (perhaps via the landmasses artifact or as part of foundation context). In current state, it’s a required hack – but we plan to retire it. Specifically, hydrology’s climate should get needed info via a formal artifact (like landmass index map), and placement already now can use landmasses artifact instead of runtime continents. Thus, stampContinents and use of ctx.runtime.continentX are legacy to remove. We identified climateBaseline’s and placement’s reliance on it as targets to replace with data-driven inputs.

3. Hidden parameters and magic numbers

Morphology’s code contains non-configurable constants that affect generation:

The default distance for ocean separation (ensuring continents aren’t too adjacent) – currently a constant in code.

Coastline noise grain (the fractal grain=4) – not exposed.

Possibly fixed threshold for how fringe “passiveShelf” margins extend (maybe a constant ratio).

Mountain placement thresholds (e.g. any plate boundary with closeness > X becomes a mountain) – X likely hardcoded.

Volcano frequency (could be a fixed percentage of rift tiles).

Many of these are not surfaced to config or documented.

From an engineering perspective, these are technical debt: if a designer wanted to tweak world gen, they cannot easily adjust these without code changes. Phase 2 will enumerate each and decide if it should become a config parameter, a documented constant, or removed. For now, Phase 1 lists known examples:

DEFAULT_OCEAN_SEPARATION – not in config (value used when separating continents).

Fractal parameters in ruggedCoasts – (id=1, grain=4) used for all maps.

Plate bias constants in coastlines/plate-bias.ts – likely determines how plate boundaries influence ruggedCoasts (the name suggests some weighting).

Fixed RNG seed usages – e.g. using 2_147_483_647 as modulus or similar in ctxRandom calls (this is fine, but something to note if we want reproducibility).

Elevation magic numbers – perhaps setting all base land to elevation 0 initially, then adding plate uplift which might be scaled by a fixed factor.

Terrain type codes – FLAT_TERRAIN, OCEAN_TERRAIN, COAST_TERRAIN are constants from engine (0x… values) used in logic. If engine changes those codes, Morphology would break. Normally these are stable engine constants, but they represent an implicit contract that could be made explicit or abstracted.

All these hidden values are logged as Phase 1 findings. They don’t necessarily “violate” boundaries, but they violate the ideal of transparency and tunability. The refactor will either expose them via config or at least consolidate them as named constants in a single place.

4. Obsolete or dead data surfaces

Unused artifacts: As identified, coastlineMetrics and routing have no current consumers. Unless a downstream need emerges (e.g., ecology using coastalLand mask for mangrove biome, or hydrology using routing from Morphology to place rivers), these are overhead. They also both use Type.Any() for parts of their schema (routing’s basinId optional, coastlineMetrics is straightforward). The plan may be to remove them or integrate their data elsewhere (e.g., incorporate coastal metrics into a more general “morphology descriptors” artifact for ecology).

Redundant tags: The double usage of landmassApplied and coastlinesApplied, while serving ordering, is a bit hacky. If the pipeline refactor can ensure strict stage ordering and use of artifacts, these tags might be pruned. For instance, if islands step is guaranteed to run before lakes because of stage design, we wouldn’t need islands to re-emit landmassApplied; the refactor might still keep tags for clarity, but it’s an area to reconsider. At minimum, the lack of validation for those tags is noted as a gap (they carry no data and no satisfaction checks).

Legacy narrative hooks: The narrative overlays themselves might be removed entirely in the future, which would also remove those inputs from Morphology. In current state, they remain because narrative still uses them for story injection (e.g., guaranteeing certain world features for lore). We list them here as “to delete or replace”: motifs.margins, motifs.hotspots usage in Morphology. They could be replaced by more generalized physical parameters (e.g., “coastal ruggedness” config or “island frequency” config, possibly driven by map script rather than narrative overlay).

Field tags not provided: The existence of field:elevation, etc., in tags.ts with no provider suggests leftover artifacts from an earlier system where heightfield was published differently. In Phase 1, this is just flagged – presumably those will be cleaned up (either provided properly by some step or removed if unnecessary). Currently, tests might be the only thing referencing them, expecting that by end of pipeline certain fields exist (the engine likely populates them for internal use, but not via the mod’s artifact system).

Greenfield delta notes (Phase 0.5 vs current state)

Phase 0.5 produced an idealized Morphology model (earth-physics-first, decoupled from story). Here we highlight where that ideal contradicts the current state, to scope the work needed:

Narrative overlay removal: Phase 0.5 explicitly forbids narrative/story overlays as inputs to Morphology. Current state violates this: narrative overlays directly feed into coastline and island generation. Delta: These influences must be either eliminated or replaced with physically-grounded parameters. For example, if narrative wanted a certain strait open, perhaps that should emerge from plate configurations or a “sea lanes” config rather than a story toggle. Removing overlays means Morphology’s rugged-coasts and islands logic will rely purely on plate geometry, random variation, and global config (and any downstream consumption of narrative motifs will shift to using final terrain instead). This is a significant change: it will restore Morphology’s purity but potentially alter world outcomes (some handcrafted features might disappear unless reintroduced differently).

Contract-first ops boundary: The target architecture demands all domain logic behind stable op contracts. Currently, Morphology is halfway there: ops exist but steps still dip into internals in places. Delta: Ensure every function (landmass gen, coast refine, etc.) is only accessed via ops interface. This likely means finalizing the integration of Morphology ops in the recipe (adding Morphology to compileOps call) and adjusting steps to remove any direct imports. Once done, step implementations become orchestration-only, as intended. This delta is more technical but straightforward.

Elimination of global state side-effects: The ideal model would pass needed info through artifacts or domain contracts, not via engine state. Current state still uses stampContinents (global labeling) and engine adjacency queries as crutches. Delta: Provide equivalents in data form. For instance, Phase 0.5 upstream diff might have noted that foundation should explicitly give a list of major continents, or Morphology should output continent info (which now it does via landmasses artifact). We have the landmasses artifact now – using it in hydrology and placement will remove the need for stampContinents. Similarly, if anything in climate needed to know “east vs west continent”, we can derive that from landmasses (e.g., largest two landmasses). So bridging that gap is planned.

No hidden constants: The greenfield posture is to expose or document all tuning parameters. Current state has many implicit constants. Delta: At Phase 2, decide which constants become config inputs and which become documented internal constants. For example, DEFAULT_OCEAN_SEPARATION might become a config parameter “MinContinentSeparation” or similar, or at least be in a config with a default. The fractal grain might be tied to a “CoastRoughness” setting. The refactor will formalize these. Until then, it’s important to note we identified them.

Morphology outputs vs ideal outputs: Phase 0.5 likely envisioned Morphology providing a set of canonical artifacts like land/ocean mask, elevation field, slope or roughness metrics, maybe watershed basins. Current outputs we have:

Land/ocean mask: Yes (in topography artifact, and separately landmasses artifact).

Elevation field: Yes (topography.elevation).

Slope/roughness: Not explicitly – coastlineMetrics partly gives coastal adjacency, but no general slope artifact. Roughness could be derived from elevation but we don’t output it. Possibly routing artifact (flowAccum) provides some terrain info indirectly.

Coastal proximity: Yes (coastalLand mask).

Barrier/orography descriptors: No direct artifact, though indirectly, mountains placement is our representation of orography. Phase 0.5 might have suggested outputs like a ridge mask or wind barrier map. We don’t output those – the climate engine deduces orographic effects separately.

Basins: Yes-ish (routing artifact includes basinId).

Delta: There are slight mismatches. For example, instead of a general “slope map” we output a specific coastline mask and a detailed drainage map – which might be overkill or not exactly what downstream needs. Greenfield might drop or alter some of these outputs (like replace routing with a simpler “watershed basins outline” if Hydrology doesn’t need full flow directions due to doing its own).

Internal vs public artifacts: Phase 0.5 categorization: some outputs should remain internal (only for Morphology’s own calc). In current state:

Topography and landmasses are clearly public (consumed by others).

Substrate and routing are effectively internal right now (no external use).

CoastlineMetrics is internal (unused externally; arguably could even be removed).

This aligns reasonably with ideal, except routing could have been a public artifact if Hydrology were to use it (it doesn’t, so it’s internal).

Delta: Possibly scrap or confirm internal ones. If routing was meant to be internal-only, Hydrology’s independence is fine. If not, maybe we intended Hydrology to use Morphology’s routing in an ideal world (reducing duplicated calc). That’s an open design choice.

Physically-grounded modeling vs authored interventions: The context doc stressed Morphology should not decide things that belong to other domains (like climate or fertility). In current state, Morphology doesn’t directly do climate or biomes, but through narrative overlays, there was some bleed (e.g., narrative might indicate where fertile valleys (hotspots) should be, and Morphology spawns islands there – an inversion of responsibilities arguably). Delta: Removing narrative influence already covers this. Additionally, ensure Morphology doesn’t implicitly set any ecology relevant data. So far, it doesn’t seem to – it purely shapes land. Good.

In short, the Phase 0.5 vs current delta can be summarized as:

Remove narrative/story inputs → replace with config/physics.

Fully enforce contract boundaries → no direct imports or global reliance.

Expose hidden parameters → via config or documented constants.

Possibly adjust what Morphology outputs to focus on truly needed descriptors (and drop legacy extras).

These differences highlight where Phase 2 modeling will have to reconcile ideal vs real. They are noted here so that when designing the new Morphology model, we consciously fix each point.

## Lookback 1 (Phase 1 retrospective)

Finally, reflecting on the Phase 1 mapping exercise, here are the most significant or surprising findings that will influence the next steps:

Deep Narrative Entanglement: It stood out how deeply narrative design had been intertwined with terrain generation. The rugged-coasts and islands steps depending on story motifs (margins, hotspots) is a prime example. We expected some coupling, but the extent (coastline shaping using narrative corridors) underlines the importance of untangling these. This was a planned discovery (workflow warned about overlays), but seeing it concretely in code confirms it’s a top priority to remove in the refactor.

Morphology Ops largely inert historically: We confirmed that Morphology’s op contracts exist but were not actually empowering the steps as intended. The recipe omission means that until recently, steps effectively ignored the op layer. The refactor has to treat Morphology almost like a fresh domain integration, similar to how Hydrology was refactored earlier. It was somewhat surprising that even after similar domain refactors (Hydrology, etc.), Morphology was left out of ops wiring until now. This explains why Morphology steps still have legacy patterns (direct imports, etc.) and reinforces the need to implement the contract-first approach from Phase 2 onward.

StandardRuntime dependency as a hidden link: We identified that Hydrology’s climate step and Placement were implicitly relying on Morphology (via runtime continents) without any explicit contract. This kind of hidden dependency is exactly what domain refactors aim to eliminate. It was anticipated (the context doc listed it as a “gotcha”), but confirming it helped us pinpoint where to fix it (landmasses artifact to the rescue). It’s a reminder of how older pipeline code passed critical info out-of-band, which can easily be missed if not documented.

Legacy artifacts that time forgot: The presence of completely unused outputs (routing, coastlineMetrics) and unrequired tags/fields was a bit surprising. It suggests some parts of Morphology’s refactoring started (e.g., computing routing) but its consumption by Hydrology was not implemented, leading to orphan data. It’s a caution to ensure in Phase 2 we either give these artifacts a real purpose or cut them to avoid complexity.

Plate data central to everything: On the positive side, one thing reaffirmed is that Foundation’s plate model is indeed the backbone for Morphology – nearly every step references foundationArtifacts.plates. This is good for physical consistency (plate boundaries influence land, coasts, mountains, volcanoes as they should). It means if the plate model is accurate, Morphology’s outputs will be geologically coherent. The refactor can build on this strength, ensuring we fully utilize plate metrics and maybe extend them (rather than relying on narrative hints or arbitrary noise).

Config underutilized: We saw that while config schemas exist for most aspects, the actual influence of config in code is minimal or hard to trace. Many behaviors are hardcoded or use defaults. This lookback item reminds us that one outcome of refactor should be empowering map authors with clear knobs – currently, they might change a Morphology config and see little difference because the code path doesn’t fully use it. E.g., if MorphologyConfig.islands.count existed and isn’t wired, that’s essentially a dead setting. We’ll need to verify which config options truly drive generation and which are stubbed out.

With these findings, we are well-prepared for Phase 2 (modeling spike), where we will redesign Morphology’s approach in line with first-principles and address these issues systematically. The Phase 1 evidence ensures our Phase 2 proposals will target real pain points rather than assumed ones.
