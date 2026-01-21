# Context Packet: Fixing the Morphology Phase 2 Modeling Spike

> **LEGACY / NOT CANONICAL**
> This document is historical context used while producing the Phase 2 canonical spec in `plans/morphology/spec/`.
> If anything here conflicts with the Phase 2 canonical spec, treat `spec/` as authoritative.
> Canonical tag syntax uses `artifact:<ns>.<name>` and `effect:<ns>.<name>` (not `artifacts.<...>`).

## Purpose of this packet

This document summarizes:

* **What is wrong or incomplete** in the current Morphology Phase 2 modeling spike/report.
* **What direction the revised Phase 2 must take**, including clarified domain boundaries, invariants, cross-domain responsibilities, and **Civ7 engine terrain materialization (“stamping”) requirements**.
* **Which classes of mistakes must not recur**, and what “good” looks like at the model/contract level.
* A “raise and burn” posture: legacy braids and legacy scaffolding should be torn down unless they carry real canonical load.

It is meant to be read standalone by agents who will **overhaul** (not lightly patch) the Phase 2 report to align with the intended architecture and constraints.

---

## Core intent of Phase 2 (what Phase 2 is supposed to accomplish)

Phase 2 is intended to be an **authoritative, contract-locking modeling spec**, not a brainstorm and not a “setup” for later decision-making.

A correct Phase 2 deliverable must:

* **Close all domain-level design questions** (ownership, contracts, schemas, semantics).
* **Lock the causality spine** and the **public contract surfaces** (inputs/outputs/config semantics), including cross-domain deltas.
* **Explicitly model required changes in adjacent domains** (producers/consumers), rather than saying “they’ll handle it later.”
* Avoid tentative language (“provisional,” “optional,” “may include,” “needs verification”) for anything public, cross-domain, or ownership-defining.

Only *micro-level implementation details* may be deferred (e.g., which erosion solver, numeric optimization choices), and even then:

* contract shapes and semantics must still be locked,
* only the internal numerical method is left open.

### Phase 2 must include terrain materialization (“stamping”)

Phase 2 must not stop at buffer/index outputs and hand-wave the final map realization. We are producing a **Civilization 7 map**. At some point in the canonical pipeline, the world must be **materialized into Civ7 engine-usable terrain** (mountains, volcanoes, cliffs, terrain edits, potential area recalcs / postprocess phases).

Even if the engine stamping/execution sits outside Morphology (e.g., inside Gameplay apply-boundary), Phase 2 must still:

* Model **what gets stamped** (mountains/volcanoes/cliffs/terrain classes and any required engine-phase calls),
* Model **where and when stamping occurs** in the canonical pipeline,
* Define the **contracts** and **inputs/outputs** needed to perform stamping deterministically from physics truths.

Phase 2 cannot “delete” stamping from the spec. It must be **accounted for and contract-locked**, even if it is executed in another domain.

---

## Canonical architectural decisions and invariants (must shape the overhaul)

### 1) Physics domains are canonical truth producers

Physics domains (Foundation, Morphology, Hydrology, Ecology) produce the canonical world state.

* **Physics outputs are authoritative truth.**
* **No downstream backfeeding**: nothing from downstream can influence physics-domain computations.

### 2) Gameplay absorbs Narrative + Placement

Narrative and Placement are not first-class domains in the canonical architecture anymore.

* **Gameplay now owns**:

  * Read-only overlays/annotations derived from physics outputs.
  * Final placements/projections and apply-boundary tasks (engine-facing projection + stamping layer).
  * Engine-facing stamping and any required engine postprocess steps, unless explicitly modeled as a Morphology terminal phase (see stamping posture below).

Gameplay is currently **Phase A only**:

* Read-only w.r.t. physics; cannot mutate elevation/landmask/biomes/etc.
* Mutation capability is deferred and out of scope for current modeling.

### 3) Hard ban: overlays as physics inputs

No overlays, story masks, or gameplay constraints feed into physics.

* Morphology must not accept:

  * hotspots “overlays,” corridor masks, protected sea lanes, “data-only” gameplay masks, or any other overlay-shaped inputs.
* If something was previously achieved by overlay-driven hacks, it must be:

  * **Moved upstream** into physics drivers (Foundation/Hydrology), or
  * **Moved downstream** into Gameplay as read-only interpretation/annotation/projection.

### 4) Engine/projection truth is derived-only

Any engine-facing surfaces (terrain indices, region IDs, tags) are derived downstream.

* Physics domains (including Morphology) must not treat engine tags or projections as authoritative inputs.

