# Inventory: Mapgen + Engine-Refactor v1 Doc Archive Planning

## Scope and classification key
- Scope: docs related to mapgen and the engine-refactor v1 project.
- Exclusions: issue docs under `docs/projects/engine-refactor-v1/issues/` and already archived material under `docs/_archive/**` or `docs/system/libs/mapgen/_archive/**`.

Classification key:
- Canonical / active
- Archived (in _archive/)
- Log / ongoing
- Candidate for archive
- Mixed (needs a call)
- Delete (decided; pending removal)
- Deleted (removed)

## Inventory

### Engine-refactor v1 project docs

Project overview, milestones, and indexes:

| Path | Description | Classification |
| --- | --- | --- |
| `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md` | Project directional doc and entry point. | Canonical / active |
| `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md` | Active milestone scope and planning. | Canonical / active |
| `docs/projects/engine-refactor-v1/m4-prework-index.md` | Prework index for M4 issues. | Canonical / active |
| `docs/projects/engine-refactor-v1/milestones/_archive/M1-TS-typescript-migration.md` | M1 milestone doc. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/milestones/_archive/M2-stable-engine-slice.md` | M2 milestone doc. | Archived (in _archive/) |

Decision status (milestones):
- [ARCHIVED] `docs/projects/engine-refactor-v1/milestones/_archive/M1-TS-typescript-migration.md`
- [ARCHIVED] `docs/projects/engine-refactor-v1/milestones/_archive/M2-stable-engine-slice.md`

Reviews and checkpoints:

| Path | Description | Classification |
| --- | --- | --- |
| `docs/projects/engine-refactor-v1/checkpoints/CHECKPOINT-M4-2025-12-19.md` | Snapshot checkpoint for M4 planning. | Deleted (removed) |
| `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M4-tests-validation-cleanup.md` | Review notes for M4 milestone scope. | Archived (in _archive/; salvage check) |
| `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-CIV-M4-ADHOC-modularize.md` | Review notes for modularization work. | Archived (in _archive/; salvage check) |
| `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M2-stable-engine-slice.md` | Review notes for M2 milestone. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M-TS-typescript-migration-remediation.md` | Review notes for M-TS remediation. | Archived (in _archive/) |

Decision status (reviews + checkpoint):
- [ARCHIVED] `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M2-stable-engine-slice.md`
- [ARCHIVED] `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M-TS-typescript-migration-remediation.md`
- [ARCHIVED] `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M4-tests-validation-cleanup.md` (salvage: still-open risk/acceptance notes)
- [ARCHIVED] `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-CIV-M4-ADHOC-modularize.md` (salvage: modularization scope/risk notes)
- [DELETED] `docs/projects/engine-refactor-v1/checkpoints/CHECKPOINT-M4-2025-12-19.md`

Resources (specs, PRDs, spikes, contracts, status):

