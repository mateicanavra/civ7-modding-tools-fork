---
id: M4-tests-validation-cleanup-review
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
title: "M4: Target Architecture Cutover & Legacy Cleanup — Aggregate Review"
status: draft
reviewer: AI agent
---

# M4: Target Architecture Cutover & Legacy Cleanup — Aggregate Review (Running Log)

This running log captures task-level reviews for milestone M4. Entries focus on
correctness, completeness, sequencing fit, and forward-looking risks.

---

## CIV-48 – [M4] Move Foundation Production into Steps & Clean Boundaries

**Reviewed:** 2025-12-19

- **Intent:** Move foundation production into steps, enforce the `ctx.foundation` contract, standardize RNG/adapter boundaries, remove the WorldModel producer, and drop `ctx.worldModel`.
- **Strengths:** Step-owned foundation producer (`pipeline/foundation/producer.ts`), WorldModel producer removed from `MapOrchestrator`, `ctx.worldModel` removed from context, RNG/TerrainBuilder cleanup with validation and tests (foundation smoke + config wiring).
- **Gaps:** Foundation producer still falls back to `globalThis.GameplayMap` for latitude/water in `computeWinds`/`computeCurrents`, violating the adapter-only boundary and “no silent fallbacks” guardrail.
- **Follow-up:** Remove GameplayMap fallbacks and fail fast when adapter hooks are missing (or pass adapter-only functions explicitly).
- **Update (2025-12-19):** Removed GameplayMap fallbacks for foundation winds/currents and added adapter presence checks at the producer boundary.

## CIV-53 – [M4] DEF-013: Remove stageFlags + shouldRun gating (single enablement source)

**Reviewed:** 2025-12-20

- **Intent:** Remove stageFlags/shouldRun gating so the recipe list is the sole enablement source, and the executor runs the recipe deterministically.
- **Strengths:** `shouldRun` removed from the step contract and wrappers; executor no longer filters steps; runtime wiring no longer threads stageFlags; story checks derive from the recipe list.
- **Gaps:** DEF-013 deferral status still says `shouldRun`/stageFlags gating exists, so docs contradict implementation; paleo ordering test still builds/passes `stageFlags`, so tests lag the new contract; verification checkbox for build/tests is still unchecked in the issue doc.
- **Follow-up:** Mark DEF-013 deferral as resolved/implemented and remove outdated wording; update paleo ordering test to drop `stageFlags` and derive story enablement from the recipe; run `pnpm -C packages/mapgen-core check` and `pnpm test:mapgen`.
- **Update (2025-12-20):** DEF-013 moved to Resolved Deferrals, paleo ordering test updated to derive `storyEnabled` from the recipe, and issue doc notes local test failures due to missing `@civ7/adapter`.
