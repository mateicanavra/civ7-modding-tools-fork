# Debate Scratchpad — Option 3: Receipt Artifact (Agent O3)

This scratchpad is owned by Agent O3.

## Position

Adopt a first-class, immutable **execution receipt** artifact that is published only by stamping steps and that cryptographically binds:

- the **projection intent** (`artifacts.map.*`, immutable, queryable, deterministic), and
- the **fact of execution** (engine adapter calls were executed successfully against a specific engine session/map instance),

without adding conditional projection paths and without requiring any “delete later” transitional mechanics.

The key design move: make *stamping* produce an artifact that is *as immutable and queryable* as intent, but scoped to “what actually happened”, not “what should happen”.

---

## 1) Receipt artifact schema

### Naming

Because `artifacts.map.*` must remain pure **intent**, the receipt must live outside that namespace.

**Canonical receipt artifact name**

- `artifacts.receipts.mapStampReceipt`

This name is stable (single canonical path). Each pipeline run produces exactly one instance of this artifact; if the run is re-executed, a new run produces its own artifact store/versioning (so the name remains canonical within a run).

If the workflow framework *does not* have run-scoped artifact namespaces and requires globally unique artifact names, then the canonical name becomes:

- `artifacts.receipts.mapStampReceipt.<runId>`

…but the intent of “one canonical path” is preserved by always having downstream steps receive the current `runId` in context and still referencing exactly one artifact.

### Shape

Receipt is JSON (or JSON-equivalent) with a strict schema + version. It must be “small enough to be normal”, but complete enough to be authoritative.

**`MapStampReceiptV1`**

```jsonc
{
  "schema": "civ7.workflow.receipts.mapStampReceipt",
  "schemaVersion": 1,

  "receiptId": "uuid",                 // content-addressed or random; must be unique per publish
  "createdAt": "RFC3339",              // for debugging/auditing; not used for matching logic

  "workflow": {
    "runId": "string",                 // pipeline execution id
    "stepId": "string",                // stable step identifier (e.g., "morphology.gameplay.mapStamp")
    "stepInstanceId": "string",        // unique within run (retry-aware)
    "passGroupId": "string"            // stable id for the multi-pass plan (see below)
  },

  "implementation": {
    "stepCode": {
      "package": "string",             // optional (pnpm workspace pkg)
      "version": "string",             // semver or workspace version
      "gitSha": "string"               // optional; useful in mono-repo
    },
    "engineAdapter": {
      "name": "string",                // e.g. "civ7-engine-adapter"
      "version": "string",
      "buildSha": "string"
    }
  },

  "engineTarget": {
    "engineBuild": "string",           // engine build/version that performed the stamp
    "sessionId": "string",             // adapter session identifier
    "mapInstanceId": "string",         // id/handle of the target map in the engine
    "topology": {
      "wrapX": true,
      "wrapY": false
    }
  },

  "intentBinding": {
    "intentSet": {
      "namespace": "artifacts.map",    // asserted to reinforce policy: intent lives here
      "artifacts": [
        { "name": "artifacts.map.<...>", "contentHash": "sha256:<...>", "schemaVersion": 1 }
      ],
      "merkleRoot": "sha256:<...>"     // computed over ordered (name, contentHash, schemaVersion)
    },

    "stampPlanHash": "sha256:<...>",   // hash of the ordered, typed “stamp plan” derived from intent
    "stampInputsHash": "sha256:<...>"  // hash of any non-artifact inputs (e.g. constants/config)
  },

  "passes": [
    {
      "passId": "string",              // stable subsystem pass id (e.g. "terrain", "features", "resources", "starts")
      "intentSubsetMerkleRoot": "sha256:<...>", // optional: root for the subset actually used by this pass

      "execution": {
        "status": "success",           // receipt is only published if all passes are success
        "startedAt": "RFC3339",
        "finishedAt": "RFC3339"
      },

      "adapterCalls": [
        {
          "index": 0,
          "opType": "string",          // stable semantic op label (not engine method name)
          "adapterMethod": "string",   // optional: engine coupling escape hatch for debugging
          "argsHash": "sha256:<...>",  // hash of canonicalized args payload (no raw dumps by default)
          "idempotencyKey": "string",  // stable key derived from (runId, passId, index, intent roots)

          "engineAck": {
            "engineOpId": "string",    // returned by adapter/engine
            "engineReceiptHash": "sha256:<...>", // engine-supplied attestation of work performed
            "resultSummaryHash": "sha256:<...>"  // hash of any returned “summary” payload
          }
        }
      ],

      "postState": {
        "engineMapStateHash": "sha256:<...>"     // adapter-provided hash of realized map state after this pass
      }
    }
  ],

  "finalState": {
    "engineMapStateHash": "sha256:<...>",        // hash after all passes
    "engineReceiptHash": "sha256:<...>"          // final engine-supplied receipt hash (if available)
  }
}
```

