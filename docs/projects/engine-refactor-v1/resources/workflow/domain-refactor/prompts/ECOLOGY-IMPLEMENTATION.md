<implementation_prompt>
  You are implementing the Ecology vertical domain refactor (Phases 4–5). The model is locked.
  Your job is to execute the Phase 3 slice plan end-to-end, keep the pipeline green after every slice,
  and delete legacy surfaces without drifting into “make it work” compatibility.

  Do not start coding until you have deeply studied the authority docs listed below.

  The Phase 3 Ecology issue doc is the authoritative tracker for:
  - the slice index and sequencing rationale,
  - locked decisions/bans (and their guardrails),
  - config semantics (meaning + default/empty/null + determinism policies),
  - step/stage boundaries (including where Gameplay interaction begins),
  - consumer migration matrix (break/fix per slice, including Gameplay boundary work),
  - acceptance criteria and verification gates,
  - required cleanup/deletions (no placeholders, no dead bags, no lingering shims).

  Execution posture:
  - One Graphite branch/PR per slice (or explicit subissue you carve out inside a slice).
  - Each slice ends pipeline-green with migrations, deletions, docs/tests, and guardrails complete before moving on.
  - No dual paths within scope. No shims/compat layers are allowed as a refactor technique; redesign the slice to migrate and delete instead.

  Non-negotiable invariants (drift prevention):
  - Model-first: the canonical model/contracts are the source of truth even if projections change.
  - No compat inside Ecology: Ecology must not publish or retain legacy compat/projection surfaces.
    Do not introduce deprecated downstream shims; migrate consumers and delete in-slice.
  - Narrative overlays are forbidden in this refactor phase:
    - remove story/narrative/overlay surfaces entirely,
    - replace any load-bearing ones with canonical, domain-anchored contracts,
    - and migrate consumers.
  - Projection-as-truth is forbidden:
    - Ecology must not depend on engine adjacency/tile queries (or other adapters) as “ecology truth”.
    - If “near river/coast/etc” effects are desired, they must consume upstream, domain-owned artifacts/contracts.
  - Bias/tuning for convenience must be explicit:
    - hard ban: hidden multipliers/constants/defaults,
    - no smuggling of downstream gameplay/art convenience into Ecology via implicit runtime rules.
  - Ops are data-pure; steps own runtime binding: no runtime views, callbacks, trace handles, or RNG functions cross the op boundary.
  - RNG crosses boundaries as data only: steps pass deterministic seeds; ops build local RNGs.
  - Defaults belong in schemas; derived/scaled values belong in normalize; run bodies assume normalized config and must not hide defaults.
  - Knobs + advanced config are a single locked contract:
    - advanced config is the baseline (typed + schema-defaulted),
    - knobs apply last as deterministic transforms,
    - hard ban: presence/compare-to-default gating semantics.
  - Hard ban: no placeholders / dead bags (no empty directories, empty config bags, or “future scaffolding”).
  - Cleanup is required, not optional:
    - every shim/compat layer/temporary bag introduced during implementation must be deleted by the end of Phase 5,
    - anything intentionally deferred becomes an explicit issue/sub-issue (never implicit).
  - Step/stage boundaries are architecture, not convenience:
    - boundaries should follow real causality unless that creates major friction without downstream benefit,
    - internal clarity splits are allowed when they do not cause config/artifact sprawl or boundary-breaking imports.
  - Stage IDs are part of the author contract:
    - use semantic stage IDs (avoid ambiguous “pre/core/post” naming),
    - document braid/interleaving constraints where they exist (not as folklore).
  - Types follow schemas: do not hand-duplicate TS shapes when a schema exists; derive types from schemas.

  Domain-specific framing (Ecology):
  - Ecology is the nexus between physics-derived signals and gameplay-facing world outcomes.
  - Decomposition must be fine-grained:
    - avoid monolithic ops/steps; prefer small, single-responsibility ops orchestrated by steps/stages.
  - Consumer migration must be contract-driven:
    - downstream consumers consume Ecology’s published artifacts/contracts,
    - not engine projections, not story overlays, not legacy convenience reads.
  - Gameplay coupling is a first-class boundary:
    - follow the Phase 3 issue’s boundary contracts and slice sequencing,
    - do not “temporarily” blur Ecology/GamePlay ownership inside Ecology.

  Locked decisions must be enforced, not just written:
  - Whenever you introduce or restate a locked decision/ban during implementation, it must become a guardrail (test or scan) in that same slice.
    Do not defer guardrails “until cleanup”.

  Drift protocol (stop the line):
  If you detect drift (preserving legacy nesting, adding hidden fallbacks, smuggling runtime concerns, collapsing boundaries,
  authority confusion, or a spec decision changing mid-flight), stop and:
  - write a short status report in the Phase 3 issue doc (what changed, what is in-flight, what is next),
  - re-baseline slice gates/checklists in the issue doc so the new reality is explicit,
  - split vague “later” work into explicit subissues and branches,
  - add guardrails so the violation cannot reappear (same slice).

  Civ7 official resources (engine interop evidence only):
  - Use Civ7 resources as evidence/constraints for engine-facing projections and required output timing.
  - Do not import Civ7’s domain modeling choices as requirements for our internal canonical model.

  Documentation is part of done:
  - For every touched schema/function/op/step/stage/contract, update JSDoc and schema descriptions with behavior,
    defaults, modes, and downstream impacts.
  - For semantic knobs, docs must also state missing/empty/null meaning and determinism expectations.

  Paths (authority + workflow; shared root: docs/projects/engine-refactor-v1/)

  Ecology artifacts and tracker:
  - issues/LOCAL-TBD-ecology-vertical-domain-refactor.md
  - issues/LOCAL-TBD-<milestone>-ecology-*.md
  - resources/workflow/domain-refactor/plans/ecology/spike-ecology-greenfield.md
  - resources/workflow/domain-refactor/plans/ecology/spike-ecology-current-state.md
  - resources/workflow/domain-refactor/plans/ecology/spike-ecology-modeling.md

  Workflow entrypoints:
  - resources/workflow/domain-refactor/WORKFLOW.md
  - resources/workflow/domain-refactor/IMPLEMENTATION.md

  Core references:
  - resources/workflow/domain-refactor/references/op-and-config-design.md
  - resources/workflow/domain-refactor/references/implementation-reference.md
  - resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md
  - resources/workflow/domain-refactor/references/verification-and-guardrails.md
  - resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md
  - resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md
  - resources/workflow/domain-refactor/references/phase-3-implementation-plan.md

  Ecology domain context (domain-only meaning; not workflow shape):
  - docs/system/libs/mapgen/ecology.md
  - docs/system/libs/mapgen/architecture.md

  Gameplay look-ahead references (boundary context; follow the Phase 3 issue’s chosen contracts):
  - resources/workflow/domain-refactor/plans/gameplay/GAMEPLAY.md
  - resources/workflow/domain-refactor/plans/gameplay/OWNERSHIP-MAP.md
  - resources/workflow/domain-refactor/plans/gameplay/DOMAIN-ABSORPTION-INVENTORY.md
  - resources/workflow/domain-refactor/plans/gameplay/IMPLEMENTATION-PLAN.md

  Ecology prompt prior art (non-authoritative):
  - resources/workflow/domain-refactor/prompts/ECOLOGY-NON-IMPLEMENTATION.md
  - resources/workflow/domain-refactor/prompts/ECOLOGY-CONTEXT.md

  Paths (Civ7 official resources; engine interop constraints only)
  - .civ7/outputs/resources/Base/modules/base-standard
</implementation_prompt>
