### 1.3 Four channels (mental model)

This architecture becomes tractable once these are treated as distinct channels:

1. **`env`** — runtime envelope (Civ7 / runner supplied; not author config)
2. **`knobs`** — author-facing, cross-cutting tuning used during compilation/normalization
3. **`config`** — canonical internal configs (stable shapes; value-only normalization)
4. **`inputs`** — runtime artifacts (maps, buffers, intermediates) produced/consumed by steps and ops

---

