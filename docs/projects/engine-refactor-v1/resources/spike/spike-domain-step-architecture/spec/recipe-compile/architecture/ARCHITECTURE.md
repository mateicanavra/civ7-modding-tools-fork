# Proposal: Composition-first recipe compiler (canonical architecture)

This document is a **canonical consolidation pass** for the “composition-first recipe compiler” work. It is intended to replace “read 3–4 versions and reconcile mentally” with **one** coherent read.

**Primary sources (verbatim or near-verbatim, selectively merged):**
- `gpt-pro-recipe-compile-v4.md` (single-mode stage `public`, mechanical op envelope normalization, ops-derived step schema, “no runtime defaulting”, knobs lock-in)
- `gpt-pro-recipe-compile-v3.md` (layering diagram, type surfaces, end-to-end examples, risk-sliced implementation outline)
- `gpt-pro-recipe-compile-v2.md` (ground-truth baseline references + “what changes where” file mapping)

---

## 1) Canonical Architecture


Split into focused files:

- `01-goals.md`
- `02-invariants.md`
- `03-four-channels.md`
- `04-layering.md`
- `05-config-model.md`
- `06-knobs-model.md`
- `07-hook-semantics.md`
- `08-type-surfaces.md`
- `09-compilation-pipeline.md`
- `10-op-envelopes.md`
- `11-ops-derived-schema.md`
- `12-file-reconciliation.md`
- `13-step-module-pattern.md`
- `14-binding-helpers.md`
- `15-author-input-vs-compiled.md`
- `16-call-chain.md`
- `17-op-shapes.md`
- `18-normalization-rule.md`
- `lint-boundaries.md`
- `open-questions.md`
- `appendix/README.md`
