---
doc_id: ER1-SPIKE-NONBINDING-TENTATIVE-DIRECTIONS
title: "Engine Refactor v1 — Non-binding Tentative Directions"
project: engine-refactor-v1
status: archived
sources:
  - "ER1-ADR-REGISTER-ARCHIVE (historical register trailing notes)"
---

# Non-binding Tentative Directions

These are captured in the SPIKE as “direction” or “proposed” guidance but are not
locked as accepted target decisions in the SPEC:

- DAG/partial-order authoring: deterministic scheduling tie-break proposal (stable topo sort; recipe layout order; lexical `instanceId` fallback).
- Mutation modeling direction: `buffer:*` mutable canvases vs `artifact:*` immutable/versioned products; richer read/write modeling would require an explicit follow-up decision.
- Mod placement model direction: dataflow correctness + named hook points; “script-based insertion” as tooling over the model.
- `affects` / `affectedBy` as descriptive metadata only unless explicitly promoted via a schema major bump.