| Path | Description | Classification |
| --- | --- | --- |
| `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` | Target architecture spec for refactor. | Canonical / active |
| `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` | Target architecture spike context (working notes; canonical target lives in the SPEC). | Canonical / active |
| `docs/projects/engine-refactor-v1/resources/PRD-pipeline-refactor.md` | Pipeline refactor PRD. | Canonical / active |
| `docs/projects/engine-refactor-v1/resources/PRD-config-refactor.md` | Config refactor PRD. | Canonical / active |
| `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md` | Plate generation PRD. | Canonical / active |
| `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` | Foundation context contract reference. | Canonical / active |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-orchestrator-indirection-audit.md` | Orchestrator boundary audit notes (superseded by SPEC/M4; salvage legacy touchpoints + hybrid map). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-mapgen-terrain-feature-verification.md` | Terrain/feature verification for a specific script (historical). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-story-drift-legacy-path-removal.md` | Legacy path removal spike (superseded; salvage legacy toggle/shim callsites). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-story-config-typing.md` | Story config typing spike (superseded by config refactor planning). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-config-refactor-design.md` | Pipeline config refactor design spike (superseded by PRD-config-refactor). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-mapgen-docs-inventory-pre-refactor.md` | Pre-refactor mapgen docs inventory. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-orchestrator-bloat-assessment.md` | Orchestrator bloat assessment (superseded; salvage RNG/WorldModel cut notes if needed). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-architecture-review.md` | Foundation stage architecture review (historical exploration). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-architecture-review-alt.md` | Alternate foundation stage review (empty). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-design-physics.md` | Foundation stage physics design notes (historical exploration). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-parity-matrix.md` | M-TS parity checklist. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-typescript-migration-parity-notes.md` | M-TS parity notes and gaps. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/_archive/config-wiring-status.md` | Config wiring status notes (legacy MapGenConfig wiring map). | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.json` | Slide deck for mapgen pipeline. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.outline.md` | Slide outline for mapgen pipeline. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.json` | Slide deck for plate generation. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.outline.md` | Slide outline for plate generation. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.json` | Slide deck for earth physics systems. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.outline.md` | Slide outline for earth physics systems. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/m3-core-engine-refactor-config-evolution.json` | Slide deck for M3 config evolution milestone. | Archived (in _archive/) |
| `docs/projects/engine-refactor-v1/resources/slides/_archive/m3-core-engine-refactor-config-evolution.outline.md` | Slide outline for M3 config evolution milestone. | Archived (in _archive/) |

Moved to temp project (repo-level spikes; not Engine-refactor v1 scope):
- `docs/projects/temp/SPIKE-bun-migration-feasibility.md`
- `docs/projects/temp/SPIKE-ruler-global-and-repo-rules.md`

Decision status (resources):
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-parity-matrix.md`
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-typescript-migration-parity-notes.md`
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/_archive/config-wiring-status.md` (salvage missing wiring items)
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.json`
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.outline.md`
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.json`
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.outline.md`
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.json`
- [ARCHIVED] `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.outline.md`

Logs / ongoing:

| Path | Description | Classification |
| --- | --- | --- |
| `docs/projects/engine-refactor-v1/triage.md` | Ongoing triage log. | Log / ongoing |
| `docs/projects/engine-refactor-v1/deferrals.md` | Deferrals log with triggers. | Log / ongoing |
| `docs/projects/engine-refactor-v1/status.md` | Rolling status notes. | Log / ongoing |

### Mapgen system docs

Mapgen library docs:

| Path | Description | Classification |
| --- | --- | --- |
| `docs/system/libs/mapgen/architecture.md` | Mapgen architecture overview. | Canonical / active |
| `docs/system/libs/mapgen/foundation.md` | Foundation layer overview. | Canonical / active |
| `docs/system/libs/mapgen/narrative.md` | Narrative layer overview. | Canonical / active |
| `docs/system/libs/mapgen/ecology.md` | Ecology layer overview. | Canonical / active |
| `docs/system/libs/mapgen/morphology.md` | Morphology layer overview. | Canonical / active |
| `docs/system/libs/mapgen/hydrology.md` | Hydrology layer overview. | Canonical / active |
| `docs/system/libs/mapgen/adrs/index.md` | Mapgen ADR index. | Canonical / active |
| `docs/system/libs/mapgen/adrs/adr-001-era-tagged-morphology.md` | ADR: era-tagged morphology. | Canonical / active |
| `docs/system/libs/mapgen/adrs/adr-002-typebox-format-shim.md` | ADR: typebox format shim. | Canonical / active |

Mapgen research spikes:

| Path | Description | Classification |
| --- | --- | --- |
| `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md` | Feature inventory spike. | Mixed (needs a call) |
| `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md` | Earth physics modeling spike. | Mixed (needs a call) |
| `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md` | Alternate earth physics modeling spike. | Mixed (needs a call) |
| `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md` | Synthesis spike for earth physics systems. | Mixed (needs a call) |

Swooper maps mod docs:

