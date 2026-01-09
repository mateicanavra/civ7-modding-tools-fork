# Engine Refactor V1 — Recipe Compile File Reconciliation

This file is a pointer doc.

```yaml
canonical_location:
  file: docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md
  contents:
    - "File-level reconciliation (what changes where; grounded in repo)"
    - "Engine validate-only behavior (pinned; implementation-adjacent)"
    - "Migration ordering (suggested slices)"
    - "Rename resolveConfig -> normalize (baseline grounding + migration note)"
```

## Migration ordering (M7-aligned)

```yaml
migration_ordering:
  source_milestone: docs/projects/engine-refactor-v1/milestones/M7-recipe-compile-cutover.md
  policy:
    compat_shims: "avoid (prefer coordinated hard cutovers per slice)"
  slices:
    - id: 1
      name: "compiler + authoring scaffolding"
      includes: [A1, A2, B1, B2, B3, B4]
    - id: 2
      name: "recipe boundary adoption + staged migrations"
      includes: [C1, C2, C3]
    - id: 3
      name: "engine validate-only flip"
      includes: [D1, D2]
    - id: 4
      name: "ecology exemplar"
      includes: [E1, E2, E3]
    - id: 5
      name: "cleanup (no legacy left)"
      includes: [F1, F2]
```
