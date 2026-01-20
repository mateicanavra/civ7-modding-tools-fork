# Debate Scratchpad — Option 2: Effects as Execution Guarantees (Agent O2)

This scratchpad is owned by Agent O2.

## Goal (restated)

Model the distinction between:

- **Projection intent**: immutable `artifacts.map.*` (or `artifacts.map.intents.*`) that deterministically describes “what should be stamped”.
- **Execution guarantee**: an explicit, verifiable signal that “stamping actually ran” (and ran for the same intent), without introducing alternate projection/stamping paths, mutability, or cleanup shims.

Option 2 premise: artifacts remain pure data; **effects/events** are the canonical “done-ness” contract for engine mutations.

---

## 1) Concrete effect model

### 1.1 Canonical concepts

**A. Intent is immutable and hash-addressable**

- Every stamping-relevant map intent artifact MUST carry (or be able to derive) a stable content hash.
- “Stable” means: derived from canonical serialization of intent values (including topology invariants), not from runtime IDs, timestamps, random sampling, or adapter implementation details.

Practical consequence: downstream mismatches can be detected without reading engine state.

**B. Effects are schedulable dependency keys, but also emit typed events**

We need two layers:

1) **`effect:*` dependency keys** (schedulable and runtime-verifiable, as in the existing `effect:engine.*` posture).
2) A **run-scoped, append-only effect event log** that carries the payload needed to bind “effect occurred” to “which intent was stamped”.

These two are linked: providing an `effect:*` key for stamping MUST coincide with emitting a corresponding effect event.

This preserves:
- “no logic outside steps” (only steps stamp and emit events),
- artifact immutability,
- and a single canonical projection/stamping path.

### 1.2 Effect IDs (exact patterns)

We need pass-scoped effect IDs to represent multi-pass stamping unambiguously.

#### Pass keys

Define a fixed, recipe-authored set of pass keys:

- `morphology-mid` (optional braid pass, if we ever need an early engine stamp)
- `morphology-final` (required: the “truth freeze → projection → stamp” pass)

These are not “enablement toggles”; they are explicit, always-scheduled nodes in the canonical braid.

#### Effect IDs

Use a namespaced, versioned pattern:

- Pass completion (coarse, “this pass is fully stamped”):
  - `effect:engine.mapStamped.<passKey>@v1`

- Optional per-subsystem guarantees (fine-grained, only if downstream truly needs them):
  - `effect:engine.mapStamped.<passKey>.terrain@v1`
  - `effect:engine.mapStamped.<passKey>.coastlines@v1`
  - `effect:engine.mapStamped.<passKey>.rivers@v1`
  - `effect:engine.mapStamped.<passKey>.lakes@v1`
  - `effect:engine.mapStamped.<passKey>.plotTags@v1`
  - `effect:engine.mapStamped.<passKey>.volcanoes@v1`

Notes:
- This complements (does not replace) existing cross-domain effect keys like `effect:engine.biomesApplied`, `effect:engine.featuresApplied`, `effect:engine.placementApplied`.
- Pass-scoping is the key to multi-pass clarity; “one effect ID, multiple passes” is ambiguous unless the *effect checker* can parameterize by pass (which typical dependency keys cannot).

### 1.3 Effect event payload (what an effect carries)

Define a canonical, typed event schema (conceptually; name can align with the runtime’s event model):

`MapStampEffectEvent@v1`

Required fields:

- **Identity**
  - `schemaVersion: 1`
  - `effectId: string` (must equal the provided dependency key, e.g. `effect:engine.mapStamped.morphology-final@v1`)
  - `eventId: string` (deterministic; see below)

- **Pass identity**
  - `passKey: "morphology-mid" | "morphology-final" | <future>`
  - `passIndex: number` (0-based ordering within the braid; stable in the recipe)
  - `passId: string` (deterministic; see below)

- **Intent binding (the mismatch-prevention core)**
  - `intentRoot: { id: string; digest: string }`
    - `id` is the canonical intent bundle artifact id for this pass (see 1.5).
    - `digest` is the stable content hash of that bundle.
  - `inputs: Array<{ id: string; digest: string; schemaVersion?: number }>`
    - every map intent artifact actually read during stamping (explicit, not implied).

- **Step/run provenance (debuggable, not used for determinism checks)**
  - `phase: string` (e.g., `"morphology"`)
  - `stageId: string` (e.g., `"morphology-map"`)
  - `stepId: string` (e.g., `"stamp-map"`)
  - `occurrenceId: string` (stable node/occurrence id from the ExecutionPlan)
  - `planFingerprint: string` (from the compiled plan; used to detect “wrong plan” scenarios)
  - `runId: string` (deterministic runId; helps identify cross-run adapter reuse bugs)