| Path | Description | Classification |
| --- | --- | --- |
| `docs/system/mods/swooper-maps/architecture.md` | Mod architecture overview. | Canonical / active |
| `docs/system/mods/swooper-maps/vision.md` | Mod vision and goals. | Canonical / active |
| `docs/system/mods/swooper-maps/adrs/index.md` | Mod ADR index. | Canonical / active |
| `docs/system/mods/swooper-maps/adrs/adr-002-plot-tagging-adapter.md` | ADR: plot tagging adapter. | Canonical / active |

### Repo-level docs referencing mapgen / engine-refactor

| Path | Description | Classification |
| --- | --- | --- |
| `docs/SYSTEM.md` | Repo system overview; references mapgen/refactor. | Canonical / active |
| `docs/PROCESS.md` | Repo process overview; references refactor workflow. | Canonical / active |
| `docs/ROADMAP.md` | Repo roadmap; references engine-refactor milestones. | Canonical / active |
| `docs/system/ARCHITECTURE.md` | System architecture overview; mentions mapgen. | Canonical / active |
| `docs/system/TESTING.md` | Testing overview; references mapgen tests. | Canonical / active |
| `docs/system/DEFERRALS.md` | System deferrals log; includes mapgen items. | Log / ongoing |
| `docs/repomix-output_docs.xml` | Generated docs dump (removed). | Deleted (removed) |

## Archive recommendations

Full archive (no salvage expected):
- `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-parity-matrix.md` (decided)
- `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-typescript-migration-parity-notes.md` (decided)
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-mapgen-docs-inventory-pre-refactor.md`
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-mapgen-terrain-feature-verification.md` (decided)
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-config-refactor-design.md` (decided)
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-story-config-typing.md` (decided)
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-architecture-review.md` (decided)
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-architecture-review-alt.md` (decided)
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-design-physics.md` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.json` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.outline.md` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.json` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.outline.md` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.json` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.outline.md` (decided)
- `docs/projects/engine-refactor-v1/milestones/_archive/M1-TS-typescript-migration.md` (decided)
- `docs/projects/engine-refactor-v1/milestones/_archive/M2-stable-engine-slice.md` (decided)
- `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M2-stable-engine-slice.md` (decided)
- `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M-TS-typescript-migration-remediation.md` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/m3-core-engine-refactor-config-evolution.json` (decided)
- `docs/projects/engine-refactor-v1/resources/slides/_archive/m3-core-engine-refactor-config-evolution.outline.md` (decided)

Archive + partial salvage:
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-orchestrator-indirection-audit.md`
  - Salvage: current vs target matrix, hybrid topology map, legacy touchpoints list.
  - Likely home: M4 pipeline cutover issues or M4 milestone Triage.
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-story-drift-legacy-path-removal.md`
  - Salvage: legacy toggle/shim callsites and removal checklist.
  - Likely home: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-pipeline-cutover-3-remove-legacy-ordering.md` or M4 Triage.
- `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-orchestrator-bloat-assessment.md`
  - Salvage: RNG standardization policy and WorldModel cut acceptance criteria.
  - Likely home: engine-boundary cleanup work or foundation PRD follow-ups.
- `docs/projects/engine-refactor-v1/resources/_archive/config-wiring-status.md`
  - Salvage: missing wiring items and ownership notes still relevant to PIPELINE-4.
  - Likely home: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-pipeline-cutover-4-step-config-schemas.md` or M4 Triage.
- `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M4-tests-validation-cleanup.md`
  - Decision: archive after salvage check.
  - Salvage: any still-open risk or acceptance notes (if not already carried into M4).
  - Likely home: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Triage).
- `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-CIV-M4-ADHOC-modularize.md`
  - Decision: archive after salvage check.
  - Salvage: concrete modularization scope details and any still-relevant risks.
  - Likely home: M4 pipeline or tag registry cutover issues.
