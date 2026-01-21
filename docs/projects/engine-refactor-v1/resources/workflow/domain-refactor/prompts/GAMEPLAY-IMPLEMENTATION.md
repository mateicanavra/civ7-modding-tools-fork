<implementation_prompt>
You are implementing the Gameplay vertical domain refactor (Phases 4–5). The model is locked.
Your job is to execute the Phase 3 slice plan end-to-end, keep the pipeline green after every slice,
and delete legacy surfaces without drifting into “make it work” compatibility.

Do not start coding until you have deeply studied the authority docs listed below.

The Phase 3 Gameplay issue doc is the authoritative tracker for:
- the slice index and sequencing rationale,
- locked decisions/bans (and their guardrails),
- config semantics (meaning + default/empty/null + determinism policies),
- stable fix anchors,
- consumer migration matrix (break/fix per slice),
- acceptance criteria and verification gates.

Execution posture:
- One Graphite branch/PR per slice (or explicit subissue you carve out inside a slice).
- Each slice ends pipeline-green with migrations, deletions, docs/tests, and guardrails complete before moving on.
- No dual paths within scope. No shims/compat layers are allowed as a refactor technique; redesign the slice to migrate and delete instead.

Non-negotiable invariants (drift prevention):
- Model-first: the canonical model is the source of truth even if artifacts/projections change.
- No compat inside Gameplay: Gameplay must not publish or retain legacy compat/projection surfaces.
  Do not introduce deprecated downstream shims; migrate consumers and delete in-slice.
- Narrative overlays are forbidden in this refactor phase: remove story/narrative/overlay surfaces entirely. Replace any load-bearing ones with canonical, domain-anchored contracts and migrate consumers.
- Ops are data-pure; steps own runtime binding: no runtime views, callbacks, trace handles, or RNG functions cross the op boundary.
- RNG crosses boundaries as data only: steps pass deterministic seeds; ops build local RNGs.
- Defaults belong in schemas; derived/scaled values belong in normalize; run bodies assume normalized config and must not hide defaults.
- Hard ban: no hidden multipliers/constants/defaults (no unnamed behavior-shaping numbers in compile/normalize/run paths).
- Hard ban: no placeholders / dead bags (no empty directories, empty config bags, or future scaffolding).
- No freezing/snapshotting at publish/return boundaries to simulate immutability.
- Types follow schemas: do not hand-duplicate TS shapes when a schema exists; derive types from schemas.

Gameplay-specific execution posture (boundary discipline):
- Gameplay is an engine apply boundary; do not import Civ7 `base-standard` scripts directly inside step implementations.
  Use the EngineAdapter boundary for engine reads/writes.
- Consumer migration is contract-driven:
  - consumers should consume canonical, domain-anchored artifacts/contracts,
  - never engine adjacency as truth,
  - never story/narrative overlays.
- Stage ids are part of the author contract:
  - preserve or explicitly migrate stage ids and step ids,
  - document braid/interleaving constraints when they force boundaries.

Locked decisions must be enforced, not just written:
- Whenever you introduce or restate a locked decision/ban during implementation, it must become a guardrail (test or scan) in that same slice.
  Do not defer guardrails “until cleanup”.

Drift protocol (stop the line):
If you detect drift (preserving legacy nesting, adding hidden fallbacks, smuggling runtime concerns, collapsing steps,
authority confusion, or a spec decision changing mid-flight), stop and:
- write a short status report in the issue doc (what changed, what is in-flight, what is next),
- re-baseline slice gates/checklists in the issue doc so the new reality is explicit,
- split vague “later” work into explicit subissues and branches,
- add guardrails so the violation cannot reappear (same slice).

Paths (authority + workflow; shared root: docs/projects/engine-refactor-v1/)

Gameplay artifacts and tracker:
- issues/LOCAL-TBD-<milestone>-gameplay-*.md
- resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-greenfield.md
- resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-current-state.md
- resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-modeling.md

Workflow entrypoints:
- resources/workflow/domain-refactor/WORKFLOW.md
- resources/workflow/domain-refactor/IMPLEMENTATION.md

Core references:
- resources/workflow/domain-refactor/references/op-and-config-design.md
- resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md
- resources/workflow/domain-refactor/references/verification-and-guardrails.md
- resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md
- resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md
- resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md
- resources/workflow/domain-refactor/references/phase-3-implementation-plan.md

Gameplay evidence / context:
- docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md
- resources/workflow/domain-refactor/prompts/GAMEPLAY-CONTEXT.md
- resources/workflow/domain-refactor/plans/gameplay/ (prior art; not authoritative)

Paths (Civ7 official resources; engine interop constraints only)
- .civ7/outputs/resources/Base/modules/base-standard
</implementation_prompt>
