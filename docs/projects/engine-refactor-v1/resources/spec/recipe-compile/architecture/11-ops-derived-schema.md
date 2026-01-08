### 1.11 Ops-derived step schema (DX shortcut; constrained scope)

This is in-scope for this landing (explicit decision):

- **NEW (planned)**: if `defineStepContract` is called with `ops` and **no explicit schema**, auto-generate a strict step schema where:
  - each op key becomes a required property whose schema is the op envelope schema
  - `additionalProperties: false` is defaulted inside the factory

Important: `schema` is not required just because `ops` exists:
- If the step is “ops-only” (no extra top-level config keys), the derived `schema` removes boilerplate (no duplicate schema authoring).
- If the step needs extra top-level fields, the author provides an explicit `schema`. Factories still derive and overwrite op-key property schemas from `ops`, but factories do not add any new non-op keys “for you” (O3: no “derive + extras” hybrid).
- In both cases, there is still only one step schema; there is no separate step `inputSchema`.

Concretely, the v1 authoring surface supports (and only supports) these shapes:
- `defineStepContract({ ..., schema })` — explicit schema-owned step config (no ops-derived schema).
- `defineStepContract({ ..., ops })` — ops-only step config; schema is derived from op envelopes (DX shortcut).
- `defineStepContract({ ..., ops, schema })` — explicit hybrid schema (author-owned); `ops` declares which envelope keys exist, and factories overwrite those op keys with their derived envelope schemas (authors do not duplicate envelope schemas).

Contract-level helper (no op impl bundling):

```ts
// Baseline today (repo-verified): shared envelope derivation exists:
// - `buildOpEnvelopeSchema(...)`: `packages/mapgen-core/src/authoring/op/envelope.ts`
//
// NEW (planned): `defineStepContract({ ops, schema? })` derives op-envelope schemas from the provided
// op contracts and (optionally) auto-derives the step schema when `schema` is omitted.
//
// DX intent:
// - authors do NOT need to call `opRef(...)` directly
// - they declare the op contracts; factories derive `OpRef` + envelope schemas using the shared builder
```

Binding helper (op refs → implementations):

```ts
// Canonical binding API: see §1.14.
//
// Key properties:
// - binds by op id (declared in contracts)
// - produces compile vs runtime op surfaces
// - runtime surface is structurally stripped (no normalize/defaultConfig/strategies)
```

Inline schema strictness (factory-only):
- If schema is supplied as an inline field-map object, factories wrap it with `additionalProperties: false`.
- If schema is supplied as an arbitrary `TSchema`, factories do not mutate it.

---

