## 4) Open Questions / Ambiguities (remaining)

O1/O2/O3 were previously tracked as “known unknowns”, but are now **locked in** and should not be treated as open:

- **O1 (closed)**: shared op envelope derivation is implemented and used by both `createOp(...)` and `opRef(...)` via `packages/mapgen-core/src/authoring/op/envelope.ts`.
- **O2 (closed)**: recipe config typing is split into author input vs compiled output via `RecipeConfigInputOf<...>` and `CompiledRecipeConfigOf<...>` in `packages/mapgen-core/src/authoring/types.ts` (baseline note: `CompiledRecipeConfigOf` is currently an alias; the split is a locked design requirement for v1).
- **O3 (closed)**: no “derive ops schema + add extra top-level fields implicitly” hybrid. If you want non-op fields, you must provide an explicit step schema (op-key schemas are still overwritten from `ops` contracts so authors don’t duplicate envelope schemas).

No additional open questions are tracked in this document yet.

---

