---
milestone: M7
id: M7-review
status: draft
reviewer: AI agent
---

# REVIEW: M7 Recipe Compile Cutover

Milestone doc: `docs/projects/engine-refactor-v1/milestones/M7-recipe-compile-cutover.md`

## REVIEW m7-t01-compiler-module-skeleton-strict-normalization

### Quick Take

Good foundation cut: strict normalization + op-envelope prefill are contract-driven, deterministic, and covered by targeted unit tests.

### High-Leverage Issues

- `normalizeStrict` returns `null` as the value on null input; if callers ever assume object-ish configs even when errors exist, this can cascade. Ensure compile callers short-circuit on any `errors.length > 0`.
- The strict pipeline uses `Value.Default` + `Value.Clean` but not `Value.Convert`; if the compiler contract expects coercion (e.g. `"1"` → `1`), make that explicit in the spec/entrypoint rather than relying on future callsites.

### Fix Now (Recommended)

- Add a focused unit test for `normalizeOpsTopLevel` covering `op.missing` and `op.normalize.failed` (these are the first “real” compiler-only runtime errors, so path/message stability matters).

### Defer / Follow-up

- Consider aligning `formatErrors` path selection on one field (`instancePath` vs `path`) and documenting it as part of compiler error surface stability.

### Needs Discussion

- Should “unknown keys” be computed on the raw input or on the defaulted/converted value? Today it’s on the raw input; if defaults add nested objects, unknown-key scanning behavior can be surprising.

### Cross-cutting Risks

- Compiler error surface stability is now a public-ish contract for downstream tests and future tooling; keep any changes to error codes/paths behind explicit review.

## REVIEW m7-t02-compile-recipe-config-wiring

### Quick Take

Solid end-to-end compiler entrypoint: stage surface normalization → stage `toInternal` → per-step strict normalization → step.normalize → op.normalize → re-validate.

### High-Leverage Issues

- `compileRecipeConfig` treats `null` config as `{}`; ensure callsites never rely on distinguishing “absent” vs “explicitly null” configs once cutover proceeds.
- Error aggregation is per-stage/per-step but compilation continues after errors; that’s good for UX, but it assumes later stages don’t depend on earlier compilation outputs (document this in the recipe contract if it’s a real invariant).

### Fix Now (Recommended)

- Add one unit test for `op.missing` and one for `step.normalize` shape-not-preserving; these are the two most likely failure modes during cutover.

### Defer / Follow-up

- Consider exporting a small “error formatting stability” note (codes + path conventions) as a doc adjacent to the compiler module once this becomes the author-facing canonical path.

### Needs Discussion

- Should stage compilation be allowed to “return” step ids not declared in `stage.steps` for experimental flows, or is the strict rejection (today) the intended hard guardrail?

### Cross-cutting Risks

- The compiler is now the choke point for canonicalization; any ambiguity in schema defaulting/cleaning order will show up here first—keep the ordering pinned by tests.

## REVIEW m7-t03-step-id-kebab-case

### Quick Take

Good guardrail: kebab-case enforcement is pushed into both `defineStepContract` (authoring SDK) and `createStage` (runtime composition), and the repo’s step ids were updated accordingly with tests.

### High-Leverage Issues

- There are now two independent regex implementations for step-id validation; keep them in sync (or factor to one shared helper) to avoid drift.
- This is a behavior change for any downstream content authors: ensure error messages are stable and actionable (they are today) and that the “migration surface” is clearly documented in the relevant authoring docs once cutover lands.

### Fix Now (Recommended)

- Add one test that asserts the exact error message shape for a bad id in both entrypoints (`defineStepContract` vs `createStage`) so tooling can rely on it.

### Defer / Follow-up

- Consider enforcing stage ids and other public ids with the same convention to avoid mixed-case surfaces creeping back in.

### Needs Discussion

- Should `createStage` validate the *derived* step id (e.g. `core.base.foundation.alpha`) as well, or is validating the local contract id sufficient?

### Cross-cutting Risks

- Id convention enforcement will cascade into config keys and compiler paths; changing it later will be expensive, so treat it as locked once used in authored configs.
