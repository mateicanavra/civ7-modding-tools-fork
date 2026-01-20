---
name: plan-gameplay-vertical-domain-refactor
description: |
  Draft Gameplay domain refactor plan/spec for Civ7 MapGen. 
  This plan consolidates design direction and serves as the index of refactor phases for the Gameplay domain.
  Phase A focuses on overlay-driven shaping without direct world mutation; Phase B extensions are noted but deferred.
---

# PLAN: Gameplay (Vertical Domain Refactor)

This is a **thin policy + index plan** for the Gameplay domain refactor. It defines the Gameplay domain’s role and boundaries in Civ7’s map generation pipeline and outlines the phased approach to implement this refactor. Detailed analyses live in the Phase 1 and 2 spike documents, and slice planning lives in the Phase 3 issue.

**Backbone workflow references:**

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md` – *Refactor workflow and phase process (shared across domains)*
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md` – *Global locked decisions and pitfalls to avoid*

**Prompt wrapper (execution constraints):**

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/GAMEPLAY-NON-IMPLEMENTATION.md` – *Non-implementation prompt for running the refactor (read-only planning mode guidelines)*

**Path roots (for code references in this plan):**

- `/src/...` refers to `mods/mod-swooper-maps/src/...` (the mod’s source code for map generation)
- `/packages/mapgen-core/...` refers to `packages/mapgen-core/...` (core library code for map generation)

## Authoritative posture and principles

**Hard principles (enforced):**

- **No legacy propagation:** Legacy behaviors and authoring patterns from the current Narrative/Placement code **must not be carried forward** unless explicitly justified. All refactored gameplay logic will conform to the canonical architecture (contract-first ops, orchestration-only steps).
- **Canonical surfaces only:** The refactor will **express all new functionality through official, canonical interfaces** (contracts, schemas, ops). Avoid ad-hoc or hidden logic. Do not introduce shims/compat layers as a technique; migrate consumers and delete in-slice.
- **Gameplay owns its outputs:** The new Gameplay domain will **own all gameplay-specific surfaces** in map generation (start positions, resource placements, gameplay overlays, etc.). We will not leave behind “shadow” implementations in other domains. No shims/compat layers are allowed; migrate consumers and delete in-slice.
- **Presentation vs simulation separation:** Gameplay outputs like **projections/labels are presentation-only** – they must never feed back into altering the underlying world simulation state. (For example, the *LandmassRegionId* label is a Gameplay projection used for starts/resources logic, and it must not change the morphology of the landmass itself.) We maintain a one-way influence: gameplay reads physics data and produces labels or directives, but does not mutate physics domain data.
- **Minimal, local configuration:** Each Gameplay operation (op) uses its own minimal config schema. **No domain-wide config bags** should be passed through multiple ops. We avoid reading global config inside ops – instead, inject needed parameters explicitly. This ensures clarity and testability of each operation.
- **Explicit acceptance or rejection of legacy rules:** Every rule, heuristic, or magic number from the legacy Narrative/Placement must be **consciously either adopted or dropped** in the new model. There will be no “silent carry-over” of behavior. If a legacy rule remains valid, we formalize it in the new schema/contract; if not, we remove it or replace it with a first-principles approach.

**Design integration and workflow:**

- **Upstream alignment:** Gameplay sits at the end of the generation pipeline, so it heavily depends on upstream outputs. As part of refactoring, review all upstream domain outputs (Foundation, Morphology, Hydrology, Ecology) that Gameplay currently uses. Remove any outdated or redundant dependencies. For instance, if Narrative steps currently read directly from raw data in upstream domains in non-canonical ways, those interactions must be revised to use official artifacts or be eliminated.
- **Downstream alignment:** The only direct “downstream” consumer of Gameplay’s results is the game engine itself (via the EngineAdapter). However, other generation domains *indirectly* consume Gameplay-produced signals (e.g. physics domains reading narrative overlays as biases). As we refactor, we will document those couplings and ensure they remain stable or are cleanly reworked. If an upstream domain was reading a narrative overlay, we either preserve that overlay in Phase A or replace the mechanism with a new contract so that domain’s behavior remains consistent.
- **Collaboration with Ecology boundary:** Because **Ecology and Gameplay are adjacent layers** (Ecology produces biome and resource suitability info that Gameplay will use for placement), the refactor requires careful coordination with Ecology’s refactor. Boundaries such as “which domain places which features” and “how resource placement ties into biome outputs” must be explicitly defined. (E.g. Ecology will continue to handle natural feature placement like forests, while Gameplay handles special placements like natural wonders and resource distribution.)
- **Story overlays treated as legacy inputs:** The concept of “narrative story overlays” is **not an authoritative driver** in the new design. Existing narrative overlay data (motifs like corridors, hotspots, etc.) will be generated for compatibility, but **Gameplay’s model does not rely on them as external inputs**. Where a particular overlay was previously used to influence a physics process, we will, in the long run, replace that influence with a more direct domain-to-domain contract (or incorporate the effect into the physics domain). In Phase A, we will still produce overlays (to avoid breaking the pipeline), but they are considered a byproduct of Gameplay, not a separate causal layer. No new logic will be added that depends on an overlay produced by an upstream step – overlays are now **Gameplay-owned outputs**.
- **Stage braid constraints:** We **preserve the interleaved stage sequence** of the pipeline (the “stage braid”) to minimize disruption. However, we treat stage definitions as part of the mod’s public contract. The refactor will use clear, semantic stage identifiers for Gameplay steps (avoiding overly-generic names like “pre” or “post” unless absolutely necessary). If certain stage ordering must remain fixed (for example, if a Gameplay stage must run between specific Hydrology phases), we will document those constraints explicitly. The braided structure (multiple narrative stages and a final placement stage interwoven with physics stages) will remain, but **ownership is clarified**: all `narrative-*` and `placement` stages become Gameplay-owned stages.
- **Step decomposition vs. stage proliferation:** We will decompose the Gameplay domain logic into logical steps as needed for clarity (e.g. separate steps for different sub-tasks like “generate hotspots” vs “generate corridors”). However, we will only introduce new *pipeline stages* if required for cross-domain integration or clarity. Internal domain segmentation is encouraged for maintainability, but adding new official stage breaks must be justified by clear benefits (like enabling a hook or a data hand-off point that’s impossible otherwise). We aim to keep the stage count minimal and instead manage complexity with well-structured internal steps.

**Implementation guardrails (from global locked decisions):**

- Gameplay must adhere to the project’s standard architecture rules (contract-first ops, steps that only orchestrate and do not reach into op internals, etc.). In particular, **operations remain pure functions** (no side effects outside their scope), and steps are responsible for calling ops and publishing results via the context.
- The EngineAdapter is the **only gateway** for Gameplay to affect the actual game state. Under no circumstances will Gameplay code write directly to engine state or shared buffers; it must call adapter methods that the engine exposes. This ensures a clean separation and easier future updates.
- **No direct physics mutation:** (Restating a key locked invariant) During Phase A, Gameplay code must not directly modify physics domain data structures (terrain heightfield, climate grids, river maps, etc.). Any legacy code that did so (e.g. the “paleo rainfall” narrative injection that directly tweaked climate data) must be removed or relocated to a physics domain. Gameplay’s influence on worldgen is **through overlays and engine calls only** in this phase.

## Domain framing: Gameplay in the pipeline

**Position in pipeline:** Gameplay is a new **end-stage domain** that sits *downstream of all physics domains*. It consumes the finalized outputs of Foundation, Morphology, Hydrology/Climate, and Ecology. In the standard map generation flow, Gameplay’s work is split across several interleaved stages (formerly called Narrative and Placement stages) that occur at designated points after certain physical processes:
- After world geometry and basic climate are initialized, Gameplay generates high-level **story overlays** (e.g. tectonic motifs, region markings) that provide context to later steps.
- After rivers are generated and ecology is done, Gameplay performs final **placement** decisions (placing resources, start positions, etc.) and applies any game-specific labels or effects to complete the map.

**Upstream inputs:** Gameplay relies on numerous artifacts from upstream domains. For example:
- **Morphology** provides landmass shapes and mountain positions that Gameplay uses for start placement biases and to identify “homeland vs distant land” regions.
- **Hydrology/Climate** provides river networks and climate data; Gameplay may use these (e.g. rivers for placing floodplains or climate zones for start bias calculations).
- **Ecology** provides biome classification and resource suitability contexts which Gameplay considers when deciding where resources or natural wonders can go (ensuring placements make sense for the terrain and biome).

**Downstream outputs:** Gameplay produces outputs that largely go to the game engine:
- **Engine placement calls:** The final result of Gameplay is to invoke engine APIs that actually place civilizations, resources, natural wonders, and other game entities onto the map.
- **Overlay data:** Gameplay publishes a structured **overlays artifact** containing narrative data (motifs like corridors, swatches, etc.). These overlays are available for any downstream consumption. In the generation pipeline, *other domains can read these overlays* to bias their calculations. (For instance, Ecology might read a “corridor” overlay to adjust biome distribution.) Even though overlays are produced by Gameplay, they act as read-only inputs for certain physics steps that come after them in execution order. Maintaining these overlays (at least in Phase A) ensures that existing cross-domain interactions continue to function correctly.
- **Labels and classifications:** Gameplay may also output non-physical classifications such as the Landmass Region IDs (tagging continents as “homeland” or “distant land”) and other markers. These are applied via the engine (so the game knows about them) and used internally by Gameplay or the engine’s start placement logic.

**Domain outputs summary:** In short, Gameplay is responsible for the final **player-facing configuration of the map**:
- Placement of all player start positions and related zones (ensuring no two majors start too close, enforcing start biases, etc.).
- Placement of all strategic and luxury resources and other map constructs that affect gameplay balance, along with any special post-processing (like ensuring certain resources aren’t on one-tile islands, or adding planned floodplains along rivers).
- Placement of special features like natural wonders and goody huts (discoveries).
- Emission of narrative overlays that “tell the story” of the map’s formation (without altering the map’s physical state) to enrich context and potentially influence AI or future mechanics.
- Applying gameplay-specific labels/effects to tiles (for example, marking polar ice caps with a “permanent snow” effect, or tagging the “New World” areas that are initially inaccessible).

**North-Star references:** (For further background and comparison, see these documents)
- `docs/system/libs/mapgen/architecture.md` – high-level domain layering and data types in the map generator.
- `docs/system/libs/mapgen/foundation.md` – Foundation domain spec (tectonics and initial geometry).
- `docs/system/libs/mapgen/morphology.md` – Morphology domain spec (terrain shaping).
- `docs/system/libs/mapgen/hydrology.md` – Hydrology & Climate domain spec.
- `docs/system/libs/mapgen/ecology.md` – Ecology domain spec.
- `docs/system/libs/mapgen/narrative.md` – *(Pre-refactor)* Narrative domain reference (for historical context of story overlay logic).
- `docs/system/libs/mapgen/placement.md` – *(Pre-refactor)* Placement domain reference (historical context of final placement logic).

*(Note: The Narrative and Placement docs represent the legacy separation. After this refactor, a single Gameplay domain covers those responsibilities.)*

**Special guidance for this refactor:**
- **No shortcuts or phase skipping:** Even though Gameplay is a new domain, parts of its functionality existed in legacy form. We must resist the temptation to simply “reuse” or assume legacy code is sufficient. The refactor will execute **all phases (0.5 through 3)** as prescribed. The fact that some legacy behavior aligns with our goals **does not** permit skipping the modeling or planning phases. We will treat the legacy code as just one input into Phase 1 (current-state analysis) and Phase 2 (model design), not as an upper bound on what we can achieve.
- **Full separation of concerns:** We will be vigilant about enforcing the boundary between Gameplay and Physics domains. If any logic in Gameplay seems to overlap heavily with physical simulation (for example, a “geological” computation masquerading as a narrative step), we will consider relocating it to the appropriate physics domain. Conversely, anything in physics that purely serves a gameplay purpose should be identified for possible relocation into Gameplay (or at least clearly marked as a gameplay-affecting hack to remove).

## Phase artifacts and deliverables

| Phase   | Artifact (Gameplay Domain)                                                       | Status       |
| ------- | ------------------------------------------------------------------------------- | ------------ |
| Phase 1 | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-current-state.md` | *Not started* (to be created during Phase 1) |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-modeling.md`      | *Not started* (to be created during Phase 2) |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-gameplay-vertical-domain-refactor.md` (implementation plan issue) | *Not started* (to be created for Phase 3 planning) |

