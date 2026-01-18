# Implementation Traps & Locked Decisions (Domain Refactors)

This reference distills recurring failure modes observed during domain-refactor implementation and turns them into reusable “stop signs”, invariants, and enforcement patterns that apply across domains.

It is intentionally domain-agnostic: the examples are MapGen-flavored, but the rules are meant to generalize to any domain refactor in this repo.

## When to Use This

Use this as a checklist and prompt insert during:

- Slice implementation (when touching ops/steps/contracts/config)
- Downstream rebuilds (consumer migrations)
- Ruthless cleanup sweeps (compat removal + guardrails)

## Stop Signs (Pause + Reconcile Before You Continue)

If any of these happen, stop and re-check the architecture + the current plan’s locked decisions:

- You are “preserving patterns” or “matching existing nesting” primarily because it already exists.
- You are introducing fallback/optionality/shims “just in case” without an explicit, recorded deferral trigger.
- You are collapsing multiple steps into a single mega-step to “make migration easier.”
- A spec decision changed mid-flight and the plan/checklists did not get re-baselined.
- You are passing functions/callbacks across a boundary that claims to be “data-only” (e.g., step→op inputs).
- You are manually “typing” or re-declaring shapes that already exist as a schema (TypeBox or equivalent).
- You are adding defaults in runtime code instead of in config schemas / normalization hooks.
- You are applying knobs conditionally based on “presence” or “equals default” checks (compare-to-default gating).
- You are introducing or retaining unnamed multipliers/thresholds/defaults that change behavior (magic numbers) in compile/normalize/run paths.
- You are leaving placeholder directories/modules, empty config bags, or other “dead scaffolding” in the tree.
- You are freezing/snapshotting objects at public boundaries to simulate immutability.

## Locked Decisions (Generalizable Invariants)

### 1) The runtime boundary is the step (ops stay pure)

- Ops are “pure domain contracts”: `run(input, config) -> output` with data-only inputs/outputs, no runtime views or callback injection.
- Steps own runtime binding (adapter reads/writes, artifact publication, logging/trace, seeded RNG derivation, side effects).

Code touchpoints:
- `packages/mapgen-core/src/authoring/op/types.ts`
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`

### 2) Tracing/logging happens in steps (not inside ops by default)

- Trace scope is established per-step at execution time; op signatures do not accept trace handles unless the op contract is explicitly changed.
- If you want op-level trace semantics, wrap op calls inside the step and emit trace events there.

Code touchpoints:
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`
- `packages/mapgen-core/src/dev/logging.ts`

### 3) RNG cannot cross a boundary as a callback

- Never pass RNG functions through inputs/contracts across boundaries that are intended to stay serializable/data-only.
- Steps derive deterministic seeds from runtime context and pass seeds as plain data; ops build local deterministic RNGs from the seed.

Code touchpoints:
- `packages/mapgen-core/src/core/types.ts` (`ctxRandom`, `ctxRandomLabel`)
- `packages/mapgen-core/src/core/index.ts` / `packages/mapgen-core/src/lib/rng/label.ts` (`createLabelRng`)

### 4) Defaults live in config; normalization lives in `normalize`

- Do not “bake in hidden defaults” in run handlers.
- Use schema defaults for basic defaults and `normalize` hooks for derived/scaled parameters.
- Use run handlers for runtime validation that cannot be done at schema/normalize time (and keep it narrow).

Hard ban (non-optional): no hidden multipliers/constants/defaults.
- Do not encode semantics as unnamed numeric literals in compile/normalize/run paths.
- Any behavior-shaping multiplier/threshold/curve parameter MUST be either:
  - an author-facing knob/config field, or
  - a clearly named internal constant with explicit intent.
- Knob transforms cannot smuggle scaling factors (no “magic multipliers” hidden in normalize).

If the domain has both knobs + advanced config, lock their composition as a single contract:
- Advanced config is the typed/defaulted baseline.
- Knobs apply **after** as deterministic transforms over that baseline (“knobs last”).
- Ban presence detection and compare-to-default gating; once schema defaulting has run for a field, you cannot reliably infer whether it was explicitly set vs defaulted.

Code touchpoints:
- `packages/mapgen-core/src/authoring/op/create.ts` (strategy `normalize`)
- `packages/mapgen-core/src/authoring/step/create.ts` (step-level `normalize`)

### 5) Do not snapshot/freeze at boundaries to emulate immutability

- Publish should store references (write-once); consumers treat reads as readonly by convention + types.
- Do not freeze outputs at publish/return boundaries; if internal freezing/copying is required, keep it strictly internal and local.

Code touchpoints:
- `packages/mapgen-core/src/authoring/artifact/runtime.ts` (publish is write-once; no deep freeze)

### 6) “Derived” parameters should not be user-authored

- If a config value is purely an internal derived metric (e.g., computed from map dimensions), do not expose it as an authored knob.
- Prefer a higher-level author knob + normalization to derive the internal value.

Enforcement pattern:
- Strategy schema marks derived fields as optional + documented “derived in normalization (do not author directly)”.

### 7) Avoid monolithic steps; step boundaries are the architecture

- Default posture: step/stage boundaries should track real causality (the domain’s causality spine), and each boundary should be semantic (not “pre/core/post” by convenience).
- A refactor that collapses an entire stage into a single mega-step tends to re-create monolithic config passing and makes consumer migration harder.
- It is also possible to over-split boundaries: too many tiny steps that each need config/artifacts can create sprawl and coupling.

