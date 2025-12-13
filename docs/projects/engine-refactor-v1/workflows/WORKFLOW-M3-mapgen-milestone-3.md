# WORKFLOW: Milestone 3 - Core Engine Refactor & Config Evolution

**Milestone ID:** `M3-core-engine-refactor-config-evolution`
**Status:** Active
**Last Updated:** 2025-12-13

> Execution path for M3 with task dependencies, sequencing, and parallelization.

---

## Quick Navigation (AGENTS.md Breadcrumbs)

| Category | Location |
|----------|----------|
| **Milestone** | `docs/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md` |
| **Project** | `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md` |
| **Architecture** | `docs/system/libs/mapgen/architecture.md` |
| **Pipeline PRD** | `docs/projects/engine-refactor-v1/resources/PRD-pipeline-refactor.md` |
| **Config PRD** | `docs/projects/engine-refactor-v1/resources/PRD-config-refactor.md` |
| **Parity Matrix** | `docs/projects/engine-refactor-v1/resources/STATUS-M-TS-parity-matrix.md` |
| **Code** | `packages/mapgen-core/src/` |

---

## M3 Objectives

1. **Pipeline:** All stages as `MapGenStep`s with `requires`/`provides`
2. **Config:** Step-aligned `MapGenConfig` via `context.config`
3. **Products:** Canonical `FoundationContext`, `Heightfield`, `ClimateField`, `StoryOverlays`
4. **Story:** Complete corridors, swatches, paleo

---

## Execution Phases

```
Phase A: Pipeline Infrastructure
    ↓
Phase B: Config Integration (PRD Phase 2)
    ↓
Phase C ─┬─> Legacy Wrappers ──────┬─> Phase D: Config Evolution
         └─> Story System ─────────┘       ↓
                                      Phase E: Validation
```

---

## Phase A: Pipeline Infrastructure

**Goal:** `MapGenStep`, `StepRegistry`, `PipelineExecutor`

| Issue | Summary | Estimate |
|-------|---------|----------|
| [LOCAL-M3-PIPELINE](../issues/LOCAL-M3-pipeline-infrastructure.md) | Core primitives: interface, registry, executor | 3 |
| [LOCAL-M3-CONTEXT-ARTIFACTS](../issues/LOCAL-M3-context-artifacts.md) | MapGenContext.artifacts container | 2 |
| [LOCAL-M3-FOUNDATION-PILOT](../issues/LOCAL-M3-foundation-pilot.md) | Foundation as first pipeline step | 3 |

**Dependency Chain:** PIPELINE → CONTEXT-ARTIFACTS → FOUNDATION-PILOT

---

## Phase B: Config Integration

**Goal:** `context.config` as single read path (PRD Phase 2)

| Issue | Summary | Estimate |
|-------|---------|----------|
| [LOCAL-M3-CONFIG-INTEGRATION](../issues/LOCAL-M3-config-integration.md) | Sub-schema mapping, config helper | 3 |
| [LOCAL-M3-TUNABLES-REDUCTION](../issues/LOCAL-M3-tunables-reduction.md) | Audit and migrate consumers | 2 |

**Dependency Chain:** CONFIG-INTEGRATION → TUNABLES-REDUCTION

---

## Phase C: Legacy Wrappers + Story System

**Goal:** Full pipeline coverage, complete story port

### Track 1: Legacy Wrappers

| Issue | Summary | Estimate |
|-------|---------|----------|
| [LOCAL-M3-LEGACY-WRAPPERS](../issues/LOCAL-M3-legacy-wrappers.md) | 5 wrapper steps (morphology, hydrology, climate, biomes, placement) | 4 |

### Track 2: Story System

| Issue | Summary | Estimate |
|-------|---------|----------|
| [LOCAL-M3-STORY-SYSTEM](../issues/LOCAL-M3-story-system.md) | Corridors, swatches, paleo, step wrapping | 4 |

### Convergence

| Issue | Summary | Estimate |
|-------|---------|----------|
| [LOCAL-M3-DATA-PRODUCTS](../issues/LOCAL-M3-data-products.md) | Canonical products, consumer migration | 3 |

**Parallelism:** LEGACY-WRAPPERS ∥ STORY-SYSTEM → DATA-PRODUCTS

