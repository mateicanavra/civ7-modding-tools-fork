# Phase 2 Modeling Spike (Template)

## Purpose

Define the authoritative, first-principles model for the domain and lock the target contract surfaces.

## Scope guardrails

- This is model-first. Do not include slice planning here.
- Compatibility surfaces must not live in this domain. If transitional compat is required, it must be downstream-owned and explicitly deprecated.

## Required output

- `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-modeling.md`

## Authoritative posture (enforced)

Architecture posture:
- Ops are atomic (no op-calls-op).
- Composition happens in steps/stages.
- Rules are policy units imported into ops/strategies; avoid generic helper drift.

Earth-physics grounding:
- Model from first principles using the domain spec and architecture docs.
- Legacy behavior is not sacred; discard incoherent behavior unless a constraint requires it.
- If preserving legacy is intentional, record it as a “kept legacy invariant” with rationale.

Cross-pipeline posture:
- The domain model lives inside a pipeline; contract changes must be coherent end-to-end.
- Plan upstream/downstream contract changes through stage-owned artifact contracts.

## Research discipline (required passes)

- Architecture alignment: reconcile the model with target SPEC/ADR docs and record any conflicts or constraints.
- Authority stack: list which docs are canonical vs supporting; label PRDs as non-authoritative algorithmic inputs.
- Earth-physics grounding: model from first principles using domain + earth-physics references; use external sources if needed and cite them in the spike.
- Pipeline intake: review upstream authoritative inputs and downstream consumer expectations; document adopted inputs, legacy reads to delete, and required downstream changes.
- Model articulation: write a concise conceptual narrative and include diagrams (architecture view, data-flow, producer/consumer map with current vs target pipeline adjustments).
- Codebase evidence: use MCP/code-intel + repo searches to validate current surfaces and invariants; link evidence in decisions.

## Iteration discipline (required loop)

Repeat this loop until the model stabilizes (minimum two passes):
1. Broad pipeline sweep: what upstream produces today vs should produce; what downstream needs today vs should need. Note legacy shims and compat reads.
2. Domain deep dive: synthesize domain research, specs, and code evidence into a draft model.
3. Synthesis pass: draft the canonical model, target contracts, pipeline deltas, and diagrams.
4. Fractal refinement: ask if the model should be decomposed further, if boundaries should change, or if consumers need alternate shapes. Update the model and diagrams.
5. Convergence: record what changed and why in the iteration log; explain why the model is now stable.

## Required sections (minimum)

- Canonical model + causality spine
- Conceptual narrative + diagrams (architecture view, data-flow, producer/consumer map; include current vs target pipeline adjustments)
- Target contract matrix (buffers/artifacts/overlays classification)
- Legacy disposition ledger (every config property/rule/function is keep/kill/migrate with rationale)
- Upstream authoritative input selection (adopted inputs + legacy reads to delete)
- Upstream handoff cleanup (remove upstream-introduced compat/legacy surfaces in this domain)
- Downstream consumer impact scan (current usage + required changes)
- Architecture alignment note (SPEC/ADR constraints and resolutions)
- Authority stack (canonical vs supporting references; PRDs labeled non-authoritative)
- Decisions + defaults (modeling decisions)
- Risk register (modeling risks)
- Golden path (authoritative)
- Projection policy (explicitly non-canonical)
- Pipeline delta list (upstream/downstream contract changes implied by the model)
- Research sources (external references used for modeling, if any)
- Iteration log (pass #, changes made, and why the model stabilized)

## Additional required updates

- Update the domain modeling reference doc:
  - `docs/system/libs/mapgen/<domain>.md`

## Gate checklist (Phase 2 completion)

- Target op catalog is deterministic and complete (no alternate models).
- Buffer/artifact/overlay distinctions match `docs/system/libs/mapgen/architecture.md`.
- Pipeline delta list names downstream consumers that must adapt.
- Conceptual narrative and diagrams exist and align with the target model.
- No slice plan content is present (that belongs to Phase 3).
- Legacy disposition ledger is complete; any kept legacy invariants are explicit and justified.
- Upstream authoritative input selection is explicit; legacy upstream reads are flagged for removal.
- Upstream handoff cleanup is explicit; no upstream compat/legacy surfaces remain in this domain.
- Downstream consumer impact scan is explicit and complete.
- Architecture alignment note exists and conflicts are reconciled or escalated.
- Authority stack is explicit; PRDs are labeled non-authoritative.
- Research sources are cited when external research is used.
- Iteration log exists; at least two modeling passes (or a justified single-pass exception).

## References

- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md`
- `docs/system/libs/mapgen/architecture.md`
