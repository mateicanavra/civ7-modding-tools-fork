---
id: CIV-M4-ADHOC-modularize-review
milestone: CIV-M4-ADHOC-modularize
title: "CIV-M4 (Adhoc): mapgen-core modularize — Review"
status: draft
reviewer: AI agent (Codex CLI)
---

# CIV-M4 (Adhoc): mapgen-core modularize — Review (Running Log)

This running log captures task-level review notes for the ad-hoc M4 modularization work.

---

## @CIV-M4-modularize — Mapgen-Core Domain/Lib Atomic Split

### Effort Estimate

**Complexity:** Medium (3/4) — broad surface-area refactor (layout + exports + wiring) with determinism and API-compat risk.
**Parallelism:** Medium-High (3/4) — most follow-ups (tests/docs/cleanup) can proceed independently once API surfaces are agreed.
**Score:** 8/16

---

### Quick Take

**Mostly, with notable gaps:** The repo is meaningfully closer to the intended modular architecture (clear `pipeline/`, `domain/`, `lib/` boundaries; legacy facades removed; subpath exports added). However, validation is not complete: `packages/mapgen-core` tests currently fail due to stale imports from removed `src/layers/**` and `src/story/**`, which materially reduces confidence in “behavior-preserving” claims.

---

### Intent & Assumptions

- Intent inferred from `docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md`: atomize algorithms into `domain/**`, consolidate shared helpers into `lib/**`, move step wiring into `pipeline/**`, delete legacy facades, and expose stable import surfaces for downstream consumers.
- Assumption: “End state” is represented by the top of the M4 modularize stack (e.g. `CIV-M4-ADHOC-modularize-lib-consolidation`), not `main`.

---

### What's Strong

- **Clean directory boundaries:** `packages/mapgen-core/src/{pipeline,domain,lib}` is now the primary navigation surface; `src/layers`, `src/story`, and top-level `src/narrative` are removed.
- **Public surface improvement:** `packages/mapgen-core/package.json` now exports `./pipeline`, `./domain/*`, and `./lib/*`, aligning runtime imports with the intended stable entrypoints.
- **Low-risk consolidation:** Refactoring local helpers toward canonical `lib/*` utilities (e.g. `idx`, `clamp`, `PerlinNoise` entrypoints) is the right direction for reducing drift and “same name, different semantics” traps.

---

### High-Leverage Issues

1. **Tests are broken post-facade removal**
   `pnpm -C packages/mapgen-core test` fails with module-resolution errors (e.g. imports of `../../src/layers/**` and `../../src/story/**`) plus at least one failing assertion.
   - *Why it matters:* This refactor’s primary risk is silent behavior drift; broken tests remove the main guardrail right when it’s most needed.
   - *Direction:* Update tests to import from the new stable surfaces (`src/domain/**`, `src/pipeline/**`) or explicitly retire legacy-facing tests if the contracts were intentionally broken.

2. **Doc checklists vs validation reality**
   The issue doc’s checklists are largely marked complete, but “Validation” (tests green) is not satisfied in the current state.
   - *Why it matters:* Reviewers and future maintainers will treat checkmarks as evidence; this increases the chance of merging an under-validated refactor.
   - *Direction:* Add an explicit “Known gaps” section (or re-open checklist items) until `packages/mapgen-core` tests are updated and passing.

3. **Two story execution paths risk drift**
   Story functionality exists both as task-graph steps (`pipeline/narrative/*`) and in the legacy orchestrator path (`MapOrchestrator` story stage flags).
   - *Why it matters:* Duplicate wiring is a classic long-tail drift source (contracts, ordering, and reset semantics diverge over time).
   - *Direction:* Keep one canonical “source of truth” for ordering/enablement and ensure the other path is either a thin delegate or explicitly marked as transitional/deprecated with a removal trigger.

---

### Fit Within the Milestone

- This work is foundational and correctly sequenced before any plugin/externalization effort: it clarifies ownership boundaries and makes later extraction feasible.
- The main sequencing gap is in the “last mile” validation: deleting facades before fully migrating tests/examples makes the refactor look “done” structurally but incomplete operationally.

---

### Recommended Next Moves

- **Must-do:** Fix `packages/mapgen-core/test/**` imports (notably `test/story/**` and `test/layers/**`) to use the new module surfaces and re-run `pnpm -C packages/mapgen-core test` as the acceptance gate.
- **Nice-to-have:** Add a short “Migration notes” section in `docs/projects/engine-refactor-v1/issues/CIV-M4-ADHOC-modularize.md` pointing to the new canonical import surfaces (`@swooper/mapgen-core/pipeline`, `.../domain/*`, `.../lib/*`) and calling out removed paths.

