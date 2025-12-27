---
id: M5-U07
title: "[M5] Delete dead/compat/deprecation-only surfaces (make “no dead code” true)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Stop shipping transitional affordances: delete legacy entrypoints, compat aliases/no-ops, unused shims, and deprecated/no-op schema fields.

## Goal

Make the public surface truthful. If something exists only “just in case,” it keeps the repo in transition forever; M5 deletes those surfaces and enforces “no legacy” invariants.

## Deliverables

- Delete legacy stub entrypoints, back-compat aliases/no-ops, and unused shims across mapgen packages.
- Delete deprecated/no-op config keys from schemas (or reject loudly) so config does not accept legacy-only fields.
- Audit package exports and tighten them so only real, supported surfaces remain.
- Establish/refresh “no legacy surface” invariant checks (zero-hit checks) as guardrails.

## Acceptance Criteria

- Dead exports/entrypoints are deleted (not merely deprecated).
- Deprecated/no-op config keys are removed or rejected loudly; no “compat parse” in the target architecture.
- Public exports are tightened (no compat-only exports remain).
- “No legacy surface” invariants are true (zero hits in runtime sources).

## Testing / Verification

- Workspace typecheck/build remains green.
- Standard smoke test remains green under `MockAdapter`.
- Suggested guardrails (exact patterns refined in prework): `rg`-based zero-hit checks for legacy namespaces/surfaces.

## Dependencies / Notes

- **Sequencing:** best after M5-U02–U06 extraction so deletions don’t fight relocations; some deletions can run in parallel once confirmed unused.
- **Complexity × parallelism:** low–medium complexity, high parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer hard deletion + fast failure over “keep legacy behind a compat layer.”
- Treat any remaining external consumers as a release-note/breaking-change problem, not a reason to keep shims indefinitely.

## Prework Prompt (Agent Brief)

Goal: produce a complete deletions inventory so implementation is a deterministic cleanup pass.

Deliverables:
- A deletions inventory for mapgen packages: dead exports, deprecated schema fields, unused shims, runtime-only compat modules.
- For each item: (a) in-repo consumer check, (b) likelihood of external consumers, (c) whether removal must be gated by a coordinated change outside this repo.
- A proposed set of “no legacy surface” `rg` checks that should be zero-hit by end of M5 (suitable for CI guardrails).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths) to avoid missing transitive consumers. Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

Goal: produce a deterministic “delete list” (exports + schema keys + shims) with consumer checks so implementation is mostly mechanical removal + guardrails.

### 1) Deletions inventory (mapgen-core focus)

#### A) Dead / legacy entrypoints + exports

| Surface | Location | In-repo consumer check | External consumer risk | Notes / gating |
| --- | --- | --- | --- | --- |
| `MapOrchestrator` legacy class | `packages/mapgen-core/src/MapOrchestrator.ts` | `rg -n "\\bMapOrchestrator\\b" packages/mapgen-core/src` matches only the file itself | Medium | It already throws (“removed”) and is otherwise unused; deletion is a breaking change for any out-of-repo consumer still importing it. |
| `addMountainsCompat` export | `packages/mapgen-core/src/domain/morphology/mountains/index.ts` + `apply.ts` | `rg -n "addMountainsCompat" packages/` matches only the export + docs/_archive | Low–medium | Appears to be a historical compat helper; no in-repo runtime use. |

#### B) Back-compat-only type aliases / no-op APIs

| Surface | Location | In-repo consumer check | External consumer risk | Notes / gating |
| --- | --- | --- | --- | --- |
| `MapConfig` alias of `MapGenConfig` | `packages/mapgen-core/src/bootstrap/runtime.ts` + `packages/mapgen-core/src/bootstrap/types.ts` | Used in tests (`packages/mapgen-core/test/pipeline/*.test.ts`) | Medium | Public type alias; remove once downstream is migrated to `MapGenConfig`. |
| `resetBootstrap()` no-op | `packages/mapgen-core/src/bootstrap/entry.ts` | Used in `packages/mapgen-core/test/bootstrap/entry.test.ts` | Medium | Pure compat; safe to delete after updating tests and any docs. |

#### C) Deprecated / legacy-only schema keys

| Key(s) | Location | In-repo consumer check | External consumer risk | Notes / gating |
| --- | --- | --- | --- | --- |
| Top-level `diagnostics.*` (deprecated/no-op) | `packages/mapgen-core/src/config/schema.ts` (`DiagnosticsConfigSchema`) | `rg -n "\\.diagnostics\\b" packages/mapgen-core/src` shows runtime reads only from `foundation.diagnostics` | Medium | Schema-accepted legacy; should be removed or rejected loudly. |
| Legacy landmass fallbacks (`crustContinentalFraction`, `crustClusteringBias`) | `packages/mapgen-core/src/config/schema.ts` + `packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts` | Still referenced by runtime as fallback reads | Medium | Not “dead” yet, but explicitly back-compat; can be deleted once configs are migrated. |
| Internal/alias schemas that exist for plumbing | `packages/mapgen-core/src/config/schema.ts` (`FoundationSurfaceConfigSchema`, `FoundationPolicyConfigSchema`, `FoundationOceanSeparationConfigSchema`) | No obvious runtime consumers beyond config acceptance | Low–medium | Marked `[internal]`; good candidates for deletion once M5 extraction stabilizes and config ownership is clarified. |

### 2) Proposed “no legacy surface” rg checks (CI-friendly)

These are intended to be zero-hit in runtime sources once U07 is complete (tighten glob patterns during implementation):
- Legacy entrypoints:
  - `rg -n \"\\bMapOrchestrator\\b\" packages/ mods/`
  - `rg -n \"\\bresetBootstrap\\b\" packages/ mods/`
  - `rg -n \"\\bMapConfig\\b\" packages/ mods/` (after migration)
- Legacy/compat helpers:
  - `rg -n \"addMountainsCompat\" packages/`
- Deprecated config surfaces:
  - `rg -n \"\\bDiagnosticsConfigSchema\\b|\\bdiagnostics\\b\" packages/mapgen-core/src/config/schema.ts`
  - `rg -n \"crustContinentalFraction|crustClusteringBias\" packages/`

### 3) Notes on gating / coordination

Where external consumer risk is non-trivial (public exports + config keys):
- Prefer hard-delete with clear release notes rather than keeping compat parsing.
- For in-repo consumers (tests + `mods/mod-swooper-maps`), do the migration in the same PR as the deletion.