*(Note: A Phase 0.5 Greenfield spike may also be produced as `spike-gameplay-greenfield.md` if needed, to capture any forward-looking design ideas before analyzing current state.)*

These artifacts will be produced as the refactor progresses through the phases. Each phase’s output is **authoritative** for that stage:
- Phase 1’s spike will document the **current state** of gameplay-related code and behavior (as it exists pre-refactor).
- Phase 2’s spike will contain the **target domain model and specifications** for Gameplay (defining how the new Gameplay domain should function from first principles, including schemas and algorithmic approach, without regard to old implementation).
- Phase 3’s issue will contain the **implementation and slice plan**, detailing how to go from the current state to the target design in structured steps (slices), with any necessary migration notes, test plans, and coordination steps.

## Phase 1: Hypotheses to validate (current state)

Before refactoring, we will confirm our understanding of how gameplay logic is currently implemented. Key points to investigate in the Phase 1 current-state analysis include:

- **Legacy domain modules:** Verify that the codebase indeed has a `@mapgen/domain/placement` module (handling starts, resources, etc.) and a `@mapgen/domain/narrative` module (handling overlays). We expect to find placement planning ops (e.g. functions for start placement, wonder placement) and narrative utilities (e.g. motif generation functions) scattered in these modules.
- **Stage definitions in recipes:** Identify how the current map generation recipe interweaves gameplay stages. We expect stages named `narrative-pre`, `narrative-mid`, `narrative-swatches`, `narrative-post`, and `placement` (or similar) in the standard recipe. We need to confirm the exact naming and ordering of these stages, and what artifact contracts they declare (e.g. an artifact for story overlays, artifacts for placement inputs/outputs).
- **Artifact usage:** Confirm that a global **overlays container** artifact is used in the narrative stages (as suggested by design) and that a **placementInputs** artifact is produced for the placement stage. Also, verify whether any gameplay stage writes to or reads from unexpected places (e.g. writing directly into a context object without a declared artifact, which would violate contract-first principles).
- **Legacy patterns and hacks:** Identify any places where narrative or placement logic violate the current architectural guidelines. For example:
  - The presence of any **direct physics data modifications** (e.g. a narrative step directly altering the climate or terrain arrays).
  - Any cross-step entanglement such as narrative code reaching into ecology’s data or vice versa outside of formal artifacts.
  - Use of global state or singleton utilities for gameplay placement (instead of using the injected dependencies or context).
