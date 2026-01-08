### 1.4 Layering and dependency boundaries

```
Domain (ops + strategies + contracts)
  └── exports a domain public surface (`src/domain/<domain>/index.ts`):
      - `contracts` (contract-only; safe for step contracts)
      - `ops` (implementations; developer convenience)
      - `opsById` (canonical binding registry; deterministic; built, not hand-maintained)
  └── cross-module consumers import only from `@mapgen/domain/<domain>` (no deep imports into `ops/**` or `strategies/**`)

Step (internal node; orchestration)
  └── defines internal schema (required)
  └── declares which op envelopes exist (optional; declared as op contracts, derived to op refs)
  └── optional value-only normalize hook
  └── runtime run handler can call ops (injected), without importing implementations directly

Stage (author-facing unit)
  └── owns optional stage-level public view (schema + compile hook)
  └── otherwise stage input is internal-as-public

Recipe (composition + compilation orchestrator)
  └── composes stages
  └── owns the compile pipeline (stage public→internal if present, then step/op canonicalization)
  └── instantiates engine recipe only from compiled internal configs

Engine (execution plan + executor)
  └── validates runtime envelope + compiled step configs
  └── builds plan + executes
  └── must not default/clean/mutate config
```

Hard boundary:
- Domain code must not import engine plan compilation internals. `env` must live in a shared runtime module, not in engine-only types.
- Domain code must not import from `recipes/**` or `maps/**`.
- Recipe wiring may import domain modules, but must not import from `maps/**`.

---