- **Engine context (ties the guarantee to Civ7’s fixed topology)**
  - `engine: { adapterId: string; adapterVersion?: string }`
  - `mapInit: { width: number; height: number; topLatitude?: number; bottomLatitude?: number; mapSizeId?: string | number }`
  - `topology: { wrapX: true; wrapY: false }`

- **Evidence**
  - `evidence: { kind: "call-evidence" | "read-back" | "artifact-backed"; details?: Record<string, unknown> }`
  - `engineCalls?: string[]` (optional list of adapter operations invoked; primarily for debugging)

Deterministic IDs:

- `passId = sha256("MapStampPass@v1" + passKey + intentRoot.digest + mapInit.width + mapInit.height)`
  - Includes width/height because Civ7 map init changes the engine grid; a stamp on the wrong grid is not acceptable.
- `eventId = sha256("MapStampEffectEvent@v1" + effectId + passId)`

The determinism boundary is important: we want strong mismatch detection without turning effects into a giant, drifting “receipt blob”.

### 1.4 Where effects/events live

Introduce a required, run-scoped context domain (conceptually):

- `ctx.effects` = append-only `EffectEventLog`
  - supports `emit(event)` and indexed lookup (`latest(effectId)`, `find(effectId, predicate)`)
  - immutable once appended (no deletes/rewrites)

This does *not* violate “artifacts are immutable once published” because it is not an artifact; it is runtime execution evidence (aligned with `effect:*` semantics).

It should integrate with the shared observability event model, but **must not be optional tracing** (tracing toggles must not alter execution semantics).

### 1.5 Representing multi-pass stamping cleanly (no ambiguity)

Multi-pass is clean if *passes are explicit in both intent and effects*.

Canonical modeling:

- For each passKey, publish an immutable “intent bundle” artifact:
  - `artifact:map.intents.<passKey>@v1`
    - contains either:
      - a small manifest pointing at the pass’s constituent `artifact:map.*` intent artifacts, or
      - the actual intent payloads (if we decide “bundle is the intent surface”).
    - MUST include `digest` (or digest derivation rules).

- The stamping step for a pass:
  - reads `artifact:map.intents.<passKey>@v1` (and the referenced per-subsystem intents)
  - stamps via `ctx.adapter`
  - emits `MapStampEffectEvent@v1` for the pass completion effect id
  - provides `effect:engine.mapStamped.<passKey>@v1`

If we later need an additional pass, we add:
- a new passKey (new bundle + new stamping step + new effect ids),
not a conditional “maybe stamp twice” branch.

---

## 2) How downstream steps consume the guarantee

### 2.1 What a step checks (and how it fails)

Downstream steps that require the engine to reflect map projection MUST require an effect key, not just intent artifacts.

Example (pass-level):

- `requires: ["artifact:map.intents.morphology-final@v1", "effect:engine.mapStamped.morphology-final@v1"]`

What happens at runtime:

1) If `effect:engine.mapStamped.morphology-final@v1` was never provided, the executor fails fast with an unsatisfied dependency error (step never runs).
2) If it was provided, the registry’s `satisfies` check for that effect runs and can still fail (treating the key as unsatisfied even though it is “present” in the satisfied set).

### 2.2 Preventing “stamped, but for a different intent”

The satisfier for `effect:engine.mapStamped.<passKey>@v1` MUST enforce an intent binding check:

- Recompute the expected digest from `artifact:map.intents.<passKey>@v1` (and/or its referenced inputs).
- Fetch the latest matching `MapStampEffectEvent@v1` for `effectId`.
- Fail if:
  - there is no event,
  - the event’s `intentRoot.digest` differs from the current intent bundle digest,
  - `topology.wrapX !== true` or `wrapY !== false`,
  - `mapInit.width/height` differ from current run settings,
  - or `planFingerprint` differs (indicating “effect came from a different plan/run”, typically adapter reuse or log corruption).

Optionally (stronger wiring guardrail):
- also require `ctx.adapter.verifyEffect(effectId) === true` for the pass-level effect id, where `verifyEffect` is implemented as either:
  - call-evidence (did we execute the stamping routine?), or
  - a cheap invariant read-back (did the engine show *some* expected footprint?).

This yields the key property we want:

> A downstream step can treat `effect:engine.mapStamped.<passKey>@v1` as “the engine stamping routine executed for the current immutable intent bundle”.

Notably, this does not require Physics to read `map.*` (the check runs in the effect satisfier and/or gameplay-owned steps).

