# Salvage candidates: Engine-refactor v1

## From: docs/projects/engine-refactor-v1/resources/SPIKE-orchestrator-indirection-audit.md

- Archive decision: Archive + salvage
- Why this content was considered for salvage:
  - Audit of MapOrchestrator indirection and pipeline transition state, including current vs target mapping and known legacy touchpoints.
  - Useful for M4 cutover work and for verifying where legacy surfaces still exist.
- Salvage candidates:
  - Current vs target matrix and the hybrid topology map for MapOrchestrator/TaskGraph.
  - Enumerated legacy touchpoints (stage enablement, story toggles, state:engine.* dependencies) that should be eliminated in M4.
  - Any explicit list of open architectural gaps or missing contracts that still affect cutover sequencing.
- Notes:
  - This is a shortlist of possible salvage candidates; not all of this needs to be carried forward.

## From: docs/projects/engine-refactor-v1/resources/SPIKE-story-drift-legacy-path-removal.md

- Archive decision: Archive + salvage
- Why this content was considered for salvage:
  - Detailed analysis of legacy orchestration, story toggle surfaces, and concrete removal plan.
  - Contains explicit callsites and migration grouping that can inform M4 cleanup issues.
- Salvage candidates:
  - List of legacy toggle/shim callsites and the removal checklist (e.g., toggles, legacy steps, legacy bootstrap shapes).
  - Internal consumer inventory (mods/tests/docs) that still exercise the legacy path.
  - Risk/mitigation notes around removing the dual orchestration path and story toggles.
- Notes:
  - This is a shortlist of possible salvage candidates; not all of this needs to be carried forward.

## From: docs/projects/engine-refactor-v1/resources/SPIKE-orchestrator-bloat-assessment.md

- Archive decision: Archive + salvage
- Why this content was considered for salvage:
  - Assesses MapOrchestrator bloat and locks the WorldModel cut plan with explicit acceptance criteria and RNG policy.
  - Still useful for engine-boundary cleanup and foundation transition sequencing.
- Salvage candidates:
  - WorldModel cut acceptance criteria (single producer in foundation; no orchestrator init path; consumers off WorldModel).
  - RNG standardization policy (adapter-based RNG only; no Math.random or direct TerrainBuilder usage in mapgen-core).
  - Bridge strategy notes on keeping `ctx.foundation` as a compatibility boundary while moving computation into steps.
- Notes:
  - This is a shortlist of possible salvage candidates; not all of this needs to be carried forward.

## From: docs/projects/engine-refactor-v1/resources/config-wiring-status.md

- Archive decision: Archive + salvage
- Why this content was considered for salvage:
  - Detailed wiring map of MapGenConfig schema fields to current TS consumption, including legacy-only and untyped usage.
  - Useful for PIPELINE-4 (per-step config schemas) and for removing legacy config surfaces.
- Salvage candidates:
  - The list of missing or partial wiring items that must be addressed in the new config schema plumbing.
  - Legacy-only toggles/fields and any untyped-but-consumed keys that should be formalized or removed.
  - Any warnings about stageConfig/stageManifest/legacy toggles that could affect cutover.
- Notes:
  - This is a shortlist of possible salvage candidates; not all of this needs to be carried forward.

## From: docs/projects/engine-refactor-v1/reviews/REVIEW-M4-tests-validation-cleanup.md

- Archive decision: Archive + salvage
- Why this content was considered for salvage:
  - Review notes for the M4 tests/validation/cleanup milestone that may include still-open acceptance criteria or risks.
  - Potentially informs the M4 Triage or safety-net scope.
- Salvage candidates:
  - Any still-open risk items, acceptance criteria, or test gaps not already reflected in the M4 milestone/Triage.
  - Notes about CI wiring or validation expectations that could affect M4 execution.
- Notes:
  - This is a shortlist of possible salvage candidates; not all of this needs to be carried forward.

## From: docs/projects/engine-refactor-v1/reviews/REVIEW-CIV-M4-ADHOC-modularize.md

- Archive decision: Archive + salvage
- Why this content was considered for salvage:
  - Modularization review notes that may include concrete scope, risks, and sequencing constraints.
  - Potentially informs pipeline/tag-registry cutover work.
- Salvage candidates:
  - Specific modularization scope details and any explicit risk notes that are not yet captured in M4.
  - Any dependency notes that affect pipeline cutover or registry/tag validation work.
- Notes:
  - This is a shortlist of possible salvage candidates; not all of this needs to be carried forward.