#### Notes on fields (why they exist)

- `intentBinding.intentSet.merkleRoot` is the **canonical match key**: if intent changes, receipt is invalid.
- `stampPlanHash` detects “same intent, different stamping interpretation” (e.g., step code changed call ordering/semantics).
- `engineReceiptHash` and `engineMapStateHash` are the “anti-lie” anchors: receipts should be derived from engine acknowledgements, not just step assertions.
- `topology.wrapX=true` / `wrapY=false` is recorded as an invariant, even though there is no knob; it prevents accidental adapter defaults from drifting.

### Multi-pass representation

Recommend: **single receipt artifact** with `passes[]` (each pass is a subsystem/stamping segment).

Reasons:

- One canonical lookup (`artifacts.receipts.mapStampReceipt`) for “did stamping happen?”
- Multi-pass is representational, not structural: no need for separate receipt artifacts whose presence/absence becomes a de facto conditional path.
- Enables strong “all-or-nothing” semantics: receipt only exists if *all* required passes stamped successfully.

If we ever need partial progress for debugging, do it by allowing the step to publish a *separate* failure/debug artifact (e.g., `artifacts.receipts.mapStampAttempt`) that is explicitly **not** treated as a guarantee. But the canonical guarantee remains “success receipt exists or it doesn’t”.

---

## 2) How steps would use it

### Who writes the receipt

Only the **Map stamping step** (a Gameplay-owned step braided into the Morphology phase) writes:

- `artifacts.receipts.mapStampReceipt`

Publishing rules:

- Receipt is published **only after** the step has:
  1) computed `intentSet.merkleRoot` over the authoritative intent artifacts (`artifacts.map.*`),
  2) derived the `stampPlanHash` deterministically from intent,
  3) executed the complete, ordered set of adapter calls across required passes, and
  4) obtained engine acknowledgements + post-state hashes for each pass (and final state).
- On any failure: **do not publish** the receipt; fail the step.

This makes “receipt exists” a strict guarantee of successful stamping.

### Who reads the receipt

Any step that requires **realized state** (i.e., “I am about to rely on engine-side map being stamped”) reads it.

Examples:

- Export step that bundles a playable scenario/mod package requiring the engine’s realized map.
- Visualization/debugging step that queries engine map tiles to render or validate.
- Any later gameplay step that mutates engine map (if allowed) should read-and-verify the prior receipt and then publish its own mutation receipt (same pattern).

Physics steps must not read the receipt if it implies dependency ordering that creates backfeeding; the receipt should be treated as a **Gameplay-only** contract.

### Verification behavior (inside reading steps)

Reading step logic (no logic outside steps):

1) Load `artifacts.receipts.mapStampReceipt`.
2) Recompute the *current* intent merkle root from `artifacts.map.*` (or just compute it once and compare to `intentBinding.intentSet.merkleRoot`).
3) Verify:
   - `engineTarget.topology.wrapX=true` and `wrapY=false`
   - `intentBinding.intentSet.merkleRoot` matches current intent
   - (optional but recommended) `stampPlanHash` matches what this step expects for the current schemaVersion of stamping
4) If any check fails: **hard fail** with an error that tells the operator to rerun the stamping step (and not proceed).

### Failure behavior

- **Receipt missing**: stamping did not happen (or failed). Hard fail; no fallback path.
- **Receipt present but intent mismatch**: realized state is stale relative to current intent. Hard fail; no fallback path.
- **Receipt present but topology mismatch**: indicates an adapter/engine contract drift. Hard fail; treat as correctness violation.
- **Receipt present but engine/build mismatch**: policy decision. Recommend fail unless we explicitly allow “engine build drift” within a run.

This preserves “one canonical path” and avoids shims: every consumer either sees a valid receipt or stops.

---

## 3) Risks and mitigations