- **Dependency on overlays:** Document which physics domain steps currently consume the narrative overlays. For instance, if Morphology or Ecology steps in the current code base explicitly reference things like `context.artifacts.storyOverlays.*`, note those, as they will inform how strictly we need to preserve certain overlays (or plan to adjust those steps in parallel).
- **Engine adapter usage:** Verify which EngineAdapter calls are currently invoked during the placement stage (e.g. `adapter.assignStartPositions`, `adapter.generateResources`, etc.). Also check if any expected calls are missing (for example, advanced start regions or landmass region labeling might currently be unimplemented).

This investigation will produce a clear map of what exists, which will guide the design and help pinpoint what needs to change. 

*(The full findings and evidence will be documented in the Phase 1 spike document. The above are the hypotheses and areas we anticipate exploring.)*

## Notes

- **Scope of this plan:** This document serves as an **overview and policy guide** for the Gameplay refactor. It establishes what the new domain should achieve and how we will approach it, but it does not duplicate detailed analysis or designs. Detailed current-state inventories belong in the Phase 1 document, the full authoritative domain model will be in Phase 2, and step-by-step implementation planning will be in Phase 3.
- **“Single source of truth” principle:** Each phase’s deliverable is considered the canonical truth for its purpose. This plan (and its appendices) provides context and intent, but for specific implementation details or modeling decisions, refer to the dedicated phase documents once they are created.
- **Alignment with overall refactor:** The Gameplay domain refactor is one part of the broader engine refactor effort. All general refactoring guidelines (in the workflow and reference docs) apply here. Where Gameplay has unique considerations (like engine integration or absorbing entire existing domains), we have outlined them above.
- **Phase A vs Phase B:** The focus of this refactor (Phase A) is on unifying existing functionality under the new architecture **without introducing new gameplay mechanics**. We note some potential Phase B ideas (e.g. more direct gameplay influence on worldgen) in this plan for context, but these are **not implemented in Phase A**. They serve only as future direction so we can design Phase A with expansion in mind (for example, ensuring we don’t paint ourselves into a corner). Phase A’s success criteria is feature-parity with clearer architecture, not adding new gameplay features.
