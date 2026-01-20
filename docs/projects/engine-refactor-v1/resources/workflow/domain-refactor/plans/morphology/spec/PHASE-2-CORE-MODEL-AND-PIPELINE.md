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

- No downstream stage/step may influence Physics computations.
- This is a pipeline contract, not a “best effort” guideline.

### 0.4 No overlays as physics inputs

- Morphology must not accept narrative/story/gameplay overlays (corridor masks, “protected sea lanes”, hotspot overlays, etc.) as inputs.
- If legacy content relied on overlays, the behavior moves:
  - upstream into Physics drivers (Foundation/Hydrology), or
  - downstream into Gameplay as read-only interpretation/projection.

### 0.5 Effect-only execution guarantees (stamping)

- Stamping/materialization completion is represented only by short boolean effect tags:
  - `effect:map.<thing>Plotted` (examples: `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`).
- “project-map” / “stamp-map” are template terms; Phase 2 uses granular `plot-*` steps that provide the above effects.

---

## 1) Glossary (canonical vocabulary for Phase 2)

These terms are used with the meanings below throughout all Phase 2 morphology spec files.

### 1.1 Data surfaces

- **Buffer**: mutable, stage-owned runtime state (often typed arrays). Buffers are mutated only within their owning stage’s build phase.
- **Artifact**: a published pipeline value (stored in the artifact store). Artifacts are treated as **stage-owned** while their stage is in Build, and as **immutable for downstream** after the owning stage’s Freeze.
- **Truth artifact**: a Physics-owned artifact that represents canonical world truth (engine-agnostic).
- **Projection artifact**: a Gameplay-owned derived artifact under `artifact:map.*` (projection intent; not Physics truth).
- **Overlay**: a derived label/mask intended for UI/scenario/AI interpretation. Overlays are Gameplay-owned and must never be Physics inputs.
- **Effect tag**: a boolean “has happened” guarantee produced by a step after successful effects (e.g., adapter stamping).

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

Gameplay steps may be **braided** into the overall recipe ordering (e.g., scheduled earlier for legacy wiring), but that does not change ownership or dependency direction:
- Physics remains truth-only and must not require `artifact:map.*`, `effect:map.*`, or adapter state as inputs.
- Gameplay remains projection/stamping-only and may only consume Physics truths as read-only inputs.

---

## 3) Stage lifecycle model and freeze points (pipeline contract)

### 3.1 Stage lifecycle (required semantics)

Every stage has:
- **Build (mutable)**: stage-owned buffers can be mutated by the stage’s steps.
- **Freeze (boundary)**: the stage’s published outputs are treated as immutable by downstream; the stage performs no further mutation of those outputs after the freeze point.
- **Consume (downstream)**: later stages may read prior artifacts; they may not mutate them.

### 3.2 Canonical freeze points (Phase 2 named)

Phase 2 locks these freeze points as pipeline semantics (not just narrative):

- **F1 — after Foundation truth**: tectonic drivers/macrostructure truth are frozen.
- **F2 — after Morphology truth**: morphology truth artifacts are frozen; downstream physics reads them as truth.
- **F3 — after Hydrology truth**: hydrology truth artifacts are frozen.
- **F4 — after Ecology truth**: ecology truth artifacts are frozen.
- **F5 — after Gameplay stamping/materialization**: Civ7 engine terrain materialization and required engine postprocess is complete.

### 3.3 Projection intent freeze (required for honest effects)

For any adapter-stamping pass:
- The relevant `artifact:map.*` intent artifacts are published once and frozen before stamping begins.
- No later step republished/replaces those same intent artifacts within the same run after the stamp pass begins.
- The stamping step provides `effect:map.<thing>Plotted` only after successful adapter calls.

This is the core invariant that makes boolean effects truthful without receipts/hashes.

---

## 4) Canonical topology of the pipeline (stage order and braid rules)

### 4.1 Conceptual phase order (canonical)

The canonical linear phase order is:

`Foundation (truth) → Morphology (truth) → Hydrology (truth) → Ecology (truth) → Gameplay (projection + stamping)`

Interpretation:
- This is the **dependency order for Physics truths** (what must be true before what), not a claim that no Gameplay steps can be interleaved in wiring.
- Any braided Gameplay step must only consume already-frozen Physics truth and must never become a prerequisite for Physics.

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

---

## 7) Evidence pointers (current implementation anchors)

These are “where to look” anchors for current wiring and existing primitives; they are not a statement of Phase 2 correctness.

- Standard recipe stage order: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
- Morphology stage entrypoints (current wiring): `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts` (and `morphology-mid/index.ts`, `morphology-post/index.ts`)
- Current Morphology artifact ids (implementation surfaces to be migrated toward Phase 2 ownership/purity): `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`
- Existing effect-tag mechanism and engine effect tags: `mods/mod-swooper-maps/src/recipes/standard/tags.ts`
- WrapX helper and “no wrapY” neighbor iteration: `packages/mapgen-core/src/lib/grid/wrap.ts`, `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts`