### Risk: dishonest receipts (step claims it stamped, but didn’t)

**Threat model:** A buggy step could publish a receipt even if it skipped adapter calls, or a mocked adapter could fabricate acks.

**Mitigations:**

- Require `engineAck.engineReceiptHash` (engine-provided attestation) for every mutating call and `finalState.engineMapStateHash` for the map instance. Receipt must be *assembled from actual adapter return values*, not from step-side intent.
- Make adapter provide a stable `engineMapStateHash` that is derived from engine-side authoritative state (not step memory). Even if it’s “best effort” at first, lock it as the long-term contract.
- Add a dedicated verification sub-pass inside the stamping step (still inside the step file) that queries engine state and checks it matches the stamp plan at a coarse level (e.g., counts/histograms/hashes), then records verification hashes in the receipt.

### Risk: receipt becomes a dumping ground (“just add another field”)

**Mitigations:**

- Strict schema with `schema` + `schemaVersion`, plus clear separation:
  - `intentBinding` (what it was bound to)
  - `passes[]` (what it did)
  - `finalState` (what resulted)
- Store raw argument payloads only by hash by default (`argsHash`); if full payloads are needed, publish a separate `artifacts.receipts.mapStampReceiptDebug` that is non-authoritative and can be gated/size-capped.
- Establish a rule: receipt fields must be either (a) match keys, (b) engine attestations, or (c) minimal provenance for debugging. Everything else stays in intent artifacts.

### Risk: engine coupling via adapter call names and parameters

**Mitigations:**

- Treat `opType` as the stable semantic layer (domain language), keep `adapterMethod` optional for debugging only.
- Hash args rather than embedding engine-specific payloads.
- Only record engine-specific identifiers (`engineOpId`, `mapInstanceId`) and hashes; do not record engine-side structures unless necessary.

### Risk: false sense of safety (receipt guarantees “stamped once”, not “still true now”)

If later steps can mutate engine map, “receipt exists” only means “it happened at that time”.

**Mitigations:**

- Policy: *any* step that mutates engine map must publish its own receipt and must chain from prior receipts (e.g., include `priorReceiptHash`).
- Alternatively, enforce “single mutator” for engine map in the canonical workflow: only the stamping step mutates; later steps are read-only.

### Risk: backfeeding via receipts (Physics reads receipts or map.* indirectly)

**Mitigations:**

- Treat receipt namespace (`artifacts.receipts.*`) as Gameplay-only in the domain contract; add runtime validation in step helpers (inside steps) that rejects reading these artifacts from Physics-domain steps.
- Keep `intentBinding` references as hashes only; do not embed any gameplay-level map content that Physics might be tempted to reuse.

### Risk: size/performance (call logs are large for big maps)

**Mitigations:**

- Summarize at the operation level: record one `adapterCalls[]` entry per coarse-grained operation (e.g., “SetTileBatch #12”), not per tile.
- Allow pass-level `resultSummaryHash` rather than full result payload.
- If needed, split “debug logs” into an always-published but compressed artifact, or a separate opt-in debug artifact (explicitly non-authoritative).

---

## 4) Recommendation

**Accept Option 3**.

It cleanly models “intent vs executed reality” with immutable artifacts, keeps one canonical projection/stamping path, and avoids shims by making “receipt exists and matches intent” the only admissible guarantee.

### What must be locked in for Phase 2

- `artifacts.map.*` is **intent only**; receipts live under `artifacts.receipts.*` (or equivalent non-map namespace).
- `artifacts.receipts.mapStampReceipt` exists **iff** stamping succeeded; no “success=false receipts” treated as guarantees.
- Receipt matching is defined by a deterministic `intentSet.merkleRoot` computed from the authoritative intent artifacts.
- Receipt includes `stampPlanHash` to bind “interpretation of intent” (step semantics) in addition to “the intent blob”.
- Engine adapter contract must provide:
  - per-call `engineReceiptHash` (or a close equivalent),
  - a stable `engineMapStateHash` after each pass and final stamp,
  - explicit topology invariants (wrapX true, wrapY false).
- Multi-pass semantics are represented inside a single receipt (`passes[]`) with required `passId`s defined as part of the canonical workflow contract.
- Any engine map mutation outside the stamping step must either be forbidden or must follow the same “publish a receipt that chains from prior receipt” rule (no silent mutations).