- `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md`
  - Salvage: feature inventory relevant to current mapgen docs.
  - Likely home: `docs/system/libs/mapgen/architecture.md` or `docs/system/libs/mapgen/ecology.md`.
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md`
  - Salvage: conceptual models still used in morphology/foundation docs.
  - Likely home: `docs/system/libs/mapgen/morphology.md` or `docs/system/libs/mapgen/foundation.md`.
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`
  - Salvage: any unique alternative models still referenced.
  - Likely home: `docs/system/libs/mapgen/morphology.md`.
- `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
  - Salvage: synthesis framing if still referenced.
  - Likely home: `docs/system/libs/mapgen/architecture.md`.

Deleted (removed from repo):
- `docs/projects/engine-refactor-v1/checkpoints/CHECKPOINT-M4-2025-12-19.md`
- `docs/repomix-output_docs.xml`

## Clean-slate view (going into M4)

Core canonical docs to keep front-and-center:
- `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`
- `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`
- `docs/projects/engine-refactor-v1/m4-prework-index.md`
- `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
- `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md`
- `docs/projects/engine-refactor-v1/resources/PRD-pipeline-refactor.md`
- `docs/projects/engine-refactor-v1/resources/PRD-config-refactor.md`
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/narrative.md`
- `docs/system/libs/mapgen/ecology.md`
- `docs/system/libs/mapgen/morphology.md`
- `docs/system/libs/mapgen/hydrology.md`
- `docs/system/libs/mapgen/adrs/index.md`
- `docs/system/libs/mapgen/adrs/adr-001-era-tagged-morphology.md`
- `docs/system/libs/mapgen/adrs/adr-002-typebox-format-shim.md`
- `docs/system/mods/swooper-maps/architecture.md`
- `docs/system/mods/swooper-maps/vision.md`
- `docs/system/mods/swooper-maps/adrs/index.md`
- `docs/system/mods/swooper-maps/adrs/adr-002-plot-tagging-adapter.md`
- `docs/SYSTEM.md`
- `docs/PROCESS.md`
- `docs/ROADMAP.md`
- `docs/system/ARCHITECTURE.md`
- `docs/system/TESTING.md`

Archive list (proposed):
- Full archive:
  - `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-parity-matrix.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/_archive/STATUS-M-TS-typescript-migration-parity-notes.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-mapgen-docs-inventory-pre-refactor.md`
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-mapgen-terrain-feature-verification.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-config-refactor-design.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-story-config-typing.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-architecture-review.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-architecture-review-alt.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-pipeline-foundation-stage-design-physics.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.json` (decided)
  - `docs/projects/engine-refactor-v1/resources/slides/_archive/map-generation-pipeline.outline.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.json` (decided)
  - `docs/projects/engine-refactor-v1/resources/slides/_archive/voronoi-plate-generation.outline.md` (decided)
  - `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.json` (decided)
  - `docs/projects/engine-refactor-v1/resources/slides/_archive/earth-physics-systems-modeling.outline.md` (decided)
  - `docs/projects/engine-refactor-v1/milestones/_archive/M1-TS-typescript-migration.md` (decided)
  - `docs/projects/engine-refactor-v1/milestones/_archive/M2-stable-engine-slice.md` (decided)
  - `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M2-stable-engine-slice.md` (decided)
  - `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M-TS-typescript-migration-remediation.md` (decided)
- Archive + salvage:
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-orchestrator-indirection-audit.md`
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-story-drift-legacy-path-removal.md`
  - `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-orchestrator-bloat-assessment.md`
  - `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M4-tests-validation-cleanup.md`
  - `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-CIV-M4-ADHOC-modularize.md`
  - `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md`
  - `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md`
  - `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`
  - `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
- Deleted (removed):
  - `docs/projects/engine-refactor-v1/checkpoints/CHECKPOINT-M4-2025-12-19.md`
  - `docs/repomix-output_docs.xml`

Notes:
- Any doc marked "Mixed (needs a call)" should be reviewed for current use before archiving.
- Log/ongoing docs (`triage.md`, `deferrals.md`, `status.md`) should remain active and are not archive candidates.