This is a generalized boundary (not just a warning about “inputs”):

* **Gameplay owns all projections/indices:** terrain IDs, feature IDs, resource IDs, player IDs, region IDs, plot tags, placements, and any other game-facing index/tag surface are **Gameplay-owned derived artifacts**.
* **Physics artifacts must be pure truth surfaces:** physics domains must not embed engine IDs or other projection fields inside their truth artifacts as “the truth.” If legacy artifacts currently do this, treat it as migration work into Gameplay’s projection/stamping layer.

Where the engine is actually touched:

* All domains’ core logic is pure-only. Engine stamping (terrain/features/resources/players/tags) happens in **pipeline stages/steps that have access to an engine adapter**, by:
  1) reading physics truth artifacts,
  2) invoking Gameplay’s pure projection logic to produce indices/placements,
  3) stamping via the adapter, then running required postprocess/validation phases.

### 5) Determinism, knobs-last, no presence-gating

* Config defaults are explicit; normalization happens once; **no “if undefined then fallback”** behavior in runtime logic.
* Knobs are deterministic transforms applied last over normalized config.
* No hidden multipliers/constants; every value is either:

  * author-facing config, or
  * explicitly named constant with documented intent.

### 6) Civ7 engine integration must be explicit (especially for stamping)

The canonical model must reflect that Civ7 expects concrete terrain reality.

* The revision must consult Civ7 official resources to understand:

  * what “mountain,” “volcano,” “cliff,” etc. mean in Civ7 data terms,
  * what engine hooks (TerrainBuilder phases / recalc steps) exist and when they are invoked,
  * what data is required before stamping can occur and what must be recomputed afterward.

The revised Phase 2 must include an explicit, deterministic stamping contract layer.

---

## Settled ownership boundaries (no ambiguity allowed)

These are not “open questions.”

### Foundation owns tectonics and macrostructure (fully)

Includes:

* Plate generation and kinematics (plate count, size distribution, motion fields).
* Crust classification and age.
* Tectonic force fields (uplift/subsidence, extension, shear).
* **Melt/plume phenomena as physics signals** (e.g., `meltFlux`, plume identity and age).

### Hydrology owns hydrology surfaces (fully)

Includes:

* Canonical routing, flow accumulation, basins, river/lake surfaces.
* If Morphology needs an internal routing-like primitive for erosion, it must be explicitly scoped as **internal-only**, not the canonical cross-domain routing contract.

### Gameplay owns overlays, placement, projections, and stamping (default posture)

Includes:

* All overlays (formerly narrative motifs, corridors, hotspots markers).
* All placements (starts/resources/wonders).
* Engine-facing projection buffers/tags (e.g., LandmassRegionId assignment).
* **Terrain materialization / stamping** (default home), unless Phase 2 explicitly models a Morphology “terminal materialization phase” and justifies it structurally.

---

## Required physical-model additions that are now “first-class”

### Polar boundary tectonics (north/south edges)

Hard north/south map edges must behave like real plate boundaries, not dead cutoffs.

* Treat edges as interactions with off-map “polar plates.”
* Edge boundary regime is a real tectonic regime: **transform / convergent / divergent**.
* Edge effects (mountain belts, rifts, transform scars, volcanism) must be generated using the same tectonic regime machinery as interior boundaries.
* Routing/erosion near edges must have coherent boundary conditions (e.g., virtual sinks/outflow behavior).

This is not a special appendix: it must be integrated into the core causality spine and contract semantics.

---

## “Raise and burn” posture: de-braiding and pruning

### Narrative is gone as a standalone domain

* Narrative is absorbed into Gameplay.
* There should be **no canonical Morphology↔Narrative braid** in the architecture diagrams or pipeline model.

### Any remaining braid with Gameplay must earn its keep

* Interleaving/braiding between Morphology and Gameplay must exist only if it provides **real canonical structural load** for correctness/causality.
* Do not preserve stages purely for continuity, legacy ordering, or nostalgia.
* Default stance: **remove legacy braids/stages** and reintroduce only those justified by the intended architecture.

---

## What was wrong / incomplete in the current Phase 2 report (categories of failure)

### A) Open questions and tentative language

The report contains:

* explicit “Open Questions” about contract-level decisions,
* “provisional,” “optional,” “might,” “could,” “needs verification,” and similar modal phrasing for public surfaces.

This violates Phase 2’s purpose:

* Phase 2 must lock contracts, not defer them.

### B) Pushing responsibility onto other domains without fully modeling contracts

The report often says:

