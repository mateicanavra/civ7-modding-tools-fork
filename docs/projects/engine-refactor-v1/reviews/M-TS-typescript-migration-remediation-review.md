---
id: M-TS-remediation-review
milestone: M-TS-typescript-migration
title: "M-TS: TypeScript Migration Remediation – Aggregate Review"
status: draft
reviewer: AI agent (Codex CLI)
---

# M-TS: TypeScript Migration Remediation – Aggregate Review

This document aggregates task-level reviews for the post-migration remediation stack
focused on fixing the TypeScript migration’s "null script" behavior and restoring
runtime correctness: CIV-15 (Adapter Boundary & Orchestrator), CIV-16 (FoundationContext
consumption), and related follow-ups.

---

## CIV-15 – Fix Adapter Boundary & Orchestration Wiring

**Intent / AC (short)**  
Centralize engine adapter construction around `@civ7/adapter` in `MapOrchestrator` and introduce a guardrail that prevents `/base-standard/...` imports from leaking outside the adapter package, while keeping the codebase usable and testable.

**Strengths**
- Replaces dynamic `require("./core/adapters.js")` and the global fallback adapter with a clear, testable adapter selection strategy:
  - `adapter` → `createAdapter` → `new Civ7Adapter(width, height)`.
- Adds `scripts/lint-adapter-boundary.sh` and a `lint:adapter-boundary` npm script to enforce the adapter boundary with an explicit allowlist.
- Keeps changes narrowly focused on orchestrator wiring and linting, which is appropriate for an architectural remediation issue.

**Issues / gaps**
- JSDoc on `createAdapter` slightly misrepresents the defaulting behavior compared to the implementation.
- The adapter-boundary lint is not yet integrated into the main lint/CI pipeline; enforcement is available but not guaranteed.
- `MapOrchestrator.ts` and `layers/placement.ts` still contain `/base-standard/...` imports and rely on allowlist entries instead of fully honoring the adapter boundary.
- No explicit tests assert adapter selection behavior in `MapOrchestrator`.

**Suggested follow-up**
- Wire `lint:adapter-boundary` into CI or `pnpm lint` and treat allowlisted files as temporary debt with clear owning issues.
- Add small tests to verify adapter precedence and default construction logic.
- In subsequent placement/story/biomes/feature integration tasks, move remaining `/base-standard/...` imports behind `@civ7/adapter` and remove the corresponding files from the allowlist.

---

## CIV-16 – Migrate Layers to FoundationContext Consumption

**Intent / AC (short)**  
Move tectonics- and climate-related layers off the `WorldModel` singleton onto `ctx.foundation` (immutable snapshot), centralize `BOUNDARY_TYPE` in a shared module, and confine `WorldModel.init/reset` usage to the orchestrator to support testability and multi-run determinism.

**Strengths**
- Updated key layers (`landmass-plate.ts`, `coastlines.ts`, `mountains.ts`, `volcanoes.ts`, `landmass-utils.ts`, `climate-engine.ts`) to consume `ctx.foundation.plates` / `.dynamics` instead of importing `WorldModel` directly.
- Introduced `world/constants.ts` as the shared home for `BOUNDARY_TYPE`, so layers don’t need to import the singleton for enum values.
- Implemented a robust `FoundationContext` in `core/types.ts` with validation and frozen snapshots, and wired it into `MapOrchestrator.initializeFoundation`.
- Restricted `WorldModel` usage in TS source to the orchestrator and the world module itself, improving isolation and testability.

**Issues / gaps**
- ~~`WorldModel.reset()` is implemented but never called in `MapOrchestrator.generateMap`, so world fields are not recomputed across runs and can drift from current tunables.~~ **FIXED**: Added `WorldModel.reset()` call at the start of `generateMap()`.
- ~~Physics-driven stages tolerate missing `ctx.foundation` via silent fallbacks (fractals-only, no volcanoes, no ocean separation) rather than failing fast, which can mask manifest or wiring issues.~~ **FIXED**: Added `assertFoundationContext()` guard to all foundation-dependent stages.
- No dedicated tests assert that layers depend only on `FoundationContext` (and not `WorldModel`) or that their behavior updates when `FoundationContext` changes.

**Suggested follow-up**
- ~~Add a `WorldModel.reset()` call at the start of `MapOrchestrator.generateMap` and consider passing explicit dimensions into `WorldModel.init` for better testability.~~ **DONE**
- ~~Introduce `assertFoundationContext` (or equivalent checks) for all stages that require foundation data (`landmassPlates`, `mountains`, `volcanoes`, `climateBaseline`, `climateRefine`) and surface failures via `StageResult`.~~ **DONE**
- Add small unit/integration tests that construct synthetic `ExtendedMapContext` + `FoundationContext` and exercise the migrated layers, ensuring they remain decoupled from `WorldModel` and respond correctly to changes in plate/dynamics fields.

