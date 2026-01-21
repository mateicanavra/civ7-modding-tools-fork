# Morphology Phase 2 — Core Model & Pipeline

This file is the **Phase 2 canonical spine** for Morphology modeling:
- invariants and vocabulary,
- domain ownership and no-backfeeding rules,
- stage/step lifecycle and **freeze points**,
- Morphology’s causality spine (what must be determined before what),
- explicit “integration hooks” for the other Phase 2 files:
  - `spec/PHASE-2-CONTRACTS.md` (schemas/field lists; Agent Split 2),
  - `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` (`artifact:map.*` posture + Civ7 stamping; Agent Split 3).

Source material (do not edit during this run):
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-full.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`

---

## 0) Non-negotiable invariants (Phase 2 locked)

### 0.1 Topology (Civ7 canonical)

- The world is a cylinder: **wrapX=true** and **wrapY=false**.
- There is no environment/config “wrap” knob; wrap is never an input contract field.
- All adjacency, distance, connected-component, and bbox semantics are **cylinder-aware**.

Evidence pointers:
- WrapX helper exists as a primitive: `packages/mapgen-core/src/lib/grid/wrap.ts`.
- Neighborhood iteration uses wrapX and hard N/S bounds (no wrapY): `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts`.

### 0.2 Authority and purity (physics truths vs gameplay projections)

- Physics domains (Foundation/Morphology/Hydrology/Ecology) publish **truth-only artifacts** (pure; engine-agnostic).
- Gameplay owns **projection artifacts** under `artifact:map.*` and owns adapter stamping/materialization.
- Physics domains must not consume `artifact:map.*` or engine tags/engine adapter state as truth inputs.

### 0.3 No downstream backfeeding

- No downstream stage/step must influence Physics computations.
- This is a pipeline contract, not a “best effort” guideline.

### 0.4 No overlays as physics inputs

- Morphology must not accept narrative/story/gameplay overlays (corridor masks, “protected sea lanes”, hotspot overlays, etc.) as inputs.
- If legacy content relied on overlays, the behavior moves:
  - upstream into Physics drivers (Foundation/Hydrology), or
  - downstream into Gameplay as read-only interpretation/projection.

### 0.5 Effect-only execution guarantees (stamping)

- Stamping/materialization completion is represented only by short boolean effect tags:
  - `effect:map.<thing><Verb>` with a short verb (examples: `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`).
  - Convention: `<Verb> = Plotted` (avoid wordy verbs; no receipts/hashes/versions).
- “project-map” / “stamp-map” are template terms; Phase 2 uses granular `plot-*` steps that provide the above effects.
- Engine-derived surfaces posture (closure-grade):
  - Civ7 elevation/cliffs are engine-derived after the `plot-elevation` boundary (`effect:map.elevationPlotted`).
  - Any decision that must match *actual Civ7* elevation bands or cliff crossings belongs in Gameplay/map logic after `effect:map.elevationPlotted` (never in Physics). See `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`.

---

## 1) Glossary (canonical vocabulary for Phase 2)

These terms are used with the meanings below throughout all Phase 2 morphology spec files.

### 1.1 Data surfaces

- **Buffer**: mutable, stage-owned runtime state (often typed arrays). Buffers are mutated only within their owning stage’s build phase.
- **Artifact**: a published pipeline value (stored in the artifact store). Unless explicitly documented as a **buffer artifact exception**, artifacts are treated as **immutable after publish** (including by the publishing stage).
- **Truth artifact**: a Physics-owned artifact that represents canonical world truth (engine-agnostic).
- **Projection artifact**: a Gameplay-owned derived artifact under `artifact:map.*` (projection intent; not Physics truth).
- **Overlay**: a derived label/mask intended for UI/scenario/AI interpretation. Overlays are Gameplay-owned and must never be Physics inputs.
- **Effect tag**: a boolean “has happened” guarantee produced by a step after successful effects (e.g., adapter stamping).
- **Publish-once handle**: a runtime handle (e.g., a typed array) that is built/mutated *before publish*, then published once and treated as immutable thereafter. If performance requires post-publish mutation, the value must be explicitly modeled as a buffer (and must not be used as a truth contract surface).

### 1.2 Pipeline building blocks (per modeling guidelines)

Phase 2 uses `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md` vocabulary:

- **Rule**: small, pure heuristic/decision function internal to an op.
- **Strategy**: algorithmic variant of an op with identical input/output.
- **Operation (op)**: stable, step-callable pure contract `run(input, config) -> output`.
- **Step**: orchestration + effect boundary; builds inputs, calls ops, publishes artifacts, and (when applicable) performs adapter writes + provides effect tags.
- **Stage**: ordered group of steps in a recipe; stage boundaries define freeze points.

Hard composition rules:
- Steps call ops; ops never call steps.
- Steps select strategies only via op config; steps do not import strategy modules directly.
- Rules remain internal; they are not contract surfaces.

---

## 2) Domain ownership and cross-domain responsibility

### 2.1 Foundation (upstream of Morphology)

Foundation owns tectonics and macrostructure truth, including:
- crust type/age/composition,
- tectonic regime signals and force fields (uplift/subsidence, extension, shear),
- melt/plume signals needed for volcanism intent,
- any other **mesh-first** tectonic drivers required to deterministically synthesize Morphology truth.

Morphology consumes Foundation truth artifacts as inputs; it does not “reinterpret” them as gameplay tags.

Important Phase 2 posture (locked):
- Foundation publishes mesh-first truth artifacts and also publishes one canonical **tile-space derived view**:
  - `artifact:foundation.plates` (derived-only; deterministic mesh→tile projection for tile-based physics consumers).
- `artifact:foundation.plates` is not Gameplay projection and must not be modeled under `artifact:map.*`. It exists to avoid duplicated/reimplemented tile projection logic across downstream steps.
- Any additional “published plate tensor bundles” beyond `artifact:foundation.plates` are not permitted (avoid proliferating multiple competing tile views).

### 2.2 Morphology (this Phase 2 scope)

Morphology owns physical sculpting truth. It publishes truth artifacts that downstream domains use deterministically, including:
- topography (elevation, sea level, land mask),
- substrate (erodibility, sediment depth),
- coastline metrics,
- landmass decomposition,
- volcanism intent (as Physics truth intent; not engine IDs).

Morphology does not stamp engine terrain and does not publish `artifact:map.*`.

### 2.3 Hydrology and Ecology (downstream physics domains)

- Hydrology owns canonical routing/hydrography/climate truth.
- Ecology owns biome/feature planning truth.
- If Morphology computes routing-like primitives for erosion, those are internal-only; Hydrology truth remains canonical.

### 2.4 Gameplay (downstream, plus braided “map” stages)

Gameplay owns:
- all overlays and placements (Narrative + Placement consolidation),
- all projection surfaces under `artifact:map.*`,
- all stamping/materialization via adapter steps.

Gameplay steps are allowed to be **braided** into the overall recipe ordering (e.g., scheduled earlier for legacy wiring), but that does not change ownership or dependency direction:
- Physics remains truth-only and must not require `artifact:map.*`, `effect:map.*`, or adapter state as inputs.
- Gameplay remains projection/stamping-only and must only consume Physics truths as read-only inputs.

---

## 3) Stage lifecycle model and freeze points (pipeline contract)

### 3.1 Stage lifecycle (required semantics)

Every stage has:
- **Build (mutable)**: stage-owned buffers can be mutated by the stage’s steps.
- **Freeze (boundary)**: the stage’s published outputs are treated as immutable by downstream; the stage performs no further mutation of those outputs after the freeze point.
- **Consume (downstream)**: later stages can read prior artifacts; they must not mutate them.

### 3.2 Canonical freeze points (Phase 2 named)

Phase 2 locks these freeze points as pipeline semantics (not just narrative):

- **F1 — after Foundation truth**: tectonic drivers/macrostructure truth are frozen.
- **F2 — after Morphology truth**: morphology truth artifacts are frozen; downstream physics reads them as truth.
- **F3 — after Hydrology truth**: hydrology truth artifacts are frozen.
- **F4 — after Ecology truth**: ecology truth artifacts are frozen.
- **F5 — after Gameplay stamping/materialization**: Civ7 engine terrain materialization and required engine postprocess is complete.

### 3.3 Projection intent freeze (required for honest effects)

For any adapter-stamping pass:
- The relevant `artifact:map.*` intent artifacts (when used) are **publish-once** and treated as immutable before stamping begins.
- No later step republishes/replaces those same intent artifacts within the same run after the stamp pass begins.
- The stamping step provides its `effect:map.<thing><Verb>` only after successful adapter calls.

This is the core invariant that makes boolean effects truthful without receipts/hashes.

---

## 4) Canonical topology of the pipeline (stage order and braid rules)

### 4.1 Conceptual phase order (canonical)

The canonical linear phase order is:

`Foundation (truth) → Morphology (truth) → Hydrology (truth) → Ecology (truth) → Gameplay (projection + stamping)`

Interpretation:
- This is the **dependency order for Physics truths** (what must be true before what), not a claim that no Gameplay steps can be interleaved in wiring.
- Any braided Gameplay step must only consume already-frozen Physics truth and must never become a prerequisite for Physics.
- Within Gameplay, Phase 2 conceptually distinguishes:
  - **projection intent** (publishing `artifact:map.*` where needed), then
  - **materialization/stamping** (adapter writes + `effect:map.*Plotted`).
  This is implementable as either two distinct stages or two step groups within a single Gameplay stage, but the projection intent freeze rule (3.3) is non-negotiable.

“Braided” Gameplay stages are allowed only as an ordering implementation detail and must preserve the above ownership rules:
- A braided Gameplay stage reads physics truth and writes `artifact:map.*` + effects.
- A braided Physics stage must not read `artifact:map.*` or adapter state as inputs.

### 4.2 Current wiring evidence (informative only)

Current standard recipe stage order is defined in `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`.

Phase 2 treats that wiring as an implementation detail that must be migrated to match the canonical topology and ownership rules; Phase 2 does not add shims.

---

## 5) Morphology causality spine (what must be decided before what)

This spine is the **ordering contract** for Morphology. Individual stage names can vary, but the dependency ordering below must be preserved.

1) **Substrate mapping (lithology / erodibility)**
   - Inputs: Foundation crust properties + tectonic regime signals.
   - Outputs: substrate truth surfaces needed for erosion/deposition and downstream ecology.
   - Includes: tectonic regime classification that treats **north/south edges as real boundary regimes** (transform/convergent/divergent), not dead cutoffs.
   - Includes: polar boundary regime + intensity are Foundation-owned controls (virtual “polar plates”), not Morphology knobs (see `spec/PHASE-2-CONTRACTS.md` “Polar boundary interaction controls”).

2) **Base topography synthesis (raw elevation/bathymetry drivers)**
   - Inputs: Foundation force fields (uplift/subsidence/extension/shear) + melt drivers as needed.
   - Outputs: first-pass elevation/bathymetry truth (pre-erosion).
   - Includes: polar edge effects generated by the same regime machinery as interior boundaries.

3) **Sea level selection and land definition**
   - Inputs: elevation distribution + author config targets (e.g., land fraction).
   - Outputs: seaLevel scalar + landMask truth (derived from elevation vs seaLevel).

4) **Coastline and shelf structuring + coastline metrics**
   - Inputs: landMask + elevation/bathymetry + substrate as needed.
   - Outputs: coastline metrics truth artifacts; any coastal/bathymetry adjustments remain within truth semantics.

5) **Geomorphic evolution (bounded erosion/deposition cycles)**
   - Inputs: substrate + topography + internal routing primitives.
   - Outputs: refined elevation/substrate truths consistent with bounded iteration.
   - Constraints:
     - bounded iteration count is fixed by normalized config (no runtime presence-gating),
     - routing at north/south edges uses coherent boundary conditions (virtual sinks/outflow) consistent with wrapY=false.

6) **Landmass decomposition (connected components on a cylinder)**
   - Inputs: landMask and topology rules.
   - Outputs: landmass IDs + per-landmass summaries; cylinder-aware bbox semantics.

7) **Volcanism intent (physics truth intent)**
   - Inputs: Foundation melt/plume/subduction signals + morphology context (e.g., regime zones).
   - Outputs: volcanism intent truth artifacts (tile mask/list, kind/strength as Physics semantics).
   - Constraints: no hotspot overlays as inputs; no engine IDs as outputs.

Morphology truth freeze (**F2**) occurs only after all of the above have produced stable published artifacts.

---

## 6) Stage/step model inside Morphology (pipeline explicit)

### 6.1 Morphology stages (conceptual; wiring-specific names are not canonical)

Morphology is modeled as one or more stages whose steps cover the causality spine and culminate in F2.

Requirements:
- Each step is an orchestration boundary that calls pure ops and publishes artifacts.
- Mutable buffers exist only within Morphology stages; only artifacts cross stage boundaries.
- Any internal-only buffers (e.g., erosion routing primitives) are not published as cross-domain contracts.

### 6.2 Op/step factoring rules (required)

Use the modeling guidelines to split responsibilities:
- Pure computations belong in ops (with strategies/rules internal).
- Publication, artifact freezing, adapter calls, and effect tags belong in steps.
- Steps must not “plan” domain heuristics; heuristics live in ops/rules.

### 6.3 Integration hooks for `spec/PHASE-2-CONTRACTS.md` (Agent Split 2)

The Contracts file must lock the concrete schemas/field lists (types, units, determinism/tie-breakers) for:
- each public Morphology truth artifact (ids, semantics, indexing rules),
- required Foundation→Morphology truth inputs (ids, semantics),
- required Morphology→Hydrology and Morphology→Ecology truth handoffs (ids, semantics),
- lifecycle expectations: which artifacts are guaranteed to exist at F2.

This Core file is the canonical place where the **ordering + freeze** semantics are defined; Contracts must not silently alter those semantics by schema choice.

### 6.4 Integration hooks for `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` (Agent Split 3)

The Map Projections & Stamping file must lock:
- the canonical `artifact:map.*` namespace and its “projection intent” posture,
- the canonical set of `plot-*` steps and their `effect:map.*Plotted` guarantees,
- the required “intent freeze → stamp → effect” invariant per stamped subsystem.

This Core file is the canonical source for the **no-backfeeding** rule: Physics steps must never require `artifact:map.*` or adapter state as inputs.

### 6.5 Canonical Morphology operation catalog (Phase 2 locked)

This section answers the Phase 2 closure question “do we have operations and their inputs/outputs/config?” by locking the **stable, pure op surfaces** Morphology steps call.

Rules:
- Ops are pure: `run(input, config) -> output` with no access to adapter/engine state and no access to `artifact:map.*` or `effect:map.*`.
- Steps are the only effect boundary: steps derive op inputs, call ops, publish artifacts, and freeze at F2.
- Config is **normalized before use** (defaults applied; no presence-gating). Wrap flags are not config inputs.

Each entry below is a Phase 2 contract surface:
- **Op id** is a determinism anchor (used for seed derivation labels) and must not be renamed.
- **Inputs/outputs** are stable at the field level for Phase 3 wiring.
- **Determinism** describes the required tie-breakers/ordering.

#### `morphology/compute-substrate` (truth; required)

- Purpose: derive substrate truth buffers from Foundation driver fields.
- Inputs (derived from frozen Foundation truths at F1):
  - `upliftPotential`, `riftPotential` from `artifact:foundation.plates`
  - `width`, `height`
- Output (feeds `artifact:morphology.substrate` at F2): `erodibilityK`, `sedimentDepth`
- Config: `SubstrateConfig` (strategy id `default`), normalized (defaults applied).
- Determinism: pure numeric; no RNG.

#### `morphology/compute-base-topography` (truth; required)

- Purpose: synthesize initial elevation field from Foundation drivers + deterministic noise.
- Inputs (F1 truths + seed):
  - `boundaryCloseness`, `upliftPotential`, `riftPotential` from `artifact:foundation.plates`
  - `width`, `height`
  - `rngSeed: number` derived deterministically from `context.env.seed` + stable label `morphology/compute-base-topography`
- Output (feeds `artifact:morphology.topography.elevation` at F2): `elevation` (tile-indexed)
- Config: `ReliefConfig` (strategy id `default`), normalized.
- Determinism: seed is data only; identical inputs+config+seed produce identical output array contents.

#### `morphology/compute-sea-level` (truth; required)

- Purpose: select `seaLevel` deterministically from hypsometry targets.
- Inputs (tile truths + seed):
  - `elevation` (tile-indexed)
  - `boundaryCloseness`, `upliftPotential` from `artifact:foundation.plates`
  - `width`, `height`
  - `rngSeed` derived from `context.env.seed` + stable label `morphology/compute-sea-level`
- Output (feeds `artifact:morphology.topography.seaLevel` at F2): `seaLevel` (scalar, meters)
- Config: `HypsometryConfig` (strategy id `default`), normalized.
- Determinism: output scalar must be identical given identical inputs+config+seed.

#### `morphology/compute-landmask` (truth; required)

- Purpose: derive land/water classification + distance-to-coast from elevation + sea level (and any allowed truth-only shaping).
- Inputs:
  - `elevation`, `seaLevel`, `width`, `height`
  - `boundaryCloseness` from `artifact:foundation.plates` (for any truth-only shaping policies)
- Output:
  - feeds `artifact:morphology.topography.landMask` at F2: `landMask`
  - feeds `artifact:morphology.coastlineMetrics.distanceToCoast` at F2: `distanceToCoast`
- Config: `LandmaskConfig` (strategy id `default`), normalized.
- Determinism:
  - Uses the canonical tile neighbor graph (wrapX=true, wrapY=false).
  - Any connected-component/BFS traversal must use deterministic neighbor ordering (see Contracts).

#### `morphology/compute-coastline-metrics` (truth; required)

- Purpose: derive coastline adjacency masks and (if used) truth-only coastline carving that updates the land mask.
- Inputs:
  - `landMask`, `width`, `height`
  - Foundation boundary context as tile rasters (derived from `artifact:foundation.plates`): `boundaryCloseness`, `boundaryType`
  - Any additional Morphology-owned context rasters required by the chosen strategy (noise masks, derived margin masks), all deterministically derived from frozen Physics truth + seeds (not gameplay overlays).
  - `rngSeed` derived from `context.env.seed` + stable label `morphology/compute-coastline-metrics`
- Output:
  - feeds `artifact:morphology.coastlineMetrics` at F2: `coastalLand`, `coastalWater`
- produces an updated `landMask` buffer; the Morphology stage MUST treat this updated `landMask` as the canonical land/water truth for all subsequent Morphology ops in the same run.
- Config: `CoastlineMetricsConfig` (strategy id `default`), normalized.
- Determinism:
  - Any stochastic carving uses only the provided `rngSeed`.
  - Any per-tile tie-breakers resolve by ascending `tileIndex`.

#### `morphology/compute-flow-routing` (stage-internal; not a cross-domain artifact)

- Purpose: compute routing primitives for Morphology-internal geomorphic cycles.
- Inputs: `elevation`, `landMask`, `width`, `height`
- Output: routing buffers (e.g., `flowDir`, `flowAccum`, `basinId`) consumed only by Morphology ops within the same stage.
- Config: `RoutingConfig` (strategy id `default`), normalized (currently empty).
- Determinism:
  - Pure: identical inputs yield identical outputs.
  - Edge/boundary behavior MUST respect wrapY=false hard borders.

This op MUST NOT publish any cross-domain artifact under `artifact:morphology.*`. The only published truth surfaces are those listed in `spec/PHASE-2-CONTRACTS.md`.

#### `morphology/compute-geomorphic-cycle` (truth refinement; required when enabled by config)

- Purpose: compute bounded erosion/deposition deltas for geomorphic relaxation.
- Inputs: `elevation`, `landMask`, `flowAccum`, `erodibilityK`, `sedimentDepth`, `width`, `height`
- Output: `elevationDelta`, `sedimentDelta` applied by the owning step to stage-local buffers, then (eventually) published into truth artifacts at F2.
- Config: `GeomorphicCycleConfig` (strategy id `default`), normalized (includes bounded iteration counts; no runtime presence-gating).
- Determinism:
  - Pure numeric; no RNG.
  - Iteration counts are fixed by normalized config.

#### `morphology/compute-landmasses` (truth; required)

- Purpose: decompose the final land mask into connected landmasses on a cylinder.
- Inputs: `landMask`, `width`, `height`
- Output (feeds `artifact:morphology.landmasses` at F2):
  - `landmassIdByTile` (water = `-1`)
  - `landmasses[]` summary list
- Config: empty (strategy id `default`), normalized.
- Determinism:
  - Connected-component traversal uses the canonical tile neighbor graph + deterministic neighbor order.
  - Ordering/tie-breakers for IDs and bbox semantics are locked in `spec/PHASE-2-CONTRACTS.md`.

#### `morphology/plan-volcanoes` (truth intent; required)

- Purpose: plan volcano vent placements as Physics truth intent (adapter-agnostic).
- Inputs (F1 truths + Morphology truths + seed):
  - `landMask` (volcanoes must be placed only on land at F2)
  - Foundation boundary context (tile rasters derived from `artifact:foundation.plates`)
  - Any other required Physics masks (e.g., hotspot trails) must be Physics-derived (not gameplay overlays)
  - `rngSeed` derived from `context.env.seed` + stable label `morphology/plan-volcanoes`
- Output: deterministic list of planned vents (tile indices), used by the owning step to build the full `artifact:morphology.volcanoes` truth artifact at F2:
  - `volcanoMask[tileIndex]` is derived directly from the planned vent indices.
  - `volcanoes[].kind` and `volcanoes[].strength01` are derived deterministically from frozen Foundation driver fields at each `tileIndex` (as specified in `spec/PHASE-2-CONTRACTS.md`).
- Config: `VolcanoesConfig` (strategy id `default`), normalized.
- Determinism:
  - `rngSeed` is the only entropy input.
  - Output list ordering is ascending `tileIndex`.
  - The op MUST select vents only from tiles where the provided `landMask[tileIndex] === 1`.

Other plan ops (`morphology/plan-ridges-and-foothills`, `morphology/plan-island-chains`) are allowed as Morphology-internal helpers that produce stage-local masks/edits for later steps; they do not define additional cross-domain truth artifacts in Phase 2.

### 6.6 Morphology truth step map (Phase 2)

This is the contract-facing step map for the Morphology **Physics** portion of the pipeline. It is explicit about:
- which pure ops are called,
- which truth artifacts are the inputs,
- which truth artifacts exist at **F2**.

Notes:
- Step ids are canonical (determinism labels + wiring targets). Recipes can group multiple of these logical steps into one stage implementation, but the ordering and artifacts must match.
- No step below consumes `artifact:map.*` or `effect:map.*`.
- For publish-once truth artifacts (e.g., `artifact:morphology.topography`, `artifact:morphology.substrate`), Morphology builds stage-local buffers first, then publishes once at the end of the Morphology stage (F2) and treats them as immutable thereafter.

| Step id (canonical) | Calls ops | Reads (frozen Physics truth) | Produces (stage-local buffers / snapshots) |
|---|---|---|---|
| `morphology/step-substrate` | `morphology/compute-substrate` | `artifact:foundation.plates` (`upliftPotential`, `riftPotential`), `width|height` | substrate buffers (`erodibilityK`, `sedimentDepth`) |
| `morphology/step-base-topography` | `morphology/compute-base-topography` | `artifact:foundation.plates` (`boundaryCloseness`, `upliftPotential`, `riftPotential`), `context.env.seed`, `width|height` | elevation buffer |
| `morphology/step-sea-level` | `morphology/compute-sea-level` | elevation buffer, `artifact:foundation.plates` (`boundaryCloseness`, `upliftPotential`), `context.env.seed`, `width|height` | seaLevel scalar |
| `morphology/step-landmask` | `morphology/compute-landmask` | elevation buffer, seaLevel scalar, `artifact:foundation.plates.boundaryCloseness`, `width|height` | landMask buffer + distance-to-coast buffer |
| `morphology/step-coastline-metrics` | `morphology/compute-coastline-metrics` | landMask buffer, `artifact:foundation.plates` (`boundaryCloseness`, `boundaryType`), `context.env.seed`, `width|height` | coastline metric buffers (`coastalLand`, `coastalWater`); deterministically updates the landMask buffer (truth-only carving), if enabled by config |
| `morphology/step-geomorphology` | `morphology/compute-flow-routing`, `morphology/compute-geomorphic-cycle` | buffers above, `width|height` | refined elevation + substrate buffers (bounded iterations) |
| `morphology/step-landmasses` | `morphology/compute-landmasses` | final landMask buffer, `width|height` | landmasses snapshot (`landmasses[]`, `landmassIdByTile`) |
| `morphology/step-volcanoes-intent` | `morphology/plan-volcanoes` (+ deterministic derivations) | final landMask buffer, `artifact:foundation.plates` boundary context, `artifact:foundation.tectonics.volcanism`, `context.env.seed`, `width|height` | volcanoes snapshot (`volcanoMask`, `volcanoes[]`) |

**Publish/freeze step (required):** `morphology/step-publish-truth`
- Publishes all Morphology truth artifacts as immutable Phase 2 contracts at **F2**:
  - `artifact:morphology.topography`
  - `artifact:morphology.substrate`
  - `artifact:morphology.coastlineMetrics`
  - `artifact:morphology.landmasses`
  - `artifact:morphology.volcanoes`

---

## 7) Evidence pointers (current implementation anchors)

These are “where to look” anchors for current wiring and existing primitives; they are not a statement of Phase 2 correctness.

- Standard recipe stage order: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
- Morphology stage entrypoints (current wiring): `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts` (and `morphology-mid/index.ts`, `morphology-post/index.ts`)
- Current Morphology artifact ids (implementation surfaces to be migrated toward Phase 2 ownership/purity): `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`
- Existing effect-tag mechanism and engine effect tags: `mods/mod-swooper-maps/src/recipes/standard/tags.ts`
- WrapX helper and “no wrapY” neighbor iteration: `packages/mapgen-core/src/lib/grid/wrap.ts`, `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts`
