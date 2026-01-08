### 1.16 Call chain

#### Purpose

Pin one authoritative “who calls what” to avoid dual paths, fallback behavior, or engine improvisation.

#### Canonical call chain (single authoritative flow)

Textual (authoritative):

1. Runtime entrypoint constructs:
   - `env` (Civ7 runtime inputs)
   - `recipeConfigInput` (author config; stage objects include `knobs` field)
2. Runtime calls only:
   - `recipe.run({ context, env, config: recipeConfigInput })`
3. Inside `recipe.run`:
   - `compiled = recipe.compileConfig({ env, config })`
   - `runRequest = recipe.runRequest({ env, compiled })`
   - `plan = engine.compileExecutionPlan(runRequest)` (validate-only; no default/clean)
   - `executor.executePlan(context, plan)` (no default/clean; uses plan configs as-is)
4. Steps run with `run(ctx, config)` only; ops are available through module-bound runtime bindings, not passed through engine.

Explicit “no fallback” statements:

- There is no path where:
  - engine defaults missing configs
  - executor defaults missing configs
  - step.run defaults configs
- If compilation fails, the run fails with `RecipeCompileError` before engine plan compile.

---

