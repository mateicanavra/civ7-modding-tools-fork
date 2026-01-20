# Draft Addendum — Braided `map.*` Projection Inside Morphology Phase

> **DRAFT / NOT CANONICAL**
> This document is a historical draft. Canonical Phase 2 spec surfaces live in `plans/morphology/spec/` and win on conflict.
> Naming note: canonical tags use `artifact:<ns>.<name>` (e.g. `artifact:map.*`). This file includes a quoted verbatim snapshot that uses historical `artifacts.map.*` wording; interpret that as `artifact:map.*`.

This draft captures (1) a verbatim snapshot of the agreed braided-stage pattern and (2) follow-on clarifications (now locked) so Phase 2 can be implemented without drift.

## Verbatim snapshot (from chat; do not edit)

```text
I understand your proposal: **one canonical path** where Physics truth artifacts feed a **braided Gameplay-owned stage inside the Morphology phase**, which **publishes a unified `artifacts.map.*` projection surface**, and downstream consumers use `map.*`. No “sometimes stamp directly”, no “legacy shims”.

Two holes to close explicitly (otherwise this gets leaky fast):
- **Backfeeding ban**: Physics stages (Morphology/Hydrology/Ecology/etc.) must be forbidden from reading `artifacts.map.*` (or the engine adapter) as inputs. `map.*` is for Gameplay/engine-facing steps only; Physics consumes Physics truth only.
- **“Engine-ready” definition**: to avoid engine coupling bleeding everywhere, define `map.*` as **projection intent** (stable, deterministic, adapter-agnostic codes/keys). Then a dedicated stamping step translates intent → engine IDs via `context.adapter`. (If `map.*` directly stores engine numeric IDs, you’ve reintroduced engine coupling into the data surface and made testing/reuse harder.)

## Restatement (zero conditional paths, zero shims)
- Morphology phase is a **braid of stages**:
  - Physics Morphology stages compute/update **truth artifacts** (`morphology.*`) only.
  - Interleaved Gameplay-owned “Map” stages compute **projection artifacts** (`map.*`) deterministically from Physics truth, then stamp via adapter.
- `map.*` is the **single canonical projection interface**. All engine-facing logic uses `map.*`; nothing else invents its own projection.
- Stamping always follows the same structure: **Truth → `map.*` projection → stamp**, with projection and stamping done in explicit steps (not ad-hoc “sometimes”).

## File tree (where it would live)
Example under the existing recipe layout:

```
mods/mod-swooper-maps/src/recipes/standard/
  stages/
    morphology-pre/                 # Physics (truth only)
      artifacts.ts                  # defines artifact:morphology.*
      steps/...
    morphology-mid/                 # Physics (truth only)
      artifacts.ts
      steps/...
    morphology-post/                # Physics (truth only, final truth freeze)
      artifacts.ts
      steps/...

    morphology-map/                 # Gameplay-owned, braided INSIDE Morphology phase
      artifacts.ts                  # defines artifact:map.* (unified projection namespace)
      steps/
        project-map.ts              # reads morphology.* truth -> writes map.* projection intent
        stamp-map.ts                # reads map.* -> writes to context.adapter (engine)

    hydrology-.../                  # Physics again (must not consume map.*)
    ecology/                        # Physics again (must not consume map.*)
    placement/                      # Gameplay/content (may consume map.* and/or adapter)
```

`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-map/artifacts.ts` is where you define the stable `map.*` surface (terrain/biomes/features/volcano intent, etc.). The only place those artifacts are authored is in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-map/steps/*`.

## ASCII pipeline diagram
```
[Morphology Phase — braided, stage order is fixed (no conditionals)]

  morphology-pre   (Physics)
    produces/updates: artifact:morphology.*  (truth)
            |
            v
  morphology-mid   (Physics)
    produces/updates: artifact:morphology.*  (truth)
            |
            v
  morphology-post  (Physics; truth freeze point)
    produces: artifact:morphology.*          (truth snapshots/handles)
            |
            v
  morphology-map   (Gameplay, braided inside Morphology phase)
    step: project-map
      reads:  artifact:morphology.*          (truth)
      writes: artifact:map.*                 (projection intent; stable interface)
    step: stamp-map
      reads:  artifact:map.*                 (projection intent)
      uses:   context.adapter                 (engine access)
      stamps: engine terrain/features/etc.

            |
            v
  hydrology-*      (Physics)
    reads: artifact:morphology.* (truth)
    FORBIDDEN: reading artifact:map.* or adapter as inputs

            |
            v
  ecology           (Physics)
    reads: physics truth artifacts only
```

