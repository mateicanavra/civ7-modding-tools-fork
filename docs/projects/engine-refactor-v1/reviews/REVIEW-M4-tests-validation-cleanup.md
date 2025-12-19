---
id: M4-tests-validation-cleanup-review
milestone: M4-tests-validation-cleanup
title: "M4: Tests, Validation & Cleanup — Aggregate Review"
status: draft
reviewer: AI agent
---

# M4: Tests, Validation & Cleanup — Aggregate Review (Running Log)

This running log captures task-level reviews for milestone M4. Entries focus on
correctness, completeness, sequencing fit, and forward-looking risks.

---

## CIV-48 – [M4] Move Foundation Production into Steps & Clean Boundaries

**Reviewed:** 2025-12-19

- **Intent:** Move foundation production into steps, enforce the `ctx.foundation` contract, standardize RNG/adapter boundaries, remove the WorldModel producer, and drop `ctx.worldModel`.
- **Strengths:** Step-owned foundation producer (`pipeline/foundation/producer.ts`), WorldModel producer removed from `MapOrchestrator`, `ctx.worldModel` removed from context, RNG/TerrainBuilder cleanup with validation and tests (foundation smoke + config wiring).
- **Gaps:** Foundation producer still falls back to `globalThis.GameplayMap` for latitude/water in `computeWinds`/`computeCurrents`, violating the adapter-only boundary and “no silent fallbacks” guardrail.
- **Follow-up:** Remove GameplayMap fallbacks and fail fast when adapter hooks are missing (or pass adapter-only functions explicitly).
