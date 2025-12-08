---
id: CIV-15-review
issue: CIV-15
title: "[CIV-15] Fix Adapter Boundary & Orchestration Wiring – TS Review"
milestone: M-TS-typescript-migration
branch: civ-15-fix-adapter-boundary
reviewer: AI agent (Codex CLI)
status: draft
---

# CIV-15 – Fix Adapter Boundary & Orchestration Wiring

**Context:**  
- **Milestone:** `M-TS-typescript-migration`  
- **Related issues:**  
  - CIV-2 – Create Centralized Adapter (`@civ7/adapter`)  
  - CIV-13 – Migrate Placement & Orchestrator  
- **Branch:** `civ-15-fix-adapter-boundary` (current Graphite PR)  

This review evaluates CIV-15 as a single task within the broader TS migration, using the current branch state as the implementation under review.

---

## 1. Quick Take

Mostly, with notable gaps.  
This change delivers the core of CIV-15: it cleans up `MapOrchestrator`’s adapter wiring (no more dynamic `require("./core/adapters.js")` or global fallback adapter) and introduces an adapter-boundary lint script with an explicit allowlist. It clearly moves the architecture in the right direction, but it stops short of full boundary enforcement (remaining `/base-standard/...` imports in the orchestrator and placement layer) and does not yet wire the lint into the standard lint/CI pipeline. As a result, CIV-15 is a solid step but not the final word on adapter boundary enforcement.

---

## 2. Intent & Assumptions

**Intent (inferred from code and milestone docs):**

- Make `@civ7/adapter` the canonical source of the Civ7 engine adapter for map generation.
- Remove ad-hoc adapter construction and silent fallbacks from `MapOrchestrator`.
- Introduce a repeatable, scriptable check that flags `/base-standard/...` imports outside `packages/civ7-adapter/**`.

**Assumptions (due to missing CIV-15 issue doc in this branch):**

- Full elimination of `/base-standard/...` imports from `mapgen-core` is *not* expected in CIV-15; that work is intentionally deferred to follow-up issues (e.g., placement adapter integration).
- Using an allowlist in the lint script is an explicitly sanctioned interim state rather than an oversight.

---

## 3. What’s Strong

- **Adapter injection semantics are clear and explicit.**  
  - `OrchestratorConfig` now supports:
    - `adapter?: EngineAdapter` – pre-built instance, highest priority.
    - `createAdapter?: (width: number, height: number) => EngineAdapter` – factory, second priority.
  - `createLayerAdapter()` implements a straightforward priority chain:
    1. `config.adapter` if provided  
    2. `config.createAdapter(width, height)` if provided  
    3. `new Civ7Adapter(width, height)` as the production default.
  - This neatly supports both production usage and test-time injection (`MockAdapter`).

- **Removal of dynamic require + fallback adapter.**  
  - The orchestrator no longer:
    - `require("./core/adapters.js")` at runtime, or
    - Falls back to a home-grown adapter that reaches into `GameplayMap`/`TerrainBuilder` globals.
  - This aligns with CIV-2’s “single adapter boundary” decision and reduces the chance of silent drift between “real” and “fallback” behavior.

- **Adapter boundary lint script is well structured.**  
  - `scripts/lint-adapter-boundary.sh`:
    - Searches `packages/**` for `/base-standard/` imports.
    - Excludes `civ7-adapter`, `.d.ts`, `dist/`, and obvious config files.
    - Uses an explicit allowlist for known violations (`MapOrchestrator.ts`, `layers/placement.ts`).
    - Distinguishes allowlisted vs. unapproved violations in the output.
  - Adding `lint:adapter-boundary` to root `package.json` makes this easy to integrate into CI.

- **Change surface is focused and low-risk.**  
  - Only three files are touched:
    - `packages/mapgen-core/src/MapOrchestrator.ts`
    - `scripts/lint-adapter-boundary.sh`
    - Root `package.json` (new script)
  - This scope matches the CIV-15 intent and is easy to reason about as a discrete unit of work.

---

## 4. High-Leverage Issues

### 4.1 Adapter default semantics vs comments

- **Issue:**  
  - JSDoc on `createAdapter` suggests it “defaults to Civ7Adapter”, but in practice:
    - `adapter` (if present) is used verbatim.
    - `createAdapter` is only called if provided.
    - Otherwise `new Civ7Adapter(width, height)` is instantiated directly.
- **Why it matters:**  
  - The code is correct; the comment is slightly misleading and could confuse future maintainers or test authors about when `createAdapter` is guaranteed to exist.