* “Foundation must provide richer tectonic detail”
* “Hydrology may compute routing or use Morphology routing”
* “Gameplay will assign region IDs”

…but does not fully specify:

* artifact names, schema fields/types,
* units/normalization, determinism/tie-breaking,
* lifecycle (when produced/frozen/readable),
* config surfaces and ranges.

### C) Underspecified public artifacts and semantics

Public outputs are described conditionally (“may include,” “if computed”), instead of defining a required set.

Public contracts must be:

* explicit,
* complete,
* deterministic,
* schema-locked.

### D) Narrative/Placement/Game topology not updated to Gameplay consolidation

The canonical architecture still refers to Narrative and Placement as standalone domains or implies braiding as canonical.

This must be removed from canonical modeling and treated only as legacy execution detail if needed.

### E) Legacy ideas sneak back in via naming or conceptual framing

Even with overlay bans stated, legacy terms like “hotspots overlay,” “protected lanes,” etc. reintroduce confusion and invite backsliding.

Physics causes must be expressed as physics signals (e.g., meltFlux/plumes), and overlays reserved for downstream annotation only.

### F) Misplaced or ambiguous domain responsibilities

Routing ownership and tectonic macrostructure controls remain implied/ambiguous in places.

These are settled:

* tectonics in Foundation,
* routing in Hydrology,
* overlays/placement/stamping in Gameplay.

### G) Civ7-resource-answerable questions left open

Some questions (especially about volcano requirements and terrain stamping expectations) are answerable from Civ7 official resources and must not remain open.

### H) Missing modeling of rules, stages, and steps (operation-only modeling)

The report models operations but fails to model:

* explicit pipeline stages,
* steps within stages,
* and governing rules for sequencing and interaction.

Phase 2 must model **stages/steps/rules** as first-class alongside operations, since the pipeline is the product.

### I) Terrain stamping / materialization is hand-waved

The report largely models physics buffers and outputs but does not explicitly model:

* where/how mountains/volcanoes/cliffs are stamped into engine-usable terrain,
* what engine phases are invoked,
* what deterministic contracts feed stamping.

This is unacceptable for Civ7: Phase 2 must account for terrain materialization in the canonical pipeline.

---

## Concrete modeling/contract closures the revised Phase 2 must include

These represent required “must-lock” items. They are not procedural instructions; they are content requirements for what the revised Phase 2 must contain.

### 1) Foundation → Morphology inputs (fully specified)

Define exact schema and semantics for all Foundation physics signals Morphology consumes, including:

* plate/boundary regime fields,
* uplift/subsidence fields,
* extension/shear fields,
* crust type + crust age,
* melt/plume fields (`meltFlux`, plume identity/age),
* polar boundary condition signals or config mapping.

All must include:

* indexing scheme (mesh vs tile),
* normalization/units,
* determinism rules,
* lifecycle (when stable).

### 2) Morphology → Hydrology outputs (fully specified)

Define:

* topography artifacts/buffers (elevation/bathymetry/sea level),
* derived terrain metrics (slope/aspect/roughness/distance-to-coast) if they are public,
* strict stance that Hydrology owns canonical routing surfaces (Morphology internal routing allowed only if internal).

### 3) Morphology → Ecology outputs (fully specified)

Define:

* sediment depth,
* erodibility/hardness proxies,
* any other substrate signals Ecology relies on.

### 4) Morphology → Gameplay outputs (fully specified)

Gameplay requires deterministic physical inputs for overlays/projections/placement:

* landmass decomposition must include both:

  * landmass list (properties),
  * per-tile landmass ID mapping,
  * stable ID assignment rules and adjacency semantics.
* coastline metrics schema must be explicit if used.

### 5) Gameplay projections & stamping contracts (fully specified)

Phase 2 must lock the downstream projection/stamping layer, including:

* LandmassRegionId assignment semantics (inputs, rules, tie-breakers, determinism),
* the stamping/materialization contract:

  * how mountains/volcanoes/cliffs are derived from physics fields,
  * which engine APIs are invoked,
  * what postprocess steps (area recalc, validation) are required,
  * what artifacts become canonical after stamping.

Even if stamping is executed in Gameplay, Phase 2 must model it as a first-class pipeline responsibility.

### 6) Stages, steps, and rules are explicit (not implied)

The revised Phase 2 must explicitly model:

* pipeline stages (semantic names),
* steps within stages (and which domain owns them),
* rules governing stage/step behavior and sequencing.

Ops alone are insufficient: the pipeline is the real product.

---