If you want `map.*` available earlier than the Morphology truth freeze, you add another `morphology-map-*` stage in the fixed braid (still Truth → `map.*` → stamp), but you **never** introduce a second projection path.

If you confirm you want `map.*` to be “projection intent” (not raw engine numeric IDs), I can propose what the first-cut `map.*` artifact set should contain so it’s complete-but-sane (terrain intent, cliff intent, volcano intent, region tagging inputs, etc.) without becoming a dumping ground.
```

## Clarifications (to keep this pattern correct, without over-committing)

### Stage naming and braid layout are placeholders

The architectural pattern above is the intended shape:

- Physics truth stages for Morphology emit only `morphology.*` truth artifacts.
- Gameplay-owned `morphology-map` stage(s) are braided into the Morphology phase and own `map.*`.
- The canonical path is always Truth → `map.*` → stamp, with no alternate projection path.
- Physics domains must not read `map.*` (backfeeding ban).

However, the specific stage naming and exact braid structure (`morphology-pre/mid/post`, and whether there are 2/3/4 truth stages, etc.) are intentionally placeholders. Agents must derive and refine the braid layout based on:

- current recipe wiring,
- correctness/freeze-point needs,
- and the contracts we lock in the Phase 2 model.

### No new top-level “Gameplay domain” directory (yet)

We are not introducing a new top-level Gameplay domain directory or moving logic into a separate Gameplay package at this time.

- Gameplay-owned projection + stamping logic lives inside the braided `morphology-map` stage(s).
- That logic should remain self-contained within the step files (as this repo expects).
- This is compatible with later extraction into a dedicated Gameplay domain because the seam is already cleanly sliced.

## Closed: “intent” vs “has happened” (projection vs execution)

Downstream stages/steps sometimes need guarantees like “stamping has occurred” when they explicitly depend on it.

### Decision locked: “has happened” is an effect; intent is frozen

We lock the simplest correct model:

- `artifact:map.*` is immutable **projection intent** (Gameplay-owned; produced by Gameplay-owned steps braided into the Morphology phase).
- “Stamping occurred” is represented by **boolean effect tags** provided by the stamping steps after successful adapter calls.

This avoids parallel “realized state” layers and avoids heavyweight receipt artifacts.

#### Safety invariant (required for boolean effects to be honest)

To make “`effect:map.* = satisfied`” mean “this intent has been applied” without hashes/receipts:

- For each stamp pass, the relevant `artifact:map.*` intent artifacts are **published once and frozen** before the corresponding stamping step runs.
- No later step is allowed to republish or replace those same intent artifacts within the same run after the pass begins.

With this invariant, “effect satisfied” cannot accidentally refer to a different intent, because there is no post-stamp intent mutation to drift from.

#### Effect naming (locked)

- No version suffixes.
- No wordy/stacked names.
- Prefer `effect:map.<thing>Plotted` (examples below); this remains true even though the step uses the Civ7 adapter/engine under the hood.

Examples:
- `effect:map.mountainsPlotted`
- `effect:map.volcanoesPlotted`
- `effect:map.featuresPlotted`
- `effect:map.biomesPlotted`
- `effect:map.landmassRegionsPlotted`

#### “project-map” and “stamp-map” are template terms only

The pipeline will almost certainly be decomposed into granular steps aligned with the modeling guidelines:

- Steps are the effect boundary and should be verb-forward `plot-*` / `apply-*` / `publish-*`.
- Ops remain pure (strategy/rule decomposition as needed); steps orchestrate ops and do adapter writes.

So instead of literal `project-map` / `stamp-map`, we expect step IDs like:
- `plot-mountains`
- `plot-volcanoes`
- `plot-landmass-regions`
- `plot-features`

Each such step may:
- read frozen physics truth artifacts + any frozen `artifact:map.*` intent artifacts it owns for that subsystem,
- perform adapter stamping,
- and then provide its `effect:map.*` guarantee.