Preferred pattern:
- Promote a conceptual split to a pipeline boundary only when it creates durable value (downstream contracts/hooks, stable intermediates, observability/debugging, or pipeline interleaving constraints).
- Encourage internal clarity splits when helpful (readability, authorability, local reasoning), but keep them internal-only if they do not justify a boundary.

Guardrails (reject a boundary split when it causes):
- Config/artifact sprawl (many tiny “one-off” schemas/artifacts that exist only to thread data through).
- Shared-config proliferation (cross-cutting config that must be threaded across many steps).
- Boundary-breaking imports/exports (“porting” state across boundaries, deep imports, or grab-bag contracts to avoid threading).
- Ambiguity about what is “public contract” vs internal-only intermediate.

### 8) Do not preserve legacy/compat “optionality” during a strict refactor

- Treat stray legacy shims, runtime overrides, and “optional” knobs that conflict with the authoritative model as code smells to delete, not accommodate.
- If a compatibility escape hatch is truly needed, it must be owned downstream, explicitly isolated, deprecated, and tracked with a removal trigger (deferral).

Guardrail pattern:
- Add contract guard tests that fail if forbidden surfaces/strings reappear.

Example pattern:
- `mods/mod-swooper-maps/test/foundation/contract-guard.test.ts`

### 9) Use schemas as the single source of truth (no duplicate TS typing)

- If a schema exists, derive types from the schema (`Static<typeof Schema>`); do not manually retype the shape.
- Prefer passing schemas via contracts rather than re-declaring shapes in multiple places.

### 10) Entry layers must not rewrite domain policy

- Runtime entry layers should supply facts (seed, dimensions, pipeline context), not policy knobs that override domain invariants.
- If a wrap/posture/constraint is part of the model, it belongs in the domain; entry layers must not “correct” it at runtime.

### 11) No placeholders / dead bags (non-negotiable)

This is a hard rule:
- Do not merge empty directories, placeholder modules, empty config bags, or “future scaffolding” into the repo.
- If something is not used, it must not exist.
- If something is superseded, it must be removed in the same refactor or explicitly tracked as a cleanup item with owner + trigger (placeholders/dead bags are not deferrable).

Enforcement pattern (minimum):
- Each slice’s plan includes a deletion list (symbols + file paths) that is expected to go to zero in that slice.
- Phase 5 cleanup confirms the tree contains no placeholder scaffolding and no dead bags inside refactor scope.

## Decision Points (Make Them Explicit)

| Decision | Criteria | Options |
|---|---|---|
| Preserve compat vs delete | Is a consumer still live and blocking? | Delete now; or isolate + deprecate + add deferral trigger |
| Where to normalize | Is it purely config-derived? | `normalize` (preferred); otherwise runtime validation in `run` |
| Conceptual decomposition vs pipeline boundary count | Does promoting this split to a boundary create durable interop/hook/observability value without causing sprawl? | Promote to a boundary; or keep as an internal clarity split (no contract); or intentionally collapse/expand and document the tradeoff |
| Knobs + advanced config composition | Does the domain have both knobs and advanced config? | Treat as a single locked contract: baseline is advanced config; knobs apply last as transforms; lock via tests (include explicitly-set-to-default edge case); ban presence/compare-to-default gating |
| RNG source | Is a deterministic seed required? | Derive seed in step (`ctxRandom`), pass seed to op, use `createLabelRng` |
| Trace visibility | Need trace events at op boundaries? | Step wraps op call + emits trace; or extend op contract (explicit architecture change) |
| “Derived knobs” | Is authoring the value meaningful? | Author a higher-level knob, derive internal metric in normalize |
| Missing vs empty vs null | Is a field absent / `[]` / `null` meaningful? | Lock a policy per field: missing inherits defaults vs explicit freeze; define `[]`/`null` meaning; enforce with tests |
| Weights/probabilistic knobs | Does a config imply randomness? | Define determinism policy (seed source + allowed randomness layer); make behavior test-locked and reproducible |
| Fix placement durability | Will the code you’re changing be replaced in the next slice? | Prefer stable anchors (domain boundary / config normalization) over ephemeral implementation details; add a survivability check |
| Spec drift | Did a locked decision change mid-flight? | Stop → re-baseline the plan → add a guardrail in the same slice |

## Quality Gates (Per Slice)

Treat these as “must pass before stacking the next slice”:

- `rg`-style grep gates for forbidden surfaces (strings/symbols) aligned with the slice’s deletion mandates.
- Contract guard tests to prevent reintroduction of forbidden imports/schemas/surfaces.
- Package scripts for the touched workspace(s): typecheck/check + tests (and build where relevant).
- No dual-path compute: if old and new both produce the same concept, delete the old path in the same slice (or record an explicit deferral trigger).

## Minimal Enforcement Patterns That Scale

- **Contract-guard tests**: cheap string-based checks in the domain’s test suite for “must never reappear” surfaces.
- **Runtime boundary assertions**: `require*` helpers to validate artifact shapes at boundaries (fail fast).
- **Lib extraction**: move generic math/util helpers out of ops/steps to a `lib/` (domain-local) or shared core lib (cross-domain) to reduce copy/paste drift.
