# Debate Scratchpad — Short-Term Lens (Agent ST)

This scratchpad is owned by Agent ST.

## Position: compromise (defer rigid enforcement, enforce seams)

Do **not** enforce a rigid Gameplay vs Physics truth/projection/stamping split *everywhere* during the Morphology remodel. Instead, enforce the split **at the module boundaries we’re touching**, and allow **explicit transitional shims** (with a burn-down plan) so Phase 2 lockdown isn’t blocked by “purity refactors”.

## Main arguments (short-term delivery / churn / risk)

- **Morphology remodel is already high-churn**: adding a hard layering migration in the same pass multiplies touching files, types, and call sites. That raises merge conflict rate and review surface area right when we want to stabilize.
- **The split’s value is long-term; the cost is immediate**: strict purity pays off when multiple domains consume shared truth and when adapters are stable. Right now the adapter/projection surface is likely still moving, so “correct layering” will be reworked anyway.
- **Blocking risk > architectural debt risk (for Phase 2)**: Phase 2 lockdown needs “works end-to-end” and predictable integration. A rigid split tends to create integration gaps (“we can’t stamp yet because projection isn’t ready”) that stall shipping.
- **Engine constraints are non-negotiable**: Civ7 wrap behavior (E–W wrap always, no N–S wrap, no knobs) and engine adapter realities will force practical shortcuts. If our layering model can’t be executed cleanly in the current adapter pipeline, we’ll either violate it or stop progress.

## Risks if we enforce rigidly *now*

- **Schedule risk**: conversion and type plumbing consumes the sprint, pushing Morphology correctness/quality out.
- **Integration risk**: “truth-only” outputs are insufficient for current consumers, leading to ad-hoc backchannels (worse than a sanctioned shim).
- **Churn risk**: repeated “move types again” as Gameplay/projection contracts evolve.
- **Debuggability risk**: more layers + more conversions before we have stable invariants makes regressions harder to localize.

## Mitigations if we proceed anyway (phasing + shims)

- **Phase the enforcement**:
  - *Now*: Morphology produces a “truth” artifact with a minimal, stable schema; adapters accept either truth or legacy projection.
  - *Later (post-lockdown)*: migrate all consumers to truth→projection pipeline; delete legacy conversion paths.
- **Allow explicit “legacy projection” alongside truth** (temporary):
  - Keep a `MorphologyTruth` output as the primary product.
  - Provide a clearly-named `legacyProjectMorphology(truth)` (or similar) that lives in Gameplay/projection, even if it’s thin initially.
- **Gate stamping behind recipe steps, but don’t block**:
  - If stamping isn’t ready, allow a single “engine adapter” step that consumes legacy projection (documented as a temporary escape hatch).
- **Hard rules that *do* pay off immediately**:
  - Truth types are immutable-ish data blobs; no engine IDs, no tile indices, no stamping side effects inside Physics.
  - All wrap assumptions (E–W only) expressed once in truth generation utilities, not duplicated in projection/stamping.
- **Timebox the purity work**:
  - Set a hard cap (e.g., 1–2 days) for boundary refactors; if exceeded, ship Morphology remodel with shims and defer full split.

## Go / no-go decision signals (what I’d measure)

- **Diff size + touch count**: number of files/types/call sites touched to “make it pure”. If it’s sprawling, defer.
- **Integration completeness**: can we run end-to-end generation + adapter output without “TODO: project later” blocks?
- **Regression risk**: are there tests/fixtures that assert Morphology invariants across the boundary? If not, rigid refactor is higher risk.
- **Churn forecast**: how many downstream consumers (other domains, engine adapter steps) still expect projection-like data?
- **Time-to-first-green**: if we can’t get a green build quickly after introducing the split, it’s a Phase 2 derail signal.

