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
- Delete deprecated/no-op config keys from schemas and make config validation fail fast (no silent ignore) so config does not accept legacy-only fields.
- Audit package exports and tighten them so only real, supported surfaces remain.
- Establish/refresh “no legacy surface” invariant checks (zero-hit checks) as guardrails.

## Acceptance Criteria

- Dead exports/entrypoints are deleted (not merely deprecated).
- Deprecated/no-op config keys are removed and rejected loudly; no “compat parse” in the target architecture.
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

## Implementation Decisions

- Deleted legacy stub entrypoints and no-op compatibility hooks (`MapOrchestrator`, `resetBootstrap`, `MapConfig` alias).
- Removed legacy top-level `diagnostics` config surface; only `foundation.diagnostics` remains supported.
- Deleted shim exports for step/layer wiring under `@mapgen/pipeline/*`; base pipeline wiring now lives only under `@mapgen/base/*`.
- Moved artifact publish/get helpers to `@mapgen/base/pipeline/artifacts` and updated all in-repo consumers.

## Prework Findings (Complete)

Goal: produce a deterministic “delete list” (exports + schema keys + shims) with consumer checks so implementation is mostly mechanical removal + guardrails.

### 1) Deletions inventory (mapgen-core focus)

#### A) Dead / legacy entrypoints + exports

```yaml
deletionsInventory:
  deadEntrypointsAndExports:
    - surface: MapOrchestrator legacy class
      location: packages/mapgen-core/src/MapOrchestrator.ts
      inRepoConsumerCheck: 'rg -n "\\bMapOrchestrator\\b" packages/mapgen-core/src matches only the file itself'
      externalConsumerRisk: medium
      notes: It already throws ("removed") and is otherwise unused; deletion is a breaking change for any out-of-repo consumer still importing it.
    - surface: addMountainsCompat export
      location:
        - packages/mapgen-core/src/domain/morphology/mountains/index.ts
        - packages/mapgen-core/src/domain/morphology/mountains/apply.ts
      inRepoConsumerCheck: 'rg -n "addMountainsCompat" packages/ matches only the export + docs/_archive'
      externalConsumerRisk: low-medium
      notes: Appears to be a historical compat helper; no in-repo runtime use.
```

#### B) Back-compat-only type aliases / no-op APIs

```yaml
deletionsInventory:
  compatTypeAliasesAndNoops:
    - surface: MapConfig alias of MapGenConfig
      location:
        - packages/mapgen-core/src/bootstrap/runtime.ts
        - packages/mapgen-core/src/bootstrap/types.ts
      inRepoConsumerCheck: packages/mapgen-core/test/pipeline/*.test.ts
      externalConsumerRisk: medium
      notes: Public type alias; remove once downstream is migrated to MapGenConfig.
    - surface: resetBootstrap() no-op
      location: packages/mapgen-core/src/bootstrap/entry.ts
      inRepoConsumerCheck: packages/mapgen-core/test/bootstrap/entry.test.ts
      externalConsumerRisk: medium
      notes: Pure compat; safe to delete after updating tests and any docs.
```

#### C) Deprecated / legacy-only schema keys

```yaml
deletionsInventory:
  deprecatedSchemaKeysAndAliases:
    - key: diagnostics.*
      location: packages/mapgen-core/src/config/schema.ts
      schemaSymbol: DiagnosticsConfigSchema
      inRepoConsumerCheck: 'rg -n "\\.diagnostics\\b" packages/mapgen-core/src shows runtime reads only from foundation.diagnostics'
      externalConsumerRisk: medium
      notes: Schema-accepted legacy; remove it and make validation fail fast if it appears.
    - key:
        - crustContinentalFraction
        - crustClusteringBias
      location:
        - packages/mapgen-core/src/config/schema.ts
        - packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts
      inRepoConsumerCheck: still referenced by runtime as fallback reads
      externalConsumerRisk: medium
      notes: Explicitly back-compat; delete once configs are migrated.
    - key:
        - FoundationSurfaceConfigSchema
        - FoundationPolicyConfigSchema
        - FoundationOceanSeparationConfigSchema
      location: packages/mapgen-core/src/config/schema.ts
      inRepoConsumerCheck: no obvious runtime consumers beyond config acceptance
      externalConsumerRisk: low-medium
      notes: Marked "[internal]"; delete once M5 extraction stabilizes and schema ownership is clarified.
```

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
