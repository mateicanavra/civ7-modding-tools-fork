# PRD: Target Registry & Tag Catalog (Artifacts, Buffers, Effects)

## 1. Purpose

Define the canonical registry contract and tag inventory for the target MapGen architecture. This PRD captures the mod-instantiated registry rules, tag types, and the end-state catalog of artifacts/buffers/effects specified in `SPEC-target-architecture-draft.md`.

## 2. Scope

**In scope**
- Registry construction and validation rules (uniqueness, fail-fast collisions, unknown references).
- Tag kinds (`buffer:*`, `artifact:*`, `effect:*`) and ownership metadata.
- Canonical target tag inventory across phases (foundation → placement), including versioning expectations.

**Out of scope**
- Execution semantics and dependency satisfaction (see `PRD-target-context-and-dependency-contract.md`).
- Recipe compilation/runtime behavior (see `PRD-target-task-graph-runtime.md`).
- Narrative optionality/consumption patterns (see `PRD-target-narrative-and-playability.md`).

## 3. Goals

1) A single, mod-instantiated registry per mod that enumerates all tags and steps, with hard errors for duplicates or unknown references.  
2) Typed, versioned artifact contracts and explicit buffer/effect tags to make dependencies visible and schedulable.  
3) A canonical tag inventory covering foundation, morphology, hydrology, ecology, narrative/playability, and placement surfaces, aligned with accepted decisions (3.3–3.8).

## 4. Requirements

### 4.1 Registry Rules
- **REQ-REG-1:** Each mod constructs exactly one registry containing all tags and steps. Registries enforce uniqueness for `tag.id` and `step.id`; duplicates fail registry creation.
- **REQ-REG-2:** Steps must reference only registered tags in `requires/provides`; unknown IDs are compile-time errors.
- **REQ-REG-3:** Tag definitions include `id`, `kind` (`buffer`/`artifact`/`effect`), `owner` (package + optional phase), and optional `schema`/`demo` payloads. Artifact tags require schemas and must publish immutable values; buffers/effects may omit schemas in v1 but should declare them when stable.
- **REQ-REG-4:** Effect tags are first-class citizens in the registry (visible alongside artifacts/buffers) and participate in dependency validation.
- **REQ-REG-5:** Demo payloads, when present, must be schema-valid and safe defaults.

### 4.2 Canonical Tag Inventory (Target)
- **Foundation artifacts:** `artifact:foundation.mesh`, `artifact:foundation.crust`, `artifact:foundation.plateGraph`, `artifact:foundation.tectonics`.
- **Morphology:** `artifact:terrainMask`, `artifact:erosion`, `artifact:sediment`; `buffer:heightfield`.
- **Hydrology:** `artifact:riverAdjacency`; `buffer:climateField`, `buffer:rainfall`, `buffer:temperature`.
- **Ecology:** `artifact:soils`, `artifact:biomes`, `artifact:resources`, `artifact:features`; `buffer:biomes`, `buffer:features`.
- **Narrative/playability:** story entries published as `artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`; views are derived on demand.
- **Placement:** `artifact:placementInputs@v1`, `artifact:placementOutputs`.
- **Effects:** `effect:engine.heightfieldApplied`, `effect:engine.featuresApplied`.
- **Deferred inventory:** `artifact:riverGraph` remains deferred; `artifact:riverAdjacency` stays canonical until an accepted replacement lands.

### 4.3 Versioning & Ownership
- **REQ-REG-6:** Artifact IDs must encode versions where schema compatibility matters (`@v1`, `@v2`, ...). New versions are new tag IDs; backward-incompatible changes do not mutate existing IDs.
- **REQ-REG-7:** Tag ownership is explicit (`owner.pkg` + optional `owner.phase`) and must reflect the mod/package that defines the tag, not the consumer.

## 5. Success Criteria

- Registry construction fails fast on duplicate tags/steps or unknown tag references in any step.
- The standard mod registry enumerates the full canonical inventory above, with explicit versioning where specified.
- Effect tags are visible in registry output and can be required/provided like artifacts/buffers.
- Future mods can extend the catalog by adding new tags/steps while still relying on the same validation rules.

## 6. Dependencies & References

- `SPEC-target-architecture-draft.md` (phase ownership, registry rules, and tag lists).  
- `PRD-target-task-graph-runtime.md` (recipes reference registry IDs).  
- `PRD-target-context-and-dependency-contract.md` (how tags map to context storage and satisfaction).  
- `PRD-target-narrative-and-playability.md` (narrative artifact expectations).