- **Direction:**  
  - Update the commentary to match the actual priority:
    - “Optional factory; if neither `adapter` nor `createAdapter` is provided, the orchestrator defaults to `new Civ7Adapter(width, height)`.”

### 4.2 Boundary lint not yet part of the primary lint/CI flow

- **Issue:**  
  - `lint:adapter-boundary` exists but there is no visible integration with `pnpm lint` or CI in this branch.
  - Without that wiring, the adapter boundary remains a soft convention; new `/base-standard/` imports outside `civ7-adapter` will not automatically fail builds.
- **Why it matters:**  
  - CIV-2’s acceptance criteria explicitly called for tooling to enforce the boundary. Until the script runs in CI, we rely entirely on manual discipline.
- **Direction:**  
  - Ensure CI or the main `lint` script calls `lint:adapter-boundary` (even if allowlisted violations exist).
  - Treat allowlisted entries as temporary debt and make their owning issues explicit (e.g., placement adapter work, orchestrator cleanup).

### 4.3 Remaining `/base-standard/...` imports in orchestrator and placement

- **Issue:**  
  - `MapOrchestrator.ts` still uses several `/base-standard/maps/...` modules via `require(...)`.
  - `layers/placement.ts` imports multiple `/base-standard/...` modules directly.
  - These files appear in the lint allowlist and are therefore tolerated.
- **Why it matters:**  
  - This is a deliberate deviation from the “adapter-only” rule but is easy to misinterpret as permanent.
  - If the allowlist is not aggressively burned down by future work, the boundary will erode over time.
- **Direction:**  
  - Ensure follow-up issues (e.g., “Placement Adapter Integration”) explicitly own the task of:
    - Moving these imports into `@civ7/adapter`.
    - Removing `MapOrchestrator.ts` and `placement.ts` from the allowlist.
  - Document in CIV-2 and the remediation plan that CIV-15 introduces a *phased* boundary and that full compliance is expected later.

### 4.4 Missing tests around adapter selection

- **Issue:**  
  - There are no tests in this branch that explicitly verify:
    - Injected `adapter` is used when present.
    - `createAdapter` is invoked when present and `adapter` is absent.
    - `Civ7Adapter` is constructed when both are missing.
- **Why it matters:**  
  - This is the core seam the rest of the remediation plan depends on. A regression in the priority order or construction path would be subtle but painful.
- **Direction:**  
  - Add small tests in `packages/mapgen-core/test` that:
    - Construct `MapOrchestrator` with a fake `adapter` and assert it is used.
    - Construct with only `createAdapter` and assert the factory is invoked.
    - (Optionally) exercise the default `Civ7Adapter` path behind a test-time shim or feature flag.

---

## 5. Fit Within the Milestone

- **Alignment:**  
  - Strongly aligned with CIV-2’s “centralized adapter boundary” decision and the migration’s long-term goal of keeping `mapgen-core` pure TS.
  - Removes a major architectural smell (dynamic require + global fallback adapter) and replaces it with clean injection.
  - Provides the foundation for future remediation tasks (biomes/features adapter integration, placement adapter refactor) without overreaching in one issue.

- **De-scoping (acceptable):**  
  - CIV-15 does *not* attempt to:
    - Move all `/base-standard/...` imports out of the orchestrator and placement layers.
    - Fully wire the lint into CI.
  - These omissions are acceptable as long as:
    - Follow-up issues and the prioritization doc clearly own the remaining work.
    - The allowlist is treated as temporary and is actively burned down.

- **Pattern for the milestone review:**  
  - CIV-15 is a good example of a **phased architectural hardening**:
    - Fix the construction pattern and add a guardrail.
    - Use later issues to eliminate individual violations.

---

## 6. Recommended Next Moves

- **Within CIV-15 (if still open to iteration):**
  - Update `OrchestratorConfig` comments to accurately describe adapter selection behavior.
  - Add a small test file (or extend an existing one) to verify adapter precedence and defaulting.

- **For follow-up issues:**
  - Integrate `lint:adapter-boundary` into the standard lint/CI pipeline so it runs on every change.
  - Assign clear ownership for removing each allowlisted file once its `/base-standard/...` imports are migrated behind `@civ7/adapter`.
  - Ensure placement/story/biomes/feature integration tasks explicitly remove their corresponding entries from the allowlist when done.

---

## 7. Milestone Review Entry (for aggregation)

The following entry is suitable for inclusion in the milestone-level review log (`M-TS-typescript-migration-review.md`):

```markdown
### CIV-15 – Fix Adapter Boundary & Orchestration Wiring

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
```

