# Debate Scratchpad — Artifact “Realized Snapshot” Layer (Rejected)

## Status / Canonicality

This file is **NOT CANONICAL**. It records a Phase 2 design exploration that was later rejected.

Canonical Phase 2 uses:
- `artifact:map.*` for Gameplay-owned projection/annotation/observability layers
- `effect:map.<thing>Plotted` for short boolean execution guarantees

## What was explored (rejected)

An earlier exploration proposed adding a second, “realized snapshot” artifact layer (“post-stamp map state”), primarily to encode “stamping happened” and to capture engine-derived state without requiring later steps to read the engine.

We are not doing that.

## Why it was rejected

- Execution guarantees are represented by `effect:map.<thing>Plotted` only; no extra “realized snapshot” artifact namespace.
- A “realized snapshot” layer invites receipts/versioning and tends to become an engine-coupled dumping ground.
- It adds schema surface area and authoring complexity without clear Phase 2 value.

## Canonical replacement pattern

- If a later step needs engine-derived values (e.g., elevation bands, cliff crossings), it must:
  - run after the relevant `effect:map.<thing>Plotted`, and
  - read the engine surfaces directly (or consume `artifact:map.*` projections produced after the effect).
- Physics never consumes `artifact:map.*` and never reads engine surfaces directly.