## Terrain stamping / materialization (clarified responsibility)

### Why this must exist in Phase 2

Civ7 requires a concrete terrain reality. A physics-only buffer model is not sufficient unless Phase 2 explicitly defines how buffers become engine-usable terrain.

Phase 2 must specify:

* what constitutes “a mountain,” “a volcano,” “a cliff,” etc.,
* how those are realized from physics outputs,
* and where the stamping occurs.

### Allowed placements for stamping responsibility

Phase 2 may model stamping in either place:

1. **Gameplay stamping phase (preferred default)**

   * Gameplay consumes canonical physics artifacts and performs deterministic stamping + projections.
   * Gameplay invokes Civ7 engine builders/postprocess phases per official resources.

2. **Morphology terminal stamping phase (allowed if structurally justified)**

   * Morphology ends with a “terrain materialization” stage that stamps terrain from its physics outputs.
   * Must remain physics-first and deterministic, and must not introduce overlays or gameplay masks.

Regardless of where stamping lives, Phase 2 must define it explicitly.

---

## High-level direction for revising the Phase 2 report (what should shift)

### Keep (structural backbone)

* Keep the causality spine as a backbone if it aligns:

  * substrate → base topo → sea level → coast structuring → erosion cycles → landforms → landmasses.
* Keep compute vs plan op decomposition if ownership and contracts are locked.

### Change (definitive shifts required)

* Remove Narrative/Placement as canonical domains; consolidate into Gameplay.
* Remove any residual overlay-shaped inputs into Morphology.
* Replace thumb-on-scale ocean separation concepts with Foundation macrostructure drivers + Gameplay interpretation.
* Resolve routing ownership: Hydrology owns canonical routing.
* Fully specify cross-domain contract deltas (Foundation, Hydrology, Ecology, Gameplay).
* Add explicit stamping/materialization stage in the canonical pipeline (Gameplay or Morphology terminal).
* Add explicit modeling of stages/steps/rules, not just ops.
* Eliminate tentative language for public contracts.

---

## Evidence posture (mandatory grounding rules)

Agents revising Phase 2 must treat these as mandatory evidence sources:

### Civ7 official resources (must consult)

Terrain stamping requirements are not speculative. Agents must inspect Civ7 resources to determine:

* volcano representation and requirements,
* mountain/cliff representation,
* required TerrainBuilder phases / recalc steps / validations,
* landmass region semantics,
* map topology constraints (explicitly: **east–west wrap is always on**, **north–south wrap is always off**; do not treat wrap flags as optional, configurable, or an open question; also: **no non-standard maps**).

### Mapgen repo (must consult)

Agents must inspect:

* actual stage wiring and existing artifact keys/step IDs,
* legacy overlay-driven coupling to remove,
* current pipeline points where TerrainBuilder is invoked or where stamping occurs today,
* and align the revised Phase 2 to implementable constraints without preserving legacy braid as canonical.

### Rule

If a question is answerable from Civ7 resources or the codebase, it must not remain open in revised Phase 2.

---

## Summary: what success looks like for the revised Phase 2

A revised Phase 2 report is correct if it:

* Is internally consistent (no contradictory invariants).
* Has **no story/narrative/gameplay masks** as Morphology inputs.
* Uses **Gameplay** as downstream owner of overlays, placement, projections, and (by default) stamping.
* Locks ownership boundaries:

  * Foundation owns tectonics/macrostructure (including melt/plumes),
  * Morphology owns shape truth (buffers/artifacts),
  * Hydrology owns canonical routing/hydrology surfaces,
  * Ecology consumes substrate/climate,
  * Gameplay owns overlays/projections/placements/stamping.
* Provides complete, explicit schemas and semantics for:

  * all public artifacts and configs in Morphology,
  * all upstream artifacts Morphology depends on (Foundation),
  * all downstream artifacts/projections impacted (Hydrology/Ecology/Gameplay),
  * stamping/materialization contracts and engine integration.
* Leaves **no open contract-level questions** and no “tentative/provisional” language for public surfaces.
* Integrates polar edge tectonics as a first-class part of the model.
* Explicitly models **stages/steps/rules** for the pipeline, not just ops.
* Embraces “raise and burn”:

  * removes legacy braid/stages unless structurally required,
  * keeps only what serves the canonical architecture.

This packet is the shared framing for the overhaul: the current Phase 2 outcome is close structurally, but it must be hardened into a true authoritative, cross-domain, contract-locked spec that fully accounts for Civ7 terrain materialization and eliminates every remaining legacy-shaped dependency.
