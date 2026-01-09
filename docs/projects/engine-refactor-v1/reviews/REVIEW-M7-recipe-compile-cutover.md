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
