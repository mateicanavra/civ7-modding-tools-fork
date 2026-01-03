---
milestone: M6
id: M6-review
status: draft
reviewer: AI agent
---

# Engine Refactor v1 — Milestone M6 Review

## LOCAL-TBD-M6-U11 — Canonicalize ecology domain operation modules

### Quick take
Mostly yes: the ecology `ops/**` layer now matches the intended “pure ops + strict kinds + key-based plans” contract. The remaining gaps are primarily (1) runtime validation looseness for plot-effect keys and (2) continued adapter usage in non-op ecology exports (biome bindings), which conflicts with the issue’s “engine binding lives in steps” target outcome.

### What’s strong
- `mods/mod-swooper-maps/src/domain/ecology/ops/**` is contract-pure (no adapter/TraceScope/devLogJson/Type.Any; typed-array schemas used).
- Strict op kinds/naming: single `compute` (`classifyBiomes`); placements/embellishments are verb-forward `plan*`.
- Key-based plans are applied at the step boundary with explicit key→engine-ID resolution and “throw on unknown key” guardrails.
- Legacy baseline strategy is gone from the `features` step (`addFeatures` / `useEngineBaseline` removed).

### High-leverage issues
- **Plot-effect key validation is effectively “any string” at the op boundary.**
  - `PlotEffectKey` is typed as `` `PLOTEFFECT_${string}` `` but the op schema is `Type.String()`, so `runValidated` doesn’t enforce prefix/shape; typos only fail later during apply-time adapter resolution.
  - Direction: add at least a schema-level `pattern: "^PLOTEFFECT_"` (or an explicit key set if the mod expects a bounded list) so invalid outputs/config fail at the op boundary.
- **Non-op ecology exports still perform engine binding.**
  - `mods/mod-swooper-maps/src/domain/ecology/biome-bindings.ts` exports `resolveEngineBiomeIds(adapter, ...)`, which conflicts with the issue’s “engine binding/logging lives strictly in the step layer” framing.
  - Direction: move adapter-dependent binding helpers into the `biomes` step (or an explicit step-scoped helper module) and keep `src/domain/ecology/**` engine-agnostic outside the step boundary.

### Implementation decisions review
- Logged decisions reviewed: 3 (D5 deterministic RNG via seed; D6 diagnostics/logging step-owned; D7 split embellishments into two plan ops).
- Unlogged decisions noticed: 1 (plot-effect key validation relies on apply-time engine lookup rather than op-boundary validation).
- Side-effect risks: D5 distribution changes are expected; plot-effect key validation gap delays failure to runtime apply stage.

### Recommended next moves
- Tighten plot-effect key schema validation to fail early at `runValidated`.
- Align biome engine binding placement with the intended step/domain boundary (move adapter-dependent helper out of `src/domain/ecology/**`).

