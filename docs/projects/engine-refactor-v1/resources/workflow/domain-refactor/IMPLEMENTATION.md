---
name: domain-refactor-implementation-subflow
description: |
  Detailed implementation sub-flow for refactoring a domain to operation modules.
  Focuses on slice planning + slice completion checklist + sizing guardrails.
---

# SUB-FLOW: Domain Refactor Implementation (Slices)

This is the detailed “how-to” for the **implementation phase** of a domain refactor.

This sub-flow assumes you already produced:
- a domain inventory (all callsites, contracts, config surfaces, typed arrays, deletions), and
- a locked op catalog (ids, kinds, schema ownership, config resolution plan).

Keep open while implementing:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-reference.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

## Execution posture (directional guidance)

- Keep slices end-to-end and pipeline-green. Do not carry partial migrations forward “until cleanup.”
- Prefer durable fix anchors. When a behavior is wrong, fix it at contracts/schemas/normalize boundaries first.
- Default to deletions. Within scope, remove legacy surfaces, compat, placeholders, and dead bags; do not preserve them “just in case.”
- If a locked decision is threatened, stop the line: update the Phase 3 issue and add a guardrail before proceeding.

## Phase 2 posture locks (gates; enforce per slice)

These locks are not “directional”; they are non-negotiable. If you touch any relevant code paths in a slice, add guardrails (tests/scans) in the same slice.

