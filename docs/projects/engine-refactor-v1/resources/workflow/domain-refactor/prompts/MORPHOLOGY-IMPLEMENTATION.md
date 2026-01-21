<implementation_prompt>
  You are implementing the Morphology vertical domain refactor (Phases 4–5). The model is locked.
  Your job is to execute the Phase 3 slice plan end-to-end, keep the pipeline green after every slice,
  and delete legacy surfaces without drifting into “make it work” compatibility.

  Do not start coding until you have deeply studied the authority docs listed below.

  The Phase 3 Morphology issue doc is the authoritative tracker for:
  - the slice index and sequencing rationale,
  - locked decisions/bans (and their guardrails),
  - config semantics (meaning + default/empty/null + determinism policies),
  - step/stage boundaries (and where internal splits are allowed),
  - consumer migration matrix (break/fix per slice),
  - acceptance criteria and verification gates,
  - required cleanup/deletions (no placeholders, no dead bags, no lingering shims).

	  Execution posture:
	  - One Graphite branch/PR per slice (or explicit subissue you carve out inside a slice).
	  - Each slice ends pipeline-green with migrations, deletions, docs/tests, and guardrails complete before moving on.
	  - No dual paths within scope. No shims/adapters as a design pattern. If you believe a shim is required, stop and re-slice: the plan must be reordered/redesigned so every slice ends green without introducing a second way to do the same thing.

	  Non-negotiable invariants (drift prevention):
	  - Model-first: the canonical model/contracts are the source of truth even if projections change.
	  - No compat inside Morphology: Morphology must not publish or retain legacy compat/projection surfaces.
	    Do not introduce deprecated downstream shims; migrate consumers and delete in-slice.
	  - Narrative overlays are forbidden in this refactor phase:
	    - remove story/narrative/overlay surfaces entirely,
	    - replace any load-bearing ones with canonical, domain-anchored contracts,
	    - and migrate consumers.
		  - Projection-as-truth is forbidden:
		    - Morphology must not read back engine-facing projections (tile queries, adjacency, terrain indices) as “domain truth”.
		    - Engine-facing projections are derived outputs/adapters only.
			    - Canonical map projection artifacts are `artifact:map.*` (Gameplay-owned) and execution guarantees are boolean effects `effect:map.<thing><Verb>` (e.g., `effect:map.mountainsPlotted`, `effect:map.elevationBuilt`).
		    - Nuance: Physics truth MAY be tile-indexed and MAY include `tileIndex`. The ban is on engine/game-facing ids and on consuming map-layer projections/effects as inputs.
		  - Hard ban: do not introduce `artifact:map.realized.*`, and do not invent a runtime “map.realized” concept.
			  - Effects are boolean execution guarantees only:
			    - `effect:map.<thing><Verb>` with a semantically correct, short, consolidated verb.
			      - `*Plotted` is reserved for stamping/placement; `*Built` is used for TerrainBuilder build steps (e.g., `effect:map.elevationBuilt`).
			    - No receipts/hashes/versions; effects are not audit logs.
		  - TerrainBuilder no-drift (do not re-open):
		    - `TerrainBuilder.buildElevation()` produces engine-derived elevation/cliffs; there is no setter.
		  - Anything that must match actual Civ7 elevation bands / cliff crossings is Gameplay/map logic after `effect:map.elevationBuilt` and may read engine surfaces.
		    - Physics may publish complementary signals (slope/roughness/relief/etc.) but MUST NOT claim “Civ7 cliffs” as Physics truth.
		  - Topology is locked:
		    - `wrapX = true` always (east–west wraps), `wrapY = false` always (north–south does not wrap).
		    - No environment/config/knobs may change wrap behavior; wrap flags must not appear as input contract fields.
  - Ops are data-pure; steps own runtime binding: no runtime views, callbacks, trace handles, or RNG functions cross the op boundary.
  - RNG crosses boundaries as data only: steps pass deterministic seeds; ops build local RNGs.
  - Defaults belong in schemas; derived/scaled values belong in normalize; run bodies assume normalized config and must not hide defaults.
  - Knobs + advanced config are a single locked contract:
    - advanced config is the baseline (typed + schema-defaulted),
    - knobs apply last as deterministic transforms,
    - hard ban: presence/compare-to-default gating semantics.
  - Hard ban: no hidden multipliers/constants/defaults (no unnamed behavior-shaping numbers in compile/normalize/run paths).
  - Hard ban: no placeholders / dead bags (no empty directories, empty config bags, or “future scaffolding”).
	  - Cleanup is required, not optional:
	    - do not introduce shims/compat layers/temporary bags as “just to get green”; re-slice instead,
	    - anything intentionally deferred becomes an explicit issue/sub-issue with a trigger (never implicit).
  - Step/stage boundaries are architecture, not convenience:
    - boundaries should follow real causality unless that creates major friction without downstream benefit,
    - internal clarity splits are allowed when they do not cause config/artifact sprawl or boundary-breaking imports.
  - Stage IDs are part of the author contract:
    - use semantic stage IDs (avoid ambiguous “pre/core/post” naming),
    - document braid/interleaving constraints where they exist (not as folklore).
  - Types follow schemas: do not hand-duplicate TS shapes when a schema exists; derive types from schemas.

		  Domain-specific framing (Morphology):
	  - Morphology owns the canonical “shape of the world” contracts consumed by Hydrology/Ecology/Gameplay.
	  - Consumer migration must be contract-driven:
	    - downstream domains consume Morphology’s published artifacts/contracts,
	    - not engine projections, not story overlays, not legacy convenience reads.
		  - Be ruthless about public vs internal:
		    - promote only the stable cross-domain contracts defined by the locked model (Phase 2 canon + Phase 3 issue doc),
		    - do not publish intermediates “because it might be useful”; keep them internal unless the model explicitly promotes them,
		    - do not add new public artifacts/contracts during Phases 4–5. If you believe a new contract is required, stop and update the Phase 3 issue doc first (this is a model change).

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

  Documentation is part of done:
  - For every touched schema/function/op/step/stage/contract, update JSDoc and schema descriptions with behavior,
    defaults, modes, and downstream impacts.
  - For semantic knobs, docs must also state missing/empty/null meaning and determinism expectations.

  Paths (authority + workflow; shared root: docs/projects/engine-refactor-v1/)

	  Morphology artifacts and tracker:
	  - issues/LOCAL-TBD-<milestone>-morphology-*.md
	  - resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield-gpt.md
	  - resources/workflow/domain-refactor/plans/morphology/spike-morphology-current-state-gpt.md
	  - resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md
	  - resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md
	  - resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md
	  - resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md

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

	  Legacy background domain context (may be outdated vs the current architecture; use only for historical meaning):
	  - docs/system/libs/mapgen/morphology.md

  Morphology prompt prior art (non-authoritative):
  - resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md
  - resources/workflow/domain-refactor/prompts/MORPHOLOGY-CONTEXT.md

  Paths (Civ7 official resources; engine interop constraints only)
  - .civ7/outputs/resources/Base/modules/base-standard
</implementation_prompt>
