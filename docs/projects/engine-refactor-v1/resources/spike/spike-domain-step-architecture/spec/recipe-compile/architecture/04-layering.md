### 1.4 Layering and dependency boundaries

```
Domain (ops + strategies + contracts)
  └── exports `contracts` (contract-only) and `ops` (implementations), plus a deterministic id index (built, not hand-maintained)

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

---

