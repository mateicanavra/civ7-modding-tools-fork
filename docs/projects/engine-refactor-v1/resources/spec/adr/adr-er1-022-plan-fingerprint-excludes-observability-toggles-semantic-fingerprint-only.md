---
id: ADR-ER1-022
title: "Plan fingerprint excludes observability toggles (semantic fingerprint only)"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: stable
system: mapgen
component: engine-runtime
concern: observability
supersedes: []
superseded_by: null
sources:
  - "CIV-66-M4-SAFETY-NET (plan fingerprint determinism + CI)"
  - "local-tbd-m4-safety-1-tracing-model-and-fingerprint (explicit exclusions + algorithm sketch)"
  - "M4-target-architecture-cutover-legacy-cleanup (Phase A/C sequencing: observability early; CI gate post-cutover)"
---

# ADR-ER1-022: Plan fingerprint excludes observability toggles (semantic fingerprint only)

## Context

M4 adds step-level tracing and CI smoke tests. We need a deterministic `planFingerprint` to correlate runs and keep CI stable, but observability toggles (verbosity / sinks) must not change execution semantics or cause spurious “different plan” IDs.

## Decision

- The `planFingerprint` is a **semantic** fingerprint of:
  - normalized recipe (ordered step occurrences),
  - resolved per-occurrence config (after defaults),
  - settings that affect semantics (seed + other cross-cutting policies like directionality).
- Pure observability knobs (trace enablement/verbosity/sink selection) are **excluded** from `planFingerprint`.
- If we need to correlate “same plan under different trace config,” use a separate optional `traceConfigFingerprint` (do not overload the semantic fingerprint).

## Consequences

- SAFETY-1/SAFETY-2 can rely on a stable `planFingerprint` in CI regardless of trace verbosity changes.
- RunRequest `settings` should clearly separate “semantics” vs “observability” so fingerprinting stays unambiguous.