Canonical anchors:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- The Phase 2 canon for the domain you are implementing (typically: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/<domain>/spec/PHASE-2-*.md`)

- **Topology invariant:** Civ7 is `wrapX=true`, `wrapY=false` always. No env/config/knob for wrap; wrap flags must not appear in op/step/artifact contracts.
- **Boundary:** Physics domains publish truth-only artifacts (pure). Gameplay owns `artifact:map.*` projections/annotations and all adapter stamping/materialization.
- **No backfeeding:** Physics steps MUST NOT `require`/consume `artifact:map.*` or `effect:map.*`.
- **Effects are boolean:** `effect:map.<thing><Verb>` (default `*Plotted`; short verbs only; no receipts/hashes/versions).
- **Hard ban:** no `artifact:map.realized.*` namespace anywhere.
- **TerrainBuilder no-drift:** Civ7 elevation/cliffs come from `TerrainBuilder.buildElevation()` and cannot be set directly. Any cliff/elevation-band-correct decisions belong in Gameplay after `effect:map.elevationPlotted`.
- **Effect honesty via freeze:** any published `artifact:map.*` intent consumed by stamping must be publish-once/frozen before stamping begins; assert the `effect:map.*` only after successful adapter writes.

## How to think about slicing (guardrails)

You (the implementer) choose slices **ad hoc** based on the domain inventory. The workflow is not prescriptive about slice boundaries, but it is strict about slice **completion** (no half-migrations).

Hard guardrails:
- Preserve step granularity. Do not “collapse” multiple legacy steps into one mega-step to make the refactor easier.
- Preserve op granularity. Avoid noun-first “bucket ops” (e.g. `placement`, `terrain`, `features`) that become dumping grounds.
- Prefer verb-forward ops that each do one job: `compute*`, `plan*`, `score*`, `select*` (see ADR-ER1-034).

Healthy slice sizing heuristics:
- Default slice = **one step** (or a small, tightly-coupled cluster of steps that must migrate together due to shared contracts/artifacts/config).
- A slice should be small enough that you can:
  - delete the legacy path(s) used by that slice immediately, and
  - keep reviewability (diff is explainable without a second spike).
- If you catch yourself writing “and also” repeatedly when describing the slice, it’s probably too broad.

Anti-patterns (do not do this):
- “One slice for the whole domain” unless the domain genuinely only has one step/op surface.
- “One op that does everything” where the op id reads like a noun or a domain label rather than an action.
- “We’ll keep the old path until the end” (dual paths = half-migration risk).

## Drift response protocol (required if you notice drift)

If you detect drift or a locked decision is violated, pause and:
1. Write a short status report (what changed, what is in-flight, what is next).
2. Update the Phase 3 issue to insert the locked decision as a gate.
3. Replace “later” buckets with explicit subissues and branches.
4. Add guardrails (string/surface checks or contract-guard tests) to prevent reintroduction.

## Slice planning artifact (required before coding)

Before writing code, write a short slicing plan in the domain issue doc:
- Slice name (A/B/C… or a short slug)
- Step(s) included (ids + file paths)
- Ops to create/modify (ids + kinds)
- Legacy entrypoints to delete in that slice (file paths / exports)
- Tests to add/update for that slice (op contract test + any thin integration edge)
- Expected guardrail scope (which domains to run via `REFRACTOR_DOMAINS=...`)
- Locked decisions + bans (and how each becomes a guardrail)
- If the slice touches Gameplay plotting/stamping: name the `effect:map.*` tags introduced/required, enforce projection intent freeze, and enforce TerrainBuilder no-drift (`plot-elevation` ordering; no implicit re-plots).
- Step decomposition plan (causality spine → step boundaries → artifacts/buffers)
- Consumer inventory + migration matrix (break/fix by slice)

## Slice completion checklist (repeat for each slice)

This is the “definition of done” for a slice. You must complete it before moving to the next slice.

### 1) Extract ops for the slice

- Create/update the op module(s) needed by this slice under `mods/mod-swooper-maps/src/domain/<domain>/ops/**`.
- Op contracts are POJO/POJO-ish only (typed arrays ok); no adapters/context/RNG callbacks cross the boundary.
- Run handlers assume normalized config (no hidden defaults or fallback values).
- If you touch a “semantic knob” (lists/pairs/weights/modes), ensure its meaning + missing/empty/null + determinism expectations are explicitly documented (Phase 2 semantics table) and enforced by tests; do not infer semantics ad hoc in `run(...)`.
- Each op module is contract-first and follows the canonical shape:
  - `contract.ts` via `defineOp`
  - `types.ts` exporting a single `OpTypeBag`
  - `rules/` + `rules/index.ts`
  - `strategies/` + `strategies/index.ts`
  - `index.ts` exporting the created op and re-exporting contract + types
- Op schemas + `defaultConfig` + optional `normalize` are colocated with the op module.

### 2) Wire steps for the slice

- Promote the migrated step(s) into the contract-first step module shape:
  - `contract.ts` (metadata-only via `defineStep`)
  - `index.ts` (orchestration only, created via bound `createStep`)
  - `lib/**` (pure helpers such as `inputs.ts`/`apply.ts`, optional)
- Step contracts declare op contracts via `ops: { <key>: domain.ops.<opKey> }`.
- `defineStep({ ops })` automatically merges each op contract’s `config` schema into the step schema.
- Step modules call injected runtime ops via `run(context, config, ops)` (no local op binding, no importing implementations).

### 3) Delete legacy for the slice

- Delete the legacy entrypoints and helpers that the migrated step(s) used.
- Do not leave compat exports or an “old/new” switch.
- Remove any compat/projection surfaces from this domain. Do not introduce transitional compatibility as a refactor technique; migrate consumers and delete in-slice.
- No dual-path compute: if old and new both produce the same concept, delete the old path in this slice (the slice design must include consumer migration so it can).

### 4) Tests for the slice

- Add at least one op contract test for the op(s) introduced/changed in this slice.
- If artifact/config contracts changed across steps, add one thin integration test that exercises the edge.
- Keep tests deterministic (fixed seeds; no RNG callbacks crossing op boundary).
- If the slice introduces or changes probabilistic behavior (weights), add a deterministic test that would fail if RNG/seed semantics drift.

### 5) Documentation for the slice (required)

- Treat documentation as part of the slice definition of done.
- For any touched exported symbol (op contracts, step contracts, strategy exports, helper functions used cross-file):
  - Trace callsites/references first (code-intel; do not guess intent).
  - Add/refresh JSDoc on the definition site with behavior-oriented notes (what/why/edge cases).
- For any touched TypeBox schema field (especially config):
  - Ensure it has a meaningful `description` explaining behavioral impact and interactions (not just type).

#### Knobs + advanced config composition: locked contract (with examples)

This is the highest-frequency failure mode when refactoring domains that have:
- **knobs** (author intent; scenario-level controls), and
- **advanced config** (explicit typed numeric/structural tuning).

Treat knobs + advanced config as a **single locked author contract**. It must be:
- predictable for authors (knobs-only and advanced-config+knobs behave the same way),
- stable for implementers (no “intent inference” hacks),
- and test-locked (so semantics can’t drift during later slices).

Rationale (author mental model):
- Knobs are the primary surface most authors will use when they are not editing advanced config directly.
- Advanced config is always available and editable; knobs operate **on top of whatever advanced config is set**.
- A knob is intentionally a broader brush: one knob may influence multiple parameters at once.
- Despite that, composition must remain deterministic and auditable: knobs are layered over advanced config in a controlled, test-locked way.

Canonical contract (single rule; no ambiguity):
- **Step config is the typed/defaulted baseline** (schemas + `defaultConfig`).
- **Knobs apply after** as deterministic transforms over that baseline (not “fill missing”, not “presence-based precedence”).
- **Bans:** presence detection, compare-to-default gating, and any attempt to infer “author intent” from whether a value was explicitly set vs defaulted.

##### ✅ Good: apply knobs as pure transforms after schema defaulting

In this codebase, step schemas are validated and defaulted before `step.normalize(...)` runs.
That makes `step.normalize` the stable boundary for applying knob transforms: it always sees a fully-shaped config.

```ts
// GOOD: knobs apply after normalization as a deterministic transform.
// No "only-if-missing", no presence checks, no compare-to-default sentinels.
normalize: (cfg, ctx) => {
  const wetnessScale = DRYNESS_WETNESS_SCALE[ctx.knobs.dryness];
  return {
    ...cfg,
    computePrecipitation: {
      ...cfg.computePrecipitation,
      config: {
        ...cfg.computePrecipitation.config,
        rainfallScale: cfg.computePrecipitation.config.rainfallScale * wetnessScale,
      },
    },
  };
}
```

##### ❌ Bad: “compare-to-default” gating (a.k.a. deep-merge-by-hand)

Avoid patterns that apply knob logic only “if the config still equals a particular default number”.
This hides behavior, violates the “knobs apply last” contract, and breaks when an author explicitly sets a value equal to the default.

```ts
// BAD: compare-to-default sentinel gating (breaks "knobs apply last")
if (cfg.computeThermalState.config.baseTemperatureC === 14) {
  cfg.computeThermalState.config.baseTemperatureC = baseTempFromKnobs(knobs);
}
```

##### How to lock the contract with tests (minimum framing)

You do not need a huge test suite, but you do need at least one test that would fail if “knobs last” drifts.

Minimum cases to cover (name the tests in the Phase 3 issue doc):
- Knobs-only: baseline defaults + knob transform applies.
- Advanced-config + knobs: baseline overrides + knob transform still applies.
- Explicitly-set-to-default edge case: author sets a value equal to its default + knob transform still applies (this is what compare-to-default gating breaks).

Where to assert:
- Prefer asserting on the post-normalization config (compiled plan config / `step.normalize(...)` output), not on emergent runtime outcomes.
- Add a cheap contract-guard test for forbidden patterns if the domain has a history of regressing here (e.g., compare-to-default sentinels for specific fields).

##### ✅ Good: rely on schema defaulting; normalize should not re-parse and re-default

In this codebase, step schemas are validated and defaulted before `step.normalize(...)` runs.
`step.normalize` should therefore be reserved for **pure derived values** (if any), not:
- interpreting unknown/invalid knob values,
- “helpfully” defaulting missing fields,
- adding fallback semantics after validation.

```ts
// GOOD: normalize assumes validated/defaulted shape; only derives a value.
normalize: (cfg) => ({ ...cfg, derived: derive(cfg) })
```

```ts
// BAD: normalize re-parses knobs and silently defaults (drift-prone and undocumented).
normalize: (_cfg, ctx) => ({ ..._cfg, foo: isRecord(ctx.knobs) ? ctx.knobs.foo ?? "x" : "x" })
```

##### ✅ Good: multipliers and mappings are named, documented constants (or explicit inputs)

If a knob implies numeric scaling, do not bury multipliers as “magic numbers” deep in normalization logic.
Choose one of:
- **Internal constant** (if it must not be tuned): name it and document the rationale.
- **Explicit input** (if it is a tuning degree of freedom): surface it as advanced config or an intensity knob.

```ts
// GOOD: named constant, documented once, reused everywhere
export const DRYNESS_RAINFALL_SCALE = { wet: 1.15, mix: 1.0, dry: 0.85 } as const;
```

```ts
// BAD: magic numbers scattered throughout step.normalize/run
const drynessScale = dryness === "wet" ? 1.15 : dryness === "dry" ? 0.85 : 1.0;
```

##### ✅ Good: schema reuse only for *meaningfully identical* knobs; otherwise define stage-local knobs

Schema definition convention (keep one clean standard):
- Prefer **inline knob schemas at the stage boundary** (next to `createStage({ knobsSchema: ... })`), so the schema and its docs stay colocated with the stage that consumes it.
- Only define schemas out-of-line if they are actually imported elsewhere. In that case, put them under a shared folder (e.g. `domain/<domain>/shared/**`) and import them.

If a knob has the same meaning across stages, reuse the same leaf schema (shared meaning).
If the meaning differs by stage, define **stage-local** knobs with stage-local docs (do not share a name).

Also: if your project requires “redundant” docs, do it deliberately:
- keep shared leaf schemas for type/validation,
- re-declare stage knob objects so each **property** can have stage-scoped JSDoc + `description`.

```ts
// GOOD: stage-local knobs schema defined inline; leaf schema can be inline or imported if truly shared.
createStage({
  id: "hydrology-climate-baseline",
  knobsSchema: Type.Object(
    {
      /**
       * Global moisture availability bias (not regional).
       *
       * Stage scope:
       * - Used to scale baseline rainfall/moisture sourcing only.
       * - Must not change hydrography projection thresholds.
       */
      dryness: Type.Optional(
        Type.Union([Type.Literal("wet"), Type.Literal("mix"), Type.Literal("dry")], {
          default: "mix",
          description: "Global moisture availability preset (used by climate baseline only).",
        })
      ),
    },
    { description: "Hydrology climate-baseline knobs." }
  ),
  steps: [/* ... */],
});
```

```ts
// BAD: defining a monolithic exported KnobsSchema just to pluck `.properties.*` later.
// This pattern encourages central docs that drift from stage behavior and makes stage schemas look undocumented.
export const HydrologyKnobsSchema = Type.Object({
  dryness: Type.Optional(Type.Union([/* ... */])),
  /* ...many unrelated knobs... */
});
export const ClimateBaselineKnobsSchema = Type.Object({
  dryness: HydrologyKnobsSchema.properties.dryness,
  /* ... */
});
```

### 6) Guardrails for the slice

Single must-run guardrail gate:
```bash
REFRACTOR_DOMAINS="<domain>[,<domain2>...]" ./scripts/lint/lint-domain-refactor-guardrails.sh
```

If it fails, iterate until clean (no exceptions).

If a locked decision/banned surface was introduced in this slice, add a guardrail (test/scan) in the same slice.

### 6.5) Survivability validation (required for fixes and review-driven changes)

Before committing the slice, confirm:
- The fix is anchored at a stable interface (domain boundary / config normalization) rather than an implementation detail likely to be replaced in a later slice.
- Any non-trivial config semantics touched are locked by tests (not just prose).

### 7) Commit the slice (Graphite-only)

- Commit when the slice is fully complete (no partial commits for a slice).
```bash
gt add -A
gt modify --commit -am "refactor(<domain>): <slice summary>"
```

## Final slice additions (end-of-domain completion)

In the final slice, do the “around-the-block” cleanup:
- remove now-unused shared helpers that existed only to support legacy paths,
- remove obsolete exports/re-exports that bypass the op boundary,
- update docs/presets/tests that referenced removed legacy structures.
- do not leave behind deprecated shims/compat layers. If a shim exists, the slice plan is wrong; redesign the slice to migrate consumers and delete the legacy surface in-slice.

Before the full repo gates, run the fast refactor gates:
```bash
REFRACTOR_DOMAINS="<domain>" ./scripts/lint/lint-domain-refactor-guardrails.sh
pnpm check
```

Then run the full verification gates:
```bash
pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build
pnpm deploy:mods
```

Finally, do the Phase 5 traceability pass:
- Update the Phase 3 issue doc Lookback 4 (what changed vs plan, and why).
- Record any environmental gate constraints (e.g. deploy not runnable locally) with evidence. Do not defer in-scope migrations/deletions; redesign slices until they are straight-through cutovers.
