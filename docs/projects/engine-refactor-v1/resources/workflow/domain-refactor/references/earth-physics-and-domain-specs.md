# Earth Physics Research + Domain Specs (Reference)

This reference exists so Phase 2 (“modeling spike”) is grounded in:
- **Earth physics** (what the domain represents in the real world),
- **Pipeline causality** (what upstream signals must exist before the domain can do its work),
- and a **domain-only target model** (what contracts/products exist, independent of implementation mechanics).

It also records which “research” docs are safe to treat as **inputs** today vs which should be treated as **legacy seeds** to salvage.

## Doc posture (canonical vs seed)

**Canonical / active (preferred inputs for modeling):**
- `docs/system/libs/mapgen/architecture.md` (domain layer taxonomy + responsibilities)
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/morphology.md`
- `docs/system/libs/mapgen/hydrology.md`
- `docs/system/libs/mapgen/ecology.md`
- `docs/system/libs/mapgen/narrative.md`
- `docs/system/libs/mapgen/placement.md`

**Seed / legacy research (use for ideas; do not treat as contract truth):**
- `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`
- `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md`

**Domain-specific seed (non-authoritative for architecture/contracts):**
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md` (Foundation modeling + artifacts; explicitly non-authoritative)

## Recommended consolidation targets (so these become stable workflow references)

The `SPIKE-*` docs in `docs/system/libs/mapgen/research/` are useful, but too large and too “scratchy” to treat as workflow-canonical long term.

When doing a real domain remodel, prefer **salvaging the timeless model** into canonical system docs and then treating the spikes as archival research:
- **Synthesis framing** → `docs/system/libs/mapgen/architecture.md`
- **Foundation / plates / tectonics** → `docs/system/libs/mapgen/foundation.md`
- **Morphology / geomorphology** → `docs/system/libs/mapgen/morphology.md`
- **Hydrology + climate** → `docs/system/libs/mapgen/hydrology.md`
- **Pedology + biomes + features** → `docs/system/libs/mapgen/ecology.md`
- **Civ7 gameplay constraints** (when still relevant) → the most appropriate of:
  - `docs/system/libs/mapgen/architecture.md` (cross-cutting),
  - `docs/system/libs/mapgen/<domain>.md` (domain-local),
  - or an engine-facing “constraints” doc if one is introduced later.

## Research file status (current vs superseded)

Use this table when deciding what to trust, what to mine, and what to stop citing as “truth”.

| File | Status | Superseded by | How to use it now | Recommendation |
| --- | --- | --- | --- | --- |
| `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md` | Partially outdated (pre-refactor surfaces, but strong causal pipeline framing) | `docs/system/libs/mapgen/architecture.md` + per-domain mapgen docs + engine-refactor v1 SPEC/ADR set | Use as a **seed** for causal staging and “what must exist before what”. Do not copy API surfaces/contracts verbatim. | Keep as seed; salvage enduring causal staging into `docs/system/libs/mapgen/architecture.md` as needed. |
| `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md` | Partially outdated (feature inventory; some items are Civ7-era specific and may not match current SDK constraints) | Engine-refactor v1 specs/ADRs for contract truth; extracted Civ7 resources (when present) for raw engine behavior | Use as an “engine feature / gameplay constraint” checklist while modeling domains (e.g., rivers, ages, succession). | Keep as seed; salvage only stable constraints into relevant domain docs. |
| `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md` | Partially outdated (contains useful physics domain breakdown, but not aligned to current module/contract surfaces) | `docs/system/libs/mapgen/{foundation,morphology,hydrology,ecology}.md` + engine-refactor v1 domain modeling guidelines | Use for first-principles physics descriptions, levers, and staging concepts. | Keep as seed; salvage domain-level physics into the corresponding `docs/system/libs/mapgen/<domain>.md`. |
| `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md` | Partially outdated (very detailed; strongest “first principles” content, but mixes in legacy assumptions) | Same as above | Use as the **primary earth-physics seed** for “from scratch” modeling spikes; extract only what still matches our pipeline and constraints. | Keep as seed; treat it as “research raw material”, not a contract. |
| `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md` | Partially outdated and explicitly non-authoritative | Engine-refactor v1 SPEC/ADR set for architecture; `docs/system/libs/mapgen/foundation.md` for domain-level framing | Use for Foundation-only modeling details and artifact shape candidates, but re-validate against current authoring contracts. | Keep as seed; if it diverges from the spec/ADR set, update the spec/ADR set (don’t “fix” truth by editing the PRD). |

## Per-domain modeling inputs (what to read)

These are the minimum “ground truth” docs for Phase 2 modeling work, before you decide what to delete or reshape.

### Foundation

**Primary:**
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/architecture.md`

**Seed (optional, for deeper physics modeling):**
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`

### Morphology

**Primary:**
- `docs/system/libs/mapgen/morphology.md`
- `docs/system/libs/mapgen/architecture.md`

**Seed (optional):**
- `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`

### Hydrology / Climate

**Primary:**
- `docs/system/libs/mapgen/hydrology.md`
- `docs/system/libs/mapgen/architecture.md`

**Seed (optional):**
- `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`

### Ecology

**Primary:**
- `docs/system/libs/mapgen/ecology.md`
- `docs/system/libs/mapgen/architecture.md`

**Seed (optional):**
- `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`

### Narrative

**Primary:**
- `docs/system/libs/mapgen/narrative.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/projects/engine-refactor-v1/resources/PRD-target-narrative-and-playability.md` (canonical narrative/playability contract)

**Seed (optional):**
- `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`

### Placement

**Primary:**
- `docs/system/libs/mapgen/placement.md`
- `docs/system/libs/mapgen/architecture.md` (placement layer definition)
- `docs/projects/engine-refactor-v1/resources/PRD-target-narrative-and-playability.md` (how playability/narrative signals are produced and consumed)

**Seed (optional):**
- `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md` (gameplay constraints)

Note: `docs/system/libs/mapgen/placement.md` is the canonical placement modeling input for Phase 2.
