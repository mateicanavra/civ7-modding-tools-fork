---
id: ADR-ER1-035
title: "Config normalization and derived defaults (beyond schema defaults)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: authoring-sdk
concern: config-normalization
supersedes: []
superseded_by: null
sources:
  - "SPEC-architecture-overview"
  - "SPEC-pending-step-domain-operation-modules"
---

# ADR-ER1-035: Config normalization and derived defaults (beyond schema defaults)

## Context

Schema defaults are necessary but often insufficient: some defaults are derived (e.g., a strategy-specific default that depends on other config values or on run settings). Without a consistent normalization model, defaults and “fixups” drift into runtime code paths and become hard to observe and validate.

## Config pipeline inventory (A–I)

This section captures the *current* sources of “normalization” and config shaping in the codebase, grouped by intent. The goal is to separate:
- legacy/compat shims that add noise,
- intentional target-architecture boundaries that should remain,
- and ambiguous patterns that need a decision (this ADR).

### Legacy-driven (compat / shims / organic complexity)

#### A) `StandardRecipeOverrides` + translation into per-step config

- **Where:**
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`
    - `type DeepPartial<T>`
    - `export type StandardRecipeOverrides = DeepPartial<MapGenConfig>`
    - `export function buildStandardRecipeConfig(...)`
- **What it does:** uses a global-ish, deep-partial “overrides” object as the author surface and then *constructs* a `StandardRecipeConfig` by mapping override fragments into per-stage/per-step config objects.
- **Why it exists:** compatibility with legacy “global overrides” authoring that predates the target “direct recipe config” model.
- **Classification:** legacy/transient (target architecture expects direct `RecipeConfigOf<typeof stages>` authoring; translation layers create drift risk).

#### B) Spread/merge + `{}` shells as a config assembly mechanism

- **Where:** `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (throughout `buildStandardRecipeConfig(...)`)
- **What it does:** uses `?? {}` and object spreads to synthesize nested config shapes (and to “ensure presence” of intermediate objects) during translation.
- **Why it exists:** it is the mechanical implementation of (A) in a file that is constructing a large nested object graph.
- **Classification:** legacy/transient (goes away when (A) is removed).

#### C) Casts over schema/config mismatches (or defensive “it might be undefined” coding)

- **Where:**
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (e.g., `as FoundationConfig`)
  - step implementations in `mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/*.ts` (e.g., `as LandmassConfig`, `as VolcanoesConfig`, etc.)
- **What it does:** coerces values at call sites instead of letting step schemas/types be the single source of truth.
- **Why it exists:** a mix of (A) translation, incremental refactors, and “defensive” patterns that assume `config.<field>` might be missing even when the step schema defaults make it present.
- **Classification:** mostly legacy/transient and drift/cleanup (should reduce as config authoring moves to direct recipe config and step schemas become canonical).

#### D) Mod config loader parsing unknown inputs into a config object

- **Where:** `mods/mod-swooper-maps/src/config/loader.ts` (`parseConfig`, `safe-parse helper`, `default-config helper`, `json-schema helper`, `public-schema helper`)
- **What it does:** takes `unknown` input, applies schema defaults/conversion/cleaning, and returns a typed config object (or structured errors).
- **Why it exists:** supports untyped config ingestion (JSON-like inputs) and schema export for tooling; it is not required for strictly-typed TS map authoring.
- **Classification:** boundary tool / optional; can be treated as legacy if the target authoring model is “TS recipe config only”, but may remain useful for external tooling and non-TS inputs.

### Intentional (target-architecture boundaries)

#### E) Execution-plan compilation canonicalizes untrusted inputs and produces explicit node configs

- **Where:** `packages/mapgen-core/src/engine/execution-plan.ts`
  - `parseRunRequest(...)` (run request shape validation + defaults/cleaning + unknown-key detection)
  - `normalizeStepConfig(...)` (per-step config defaults/cleaning + unknown-key detection)
  - `compileExecutionPlan(...)` (produces `ExecutionPlan.nodes[].config` for execution)