---

## Phase D: Config Shape Evolution

**Goal:** Flat config shape, tunables retirement (PRD Phase 3)

| Issue | Summary | Estimate |
|-------|---------|----------|
| [LOCAL-M3-CONFIG-EVOLUTION](../issues/LOCAL-M3-config-evolution.md) | New shape, migration adapters | 3 |
| [LOCAL-M3-TUNABLES-RETIREMENT](../issues/LOCAL-M3-tunables-retirement.md) | Remove facades, minimal shim | 2 |

**Dependency Chain:** CONFIG-EVOLUTION → TUNABLES-RETIREMENT

---

## Phase E: Validation & Cleanup

**Goal:** Enforcement, documentation, sign-off

| Issue | Summary | Estimate |
|-------|---------|----------|
| [LOCAL-M3-VALIDATION](../issues/LOCAL-M3-validation.md) | requires/provides enforcement, cycle detection | 2 |
| [LOCAL-M3-DOCS-CLEANUP](../issues/LOCAL-M3-docs-cleanup.md) | Doc updates, parity matrix cleanup | 2 |

---

## Full Dependency Graph

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                         Phase A                               │
                    │  LOCAL-M3-PIPELINE                                           │
                    │         ↓                                                     │
                    │  LOCAL-M3-CONTEXT-ARTIFACTS                                  │
                    │         ↓                                                     │
                    │  LOCAL-M3-FOUNDATION-PILOT                                   │
                    └──────────────────────┬───────────────────────────────────────┘
                                           ↓
                    ┌──────────────────────────────────────────────────────────────┐
                    │                         Phase B                               │
                    │  LOCAL-M3-CONFIG-INTEGRATION → LOCAL-M3-TUNABLES-REDUCTION   │
                    └──────────────────────┬───────────────────────────────────────┘
                                           ↓
          ┌────────────────────────────────┴────────────────────────────────┐
          │                              Phase C                             │
          │   ┌─────────────────────┐           ┌─────────────────────┐    │
          │   │ LOCAL-M3-LEGACY-    │           │ LOCAL-M3-STORY-     │    │
          │   │ WRAPPERS            │           │ SYSTEM              │    │
          │   └─────────┬───────────┘           └─────────┬───────────┘    │
          │             └─────────────┬───────────────────┘                 │
          │                           ↓                                      │
          │              LOCAL-M3-DATA-PRODUCTS                             │
          └────────────────────────────┬────────────────────────────────────┘
                                       ↓
          ┌────────────────────────────────────────────────────────────────┐
          │                         Phase D                                 │
          │  LOCAL-M3-CONFIG-EVOLUTION → LOCAL-M3-TUNABLES-RETIREMENT      │
          └────────────────────────────┬───────────────────────────────────┘
                                       ↓
          ┌────────────────────────────────────────────────────────────────┐
          │                         Phase E                                 │
          │  LOCAL-M3-VALIDATION  →  LOCAL-M3-DOCS-CLEANUP                 │
          └────────────────────────────────────────────────────────────────┘
```

---

## Total Estimates

| Phase | Issues | Points |
|-------|--------|--------|
| A | 3 | 8 |
| B | 2 | 5 |
| C | 3 | 11 |
| D | 2 | 5 |
| E | 2 | 4 |
| **Total** | **12** | **33** |

---

## Acceptance Criteria (Milestone)

- [ ] All major stages run as `MapGenStep`s with `requires`/`provides`
- [ ] `MapGenConfig` step-aligned, consumed via `context.config`
- [ ] Tunables retired or reduced to minimal shim
- [ ] Downstream stages use canonical products (not globals)
- [ ] Story system complete: corridors, swatches, paleo
- [ ] Build passes: `pnpm build && pnpm test && pnpm check-types`

---

## Commands

```bash
# Type check
pnpm -C packages/mapgen-core run check-types

# Test
pnpm -C packages/mapgen-core test

# Full build
pnpm build

# Deploy mods
pnpm deploy:mods
```

---

## Related

- **Prerequisite:** [M2-stable-engine-slice](../milestones/M2-stable-engine-slice.md)
- **Follow-up:** [M4-tests-validation-cleanup](../milestones/M4-tests-validation-cleanup.md)
