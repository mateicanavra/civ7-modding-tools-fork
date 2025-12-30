# PRD: Target Narrative & Playability Model (Optional Bundle)

## 1. Purpose

Define the end-state narrative/playability contract: typed narrative **story entries** published by opt-in steps, consumed explicitly by downstream injectors/placement, and absent any global `StoryTags` surface. This PRD reflects accepted decisions in `SPEC-target-architecture-draft.md` §1.5–§1.6 for the target architecture (not the transitional M4 wiring).

## 2. Scope

**In scope**
- Narrative story-entry contract (`artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`) and versioning.
- Optionality via recipe composition and enablement rules.
- Consumption patterns for downstream systems (biomes, features, placement).
- Caching/state rules for narrative data.

**Out of scope**
- Registry construction (see `PRD-target-registry-and-tag-catalog.md`).
- Execution/validation plumbing (see `PRD-target-task-graph-runtime.md` and `PRD-target-observability-and-validation.md`).
- Placement artifact schema details beyond the requirement that placement consumes explicit inputs (see registry PRD for tag definitions).

## 3. Goals

1) Narrative/playability is an optional bundle of steps expressed in recipes, not a privileged core phase.  
2) Narrative semantics are reified as typed, versioned **story entries** that downstream steps must depend on explicitly.  
3) No global or module-level narrative caches/registries exist outside a run context.

## 4. Requirements

### 4.1 Artifact Contract
- **REQ-NAR-1:** Narrative outputs are published as typed, versioned **story entry artifacts**: `artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`.
- **REQ-NAR-2:** Motif IDs are a mod-owned, centrally declared vocabulary. Story IDs are step-owned but must be registered; consumers must not “guess” story IDs.
- **REQ-NAR-3:** Narrative views (including overlay snapshots) are derived on demand from story entries and are not published dependency surfaces.
- **REQ-NAR-4:** There is no canonical `StoryTags` surface. Any query helpers are derived from story entries and scoped to the run context only.
- **REQ-NAR-5:** Story entry artifacts must declare schemas and versions; backward-incompatible changes require new IDs.

### 4.2 Optionality & Composition
- **REQ-NAR-6:** Recipes may omit narrative entirely; the pipeline remains valid without narrative steps.
- **REQ-NAR-7:** If a recipe includes a narrative consumer (e.g., biome/feature/placement injectors), it must also include the corresponding narrative publishers. Compilation fails fast on missing dependencies.
- **REQ-NAR-8:** Enablement for narrative occurrences is authored in the recipe and compiled into the plan; executors do not auto-skip narrative consumers.

### 4.3 Consumption & Downstream Contracts
- **REQ-NAR-9:** Downstream steps that need narrative semantics must require the relevant story entry artifacts (and then derive any views they need at point-of-use).
- **REQ-NAR-10:** Placement consumers rely on explicit narrative and placement input artifacts (`artifact:placementInputs@v1`) rather than engine reads or global flags.

### 4.4 State & Caching Rules
- **REQ-NAR-11:** Story entries are stored within `MapGenContext.artifacts`. Any caching of derived views must be context-owned and keyed to the run; no module-level or cross-run caches are allowed.

## 5. Success Criteria

- The standard mod expresses narrative derivation and injectors as normal steps that publish/require the narrative artifact family.
- Recipes that omit narrative run without hidden fallbacks; recipes that include narrative consumers fail to compile if publishers are missing.
- No `StoryTags` or global narrative registries remain; all narrative queries route through context-scoped artifacts.

## 6. Dependencies & References

- `SPEC-target-architecture-draft.md` §1.5–§1.6.  
- `PRD-target-registry-and-tag-catalog.md` (artifact IDs and schemas).  
- `PRD-target-context-and-dependency-contract.md` (context storage/caching rules).  
- `PRD-target-task-graph-runtime.md` (recipe enablement/compilation).