- **What it does:** turns a runtime-shaped `RunRequest` (`unknown`/untrusted in principle) into a deterministic `ExecutionPlan` whose nodes carry explicit, schema-shaped config values.
- **Why it exists:** runtime must be able to compile and validate non-TS inputs (and must not rely on TS for correctness). The plan is the execution contract and must be canonical and reproducible.
- **Classification:** intentional/staying (this is a core runtime boundary).

#### F) Strategy selection default-friendliness implies a normalization step

- **Where:** `packages/mapgen-core/src/authoring/op.ts` (`createOp` strategy union + default handling)
- **What it does:** supports a default-friendly authored config shape (strategy may be omitted when a default exists) while still selecting a concrete strategy implementation at call time.
- **Why it exists:** authoring ergonomics and type-safe strategy selection require multiple *authored* shapes for “the same” config intent.
- **Classification:** intentional/staying (this is DD-005’s core outcome).

### Accidental/unclear (requires a design decision)

#### G) Op-local defaulting inside `run(...)` (`Value.Default(...)` in ops)

- **Where:** ecology ops commonly default config inside `run(...)` (e.g., `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`)
- **What it does:** applies schema defaults at op entry and then uses “resolved config” to compute derived scalars.
- **Why it exists:** callers are not consistently passing fully defaulted/canonical op config; op authors defend against partial configs and normalize locally.
- **Classification:** accidental/unclear (needs an explicit rule about *where* op config is defaulted/canonicalized and whether ops should assume canonical config inputs).

#### H) Explicit resolver helpers that manufacture a “resolved” config shape

- **Where:** `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/schema.ts` (`resolvePlotEffectsConfig(...)`)
- **What it does:** takes an optional/partial config input and returns a fully expanded “resolved” config object with nested defaults applied.
- **Why it exists:** nested config ergonomics; avoids sprinkling defaults throughout algorithm logic.
- **Classification:** ambiguous: this may be the *right* pattern (a pure normalizer) but needs to be placed consistently (compile-time vs op-time) to preserve plan truthfulness and avoid duplicated normalization.

#### I) Step-local op-config construction and/or redundant defaulting

- **Where:** steps sometimes default op configs manually before calling ops (e.g., `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`)
- **What it does:** step takes its own step config and then applies another layer of defaulting/casting before calling a domain op.
- **Why it exists:** migration drift between step schema, op schema, and legacy global overrides; inconsistent adoption of canonical op config surfaces.
- **Classification:** accidental/cleanup (should be removed by aligning steps to op schemas and using the validated op entrypoints).

## Decision

- Configuration normalization is a **compile/validation concern**:
  - after schema defaults are applied, a deterministic normalization step may compute derived defaults and canonicalize shapes.
  - the compiled plan carries the final explicit config for each step occurrence.
- Normalization may depend on:
  - the authored config,
  - `RunRequest.settings`,
  - registry metadata (e.g., known dependency keys),
  - but not on runtime buffer state or engine callbacks.
- Runtime execution must not apply implicit config merges or hidden defaults; it consumes the compiled plan as-is.

## Options considered

1. **Schema defaults only**
   - Pros: simple
   - Cons: pushes real-world defaults into ad hoc runtime logic and breaks observability
2. **Explicit normalization phase (compile-time)**
   - Pros: deterministic; debuggable; supports richer authoring safely
   - Cons: requires a well-defined normalization hook surface
3. **Runtime-only defaults**
   - Pros: lowest up-front work
   - Cons: highest drift risk; hard to validate and reproduce

## Consequences

- The authoring SDK can expose helpers for normalization, but those helpers must produce explicit config in the plan.
- If a default depends on runtime state, it must be re-framed as:
  - an explicit input/setting, or
  - an explicit runtime-derived artifact/buffer dependency.
