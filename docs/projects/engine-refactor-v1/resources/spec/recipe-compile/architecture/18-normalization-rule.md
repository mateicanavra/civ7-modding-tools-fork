### 1.18 Single rule: where compile-time normalization is allowed

Rule (crisp):

> Only the compiler pipeline and its helpers may call `step.normalize` and op strategy normalize. Runtime code never can, because it never has access to the compile op surface.

Enforcement mechanisms (structural, not policy):

- runtime ops are bound using `bindRuntimeOps`, which returns `DomainOpRuntime` that has no normalize members
- engine step interface remains `run(ctx, cfg)`; step.normalize is not part of engine runtime shape
- compiler modules are not exported in runtime-facing entrypoints

---

