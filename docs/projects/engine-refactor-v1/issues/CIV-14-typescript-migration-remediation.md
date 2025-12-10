---
id: CIV-14
title: "[M-TS-P0] TypeScript Migration Remediation"
state: planned
priority: 1
estimate: 13
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [bug, technical-debt, architecture]
parent: null
children: [CIV-15, CIV-16, CIV-17, CIV-18, CIV-19, CIV-20, CIV-21, CIV-22, CIV-23]
blocked_by: []
blocked: [CIV-8]
related_to: [CIV-7]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Emergency remediation for the TypeScript migration that compiles successfully but produces no runtime output ("Null Map Script"). Three foundational breaks must be fixed before CIV-8 E2E validation can complete.

> **Context:** The TypeScript migration (CIV-1 through CIV-13) succeeded at the compilation gate but failed at runtime orchestration. The system builds, deploys, and loads—but generates nothing. This issue tracks the structured fix organized into four Graphite stacks.

## Problem Statement

### The "Null Map Script" Phenomenon

The migrated TypeScript mod:
- Compiles without errors
- Bundles correctly with external `/base-standard/` imports
- Deploys to the game folder
- Loads in Civ7 without module errors
- **Produces no terrain output** — all 14 stages are skipped

### Root Cause Chain

1. **Config Air Gap** (`bootstrap/entry.ts:118` vs `tunables.ts:161`)
   - `bootstrap()` accepts `stageConfig` → stores in `config.stageConfig`
   - `buildTunablesSnapshot()` reads from `config.stageManifest` (not stageConfig)
   - `stageManifest` defaults to empty `{}`
   - `stageEnabled()` always returns `false`

2. **Adapter Anti-Pattern** (`MapOrchestrator.ts:734`)
   - Dynamic `require("./core/adapters.js")` — file doesn't exist in build
   - Falls back to `createFallbackAdapter()` using globals
   - The `@civ7/adapter` package is never instantiated

3. **Story Void** (`story/tagging.ts` never created)
   - `StoryTags` exist as types but nothing populates them
   - Climate/biomes/features depend on margin/hotspot/rift tags
   - All story-aware code paths are no-ops

4. **FoundationContext Bypass** (layers import `WorldModel` directly)
   - `ctx.foundation` (immutable snapshot) already exists and is populated
   - Layers import `WorldModel` singleton instead of reading from `ctx.foundation`
   - This regressed from the original JS refactor that removed "legacy worldModel shims"

## Remediation Strategy

Organized into 4 Graphite stacks with clear dependencies:

| Stack | Phase | Goal | Exit Condition |
|-------|-------|------|----------------|
| **1** | P0-A.1 | Fix shape | Adapter injected, layers read `ctx.foundation`, lifecycle documented |
| **2** | P0-A.2 | Enable behavior | `stageEnabled()` returns true, stages execute |
| **3** | P0-B | Wire to engine | Biomes/features/placement call real Civ7 APIs |
| **4** | P0-C | Validate | Tests pass, CIV-8 in-game verification complete |

## Sub-Issues

### Stack 1: Shape Fixes (P0-A.1)
- [ ] [CIV-15: Fix Adapter Boundary & Orchestration Wiring](CIV-15-fix-adapter-boundary.md)
- [ ] [CIV-16: Migrate Layers to FoundationContext Consumption](CIV-16-foundationcontext-consumption.md)

### Stack 2: Enable Behavior (P0-A.2)
- [ ] [CIV-17: Implement Config→Manifest Resolver](CIV-17-config-manifest-resolver.md)
- [ ] [CIV-18: Fix Biomes & Climate Call-Sites](CIV-18-callsite-fixes.md)

### Stack 3: Wire to Engine (P0-B)
- [ ] [CIV-19: Biomes & Features Adapter Integration](CIV-19-biomes-features-adapter.md)
- [ ] [CIV-20: Placement Adapter Integration](CIV-20-placement-adapter.md)
- [ ] [CIV-21: Reactivate Minimal Story Tagging](CIV-21-story-tagging.md)
- [ ] [CIV-22: Restore Map-Size Awareness](CIV-22-map-size-awareness.md)

### Stack 4: Validation (P0-C)
- [ ] [CIV-23: Integration & Behavior Tests](CIV-23-integration-tests.md)
- Completes: [CIV-8: Validate End-to-End](CIV-8-validate-end-to-end.md)

## Acceptance Criteria

- [ ] Pipeline no longer "null script" — stages actually execute
- [ ] Adapter boundary lint passes (no `/base-standard/` in mapgen-core outside adapter)
- [ ] Layers read from `ctx.foundation`, not `WorldModel` singleton
- [ ] `stageEnabled("foundation")` returns `true` when configured
- [ ] Biomes, features, and placement call real Civ7 APIs via adapter
- [ ] Integration tests prove stages execute with MockAdapter
- [ ] CIV-8 in-game validation passes (map generates with visible terrain)

## Dependencies / Notes

- **Blocked by**: Nothing (this is the critical path)
- **Blocks**: CIV-8 (E2E validation cannot complete until pipeline works)
- **Related to**: CIV-7 (migration work that introduced these issues)

### Why This Happened

The TypeScript migration (CIV-1 through CIV-13) was treated as a "blind port" — converting syntax while preserving structure. This worked for compilation but failed to account for:

1. **The original JS architecture was already broken** in subtle ways (globals fallback, config indirection)
2. **The TS migration ported the broken patterns** faithfully, including vestigial code paths
3. **The gate criteria (CIV-8) focused on build artifacts**, not runtime behavior
4. **The FoundationContext migration from the original refactor was incomplete** — TS ported the singleton pattern that was supposed to be removed

### Lessons for Future Gates

- Gate criteria must include **behavioral verification**, not just compilation
- "Builds successfully" ≠ "Works correctly"
- Migration gates should include minimal smoke tests with MockAdapter
- Follow-up work: Add adapter boundary lint to CI so violations fail builds

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Graphite Stack Dependencies

```
Stack 1 (Shape) ─────────────┐
  CIV-15 Adapter Boundary    │
  CIV-16 FoundationContext   │
                             ▼
Stack 2 (Behavior) ──────────┐
  CIV-17 Config Resolver     │
  CIV-18 Call-Site Fixes     │
                             ▼
Stack 3 (Engine) ────────────┐
  CIV-19 Biomes/Features     │
  CIV-20 Placement           │
  CIV-21 Story Tagging       │
  CIV-22 Map-Size            │
                             ▼
Stack 4 (Validation) ────────┘
  CIV-23 Tests
  CIV-8 E2E (completes)
```

Each stack depends on the previous. Stack N+1 cannot merge until Stack N is complete.

### Reference Documents

- **Analysis**: `docs/projects/engine-refactor-v1/reviews/M-TS-typescript-migration-review.md`
- **Canvas**: `docs/projects/engine-refactor-v1/reviews/M-TS-typescript-migration-canvas.md`
- **Remediation**: `docs/projects/engine-refactor-v1/reviews/M-TS-typescript-migration-remediation.md`
- **Prioritization**: `docs/projects/engine-refactor-v1/reviews/M-TS-typescript-migration-prioritization.md`

### Quick Navigation

- [TL;DR](#tldr)
- [Problem Statement](#problem-statement)
- [Remediation Strategy](#remediation-strategy)
- [Sub-Issues](#sub-issues)
- [Acceptance Criteria](#acceptance-criteria)
- [Dependencies / Notes](#dependencies--notes)