### 2.3 Fine-grained consumption (when needed)

If a downstream step only needs a subset of the stamp (e.g., it needs rivers, but not volcano tags), it should depend on a subsystem effect:

- `requires: ["effect:engine.mapStamped.morphology-final.rivers@v1"]`

But only add these if there is a real scheduling need. Otherwise, prefer the single pass-level “map stamped” key to avoid an explosion of dependencies.

---

## 3) Failure modes and mitigations

### FM-1: Effect key provided but stamping didn’t actually run

How it happens:
- A step mistakenly “provides” the effect dependency key without calling the adapter stamping routine.

Mitigations:
- Registry satisfier also requires `ctx.adapter.verifyEffect(effectId)` (call-evidence at minimum).
- In implementation, make it hard to “lie” by coupling effect emission to adapter stamping helpers (e.g., `adapter.stampMap(passIntent, { effectId })` records evidence internally).
- Add smoke tests that assert missing stamping calls fail effect verification (mirroring existing `effect:*` tests).

### FM-2: Stamping ran, but for a different intent than downstream reads

How it happens:
- Adapter reuse across runs, stale effect evidence, or a bug where the stamp step reads the wrong intent artifact set.

Mitigations:
- Intent digest binding in the satisfier (event payload includes digests; satisfier recomputes and matches).
- Include `runId` and `planFingerprint` in the event; fail if they differ from the current run (detects cross-run evidence leakage).
- Guardrail: enforce adapter instance is run-scoped (or has a mandatory reset contract) to avoid evidence leakage.

### FM-3: Multi-pass ambiguity (“did we stamp the final pass or only an earlier pass?”)

How it happens:
- Single unscoped effect key used for multiple stamps.

Mitigation:
- Pass-scoped effect keys (`effect:engine.mapStamped.<passKey>@v1`) and pass-scoped intent bundles.

### FM-4: Effect/event drift (IDs duplicated as raw strings across packages)

How it happens:
- Effect IDs are hand-typed in steps, tag registries, and adapters.

Mitigations:
- Centralize constants for map stamping effect IDs (same pattern as `ENGINE_EFFECT_TAGS`).
- Add a tiny invariant test that asserts: constants == registry IDs == adapter evidence IDs (where relevant).

### FM-5: “Call-evidence is a false positive”

How it happens:
- We record “stamp ran”, but engine mutation didn’t happen (engine no-op, wrong call order, etc.).

Mitigations (choose per effect):
- For high-risk guarantees, upgrade satisfier evidence to “cheap invariant read-back” when feasible (aligns with DEF-017’s posture).
- Keep the semantics honest in docs: these effects are execution milestones, not a proof that every tile matches intent.

### FM-6: Physics backfeeds on `map.*` or depends on “map stamped” effects

How it happens:
- A Physics step starts reading `map.*` artifacts or requiring the stamping effect, reintroducing coupling.

Mitigations:
- Registry owner metadata: mark `artifact:map.*` + `effect:engine.mapStamped.*` as Gameplay-owned.
- Contract guards/tests: explicitly fail if any Physics domain step declares requires on `artifact:map.*` or `effect:engine.mapStamped.*`.
- Optionally enforce at recipe compile time: phase/type metadata disallows forbidden dependency prefixes.

### FM-7: Event model confusion with optional tracing

How it happens:
- Effects/events get treated like optional trace events, so disabling tracing disables correctness.

Mitigation:
- Make effect events part of the mandatory runtime contract: emission is required when providing the effect key; tracing sinks can mirror them but cannot gate them.

---

## 4) Recommendation

**Accept Option 2**, with a strict condition: effects must be more than “a boolean tag”; they must have a canonical, run-scoped event payload that binds the effect to the immutable intent digest (otherwise you can’t prevent “stamped, but for different intent”).

### What must be locked in Phase 2

1) The pass model:
   - at minimum `morphology-final` exists and is always stamped.
   - any additional passes are explicit new nodes (no conditional repeats).
2) The effect ID catalog and naming:
   - `effect:engine.mapStamped.<passKey>@v1` (+ the minimal necessary subsystem keys).
3) The `MapStampEffectEvent@v1` schema (fields + determinism rules) and the hashing algorithm used for `digest`, `passId`, and `eventId`.
4) The satisfier semantics:
   - intent digest binding is mandatory,
   - topology invariants (wrapX true, wrapY false) are enforced,
   - and adapter evidence policy is explicitly chosen per effect (call-evidence vs read-back).
5) Guardrails:
   - adapter evidence reset/run-scoping,
   - and explicit “no Physics requires artifact:map.* / effect:engine.mapStamped.*” enforcement.
