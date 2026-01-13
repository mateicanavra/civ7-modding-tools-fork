# Phase 2 Modeling Spike (Template)

Purpose: define the authoritative, first-principles model for the domain and lock the target contract surfaces.

Scope guardrails:
- This is model-first. Do not include slice planning here.
- If a compatibility surface conflicts with the model, the model wins.

Required output:
- `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-modeling.md`

Modeling posture (enforced):
- Ops are atomic (no op-calls-op).
- Composition happens in steps/stages.
- Rules are policy units imported into ops/strategies; avoid generic helper drift.

Earth-physics grounding (required):
- Model from first principles using the domain spec and architecture docs.
- Legacy behavior is not sacred; discard incoherent behavior unless a constraint requires it.
- If preserving legacy is intentional, record it as a “kept legacy invariant” with rationale.

Cross-pipeline posture (required):
- The domain model lives inside a pipeline; contract changes must be coherent end-to-end.
- Plan upstream/downstream contract changes through stage-owned artifact contracts.

Required sections (minimum):
- Canonical model + causality spine
- Target contract matrix (buffers/artifacts/overlays classification)
- Legacy disposition ledger (every config property/rule/function is keep/kill/migrate with rationale)
- Upstream authoritative input selection (adopted inputs + legacy reads to delete)
- Decisions + defaults (modeling decisions)
- Risk register (modeling risks)
- Golden path (authoritative)
- Projection policy (explicitly non-canonical)
- Pipeline delta list (upstream/downstream contract changes implied by the model)

Additional required updates:
- Update the domain modeling reference doc:
  - `docs/system/libs/mapgen/<domain>.md`

Gate checklist (Phase 2 completion):
- Target op catalog is deterministic and complete (no alternate models).
- Buffer/artifact/overlay distinctions match `docs/system/libs/mapgen/architecture.md`.
- Pipeline delta list names downstream consumers that must adapt.
- No slice plan content is present (that belongs to Phase 3).
- Legacy disposition ledger is complete; any kept legacy invariants are explicit and justified.
- Upstream authoritative input selection is explicit; legacy upstream reads are flagged for removal.

References:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md`
- `docs/system/libs/mapgen/architecture.md`
