## XML-first crawl plan (temporary)

This document outlines a pragmatic XML-first approach to build deep relationship graphs from the official Civ VII resources without requiring the compiled DB.

### Objectives
- **Depth**: Resolve Trait → Modifier → RequirementSet → Requirement → Arguments chains, plus cross-links (Units, Improvements, Buildings, etc.).
- **Provenance**: Keep file paths for each node to enable manifest slicing.
- **Portability**: No external binaries. Works on the raw XML resources.
- **Performance**: Scalable to the full resources folder with reasonable memory/latency.

### Sources to index
- **Database XML** (classic): `<Database><Table><Row .../></Table></Database>`
  - Examples: `Leaders`, `Civilizations`, `Traits`, `LeaderTraits`, `CivilizationTraits`, `TraitModifiers`, `Units`, `Buildings`, etc.
- **GameEffects XML**: `<GameEffects><Modifier ...> ... </Modifier></GameEffects>`
  - Contains the bulk of gameplay logic. Must be normalized into our unified data model.
- Optional (later): SQL files that `INSERT/DELETE/UPDATE` gameplay tables.

### Unified data model
- Node identity: `NodeKey = { table: string, id: string }`.
- Primary keys: keep a per-table PK map; for synthesized nodes, use deterministic IDs.
- Tables (real + synthesized):
  - Real: `Leaders`, `Civilizations`, `Traits`, `LeaderTraits`, `CivilizationTraits`, `TraitModifiers`, `Modifiers`, `ModifierArguments`, `RequirementSets`, `RequirementSetRequirements`, `Requirements`, `RequirementArguments`, `Units`, `Buildings`, `Districts`, `Improvements`, `Resources`, `Technologies`, `Civics`, etc.
  - Synthesized (from GameEffects):
    - `Modifiers` from `<Modifier id="..." collection="..." effect="..." permanent="...">`.
    - `ModifierArguments` from child `<Argument name="..." value?="...">`.
    - `RequirementSets`/`Requirements`/`RequirementArguments` from `<SubjectRequirements>` / `<OwnerRequirements>` blocks.
    - Attach chains via `Argument name="ModifierId"` that reference other modifiers.

### Indexing strategy (two-pass)
1) Parse pass (build indices)
   - Walk resources dir; parse XML.
   - Database XML: collect tables and rows; index by column values; record `__file` provenance.
   - GameEffects XML: normalize into synthetic rows:
     - Emit one `Modifiers` row per `<Modifier>` (`ModifierId = @id`).
     - For each `<Argument name=...>` emit a `ModifierArguments` row: `{ ModifierId, Name, Value }` (use attributes or inner text; keep both if present).
     - For requirements blocks, synthesize `RequirementSets` + `RequirementSetRequirements` + `Requirements` + `RequirementArguments`:
       - Deterministic IDs, e.g. `REQSET_{ModifierId}_SUBJECT`, `REQ_{ModifierId}_SUBJECT_{seq}`; same for OWNER.
       - Link the generated set back to the modifier via `SubjectRequirementSetId`/`OwnerRequirementSetId` on the synthesized `Modifiers` row.
     - For nested attach: if an `Argument` has `Name="ModifierId"`, record an edge target `Modifiers` with that value.
   - Apply remove/override semantics:
     - Respect `<Delete .../>` rows in Database XML (e.g., `remove-data.xml`).
     - Last-write-wins by ID across files (Base < DLC), but keep file provenance of the winner.

2) Link pass (graph build)
   - Create edges only where targets exist; prune dangling references.
   - Edge rules (non-exhaustive initial set):
     - `LeaderTraits(LeaderType) → Leaders`
     - `LeaderTraits(TraitType) → Traits`
     - `CivilizationTraits(CivilizationType) → Civilizations`
     - `CivilizationTraits(TraitType) → Traits`
     - `TraitModifiers(TraitType) → Traits`
     - `TraitModifiers(ModifierId) → Modifiers`
     - `Modifiers(SubjectRequirementSetId|OwnerRequirementSetId) → RequirementSets`
     - `RequirementSets → RequirementSetRequirements → Requirements → RequirementArguments`
     - `ModifierArguments(Name=BuildingType|UnitType|ImprovementType|DistrictType|ResourceType|TechnologyType|CivicType|AgendaType) → target tables`
     - `ModifierArguments(Name=ModifierId, Value=...) → Modifiers` (attach chain)

### Layering & deletes
- Implement minimal merge logic sufficient to avoid ghost nodes:
  - Apply `<Delete>` from Database XML.
  - On duplicate PK: use the last parsed row (deterministic traversal order: Base first, then DLC; within a directory, lexicographic).
  - After link pass, drop edges pointing to non-existent nodes.

### Provenance & manifest
- Every row carries `__file` (source path). Graph manifest is `unique(files(nodes))`.
- `slice` copies files relative to config `extract_path` into a destination for smaller reproductions.

### Performance
- Concurrency: async directory walk + parse with a small pool (e.g., 8–16 files at a time).
- Memory: store compact row objects; avoid duplicating large text fields.
- Indexes: per-table column maps (`Map<column, Map<value, Row[]>>`) for fast joins.

### CLI integration
- `civ7 crawl <seed>`: uses config `unzip.extract_path` by default; outputs to `out/<seed>`.
- `civ7 render <seed>|<dotPath>`: renders DOT → SVG via WASM Graphviz.
- `civ7 slice <manifestPath>`: copies only the files listed by manifest.

### Milestones
- Phase 1: GameEffects normalization (Modifiers + Arguments + basic Subject/Owner requirement sets).
- Phase 2: Attach chains (ModifierId argument → Modifiers), full RequirementArguments coverage.
- Phase 3: Column-to-table cross-link map expansion (Buildings, Improvements, Units, etc.).
- Phase 4: Remove-data + last-write-wins layering; edge pruning.
- Phase 5: Performance and logging (counts, timings, skipped files).
- Phase 6: Documentation & examples (ROME, GENGHIS seeds).

### Non-goals
- Evaluating effects or simulating gameplay.
- Building a full relational DB state. We only resolve identifiers and edges.

### Risks & mitigations
- Variant attribute names (e.g., `ModifierID` vs `ModifierId`): normalize keys case-insensitively.
- Mixed shapes (text vs attributes for values): support both and prefer attributes when present.
- Future schema drift: guard with best-effort parsing and continue on per-file failures.

### Acceptance criteria
- Crawling `CIVILIZATION_ROME` yields edges from Traits to the `TRAIT_MOD_TWELVE_TABLES_*` modifiers and their attached modifiers + requirement sets.
- Manifest contains all GameEffects files responsible for the linked modifiers.
- Rendered SVG shows multiple layers beyond Trait-level nodes.


