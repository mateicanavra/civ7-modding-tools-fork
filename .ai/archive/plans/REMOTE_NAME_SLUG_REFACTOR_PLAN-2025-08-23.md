# RemoteName → internal refactor plan

## Goal
Make `slug` the only user-facing identifier for subtree operations. `remoteName` becomes internal state, exposed only via a hidden flag for advanced overrides.

## Affected areas
- `packages/cli`
  - `src/base/SubtreeCommand.ts`
  - `src/subtree/ConfigRemoteBase.ts`
  - `src/subtree/ImportBase.ts`
  - `src/subtree/SetupBase.ts`
  - `src/subtree/PushBase.ts`
  - `src/subtree/PullBase.ts`
  - `src/subtree/StatusBase.ts`
  - `src/utils/git.ts`
  - all subtree command surfaces under `src/commands/mod/*` and `src/commands/git/*`
  - `test/utils/git.test.ts`
  - regenerate `oclif.manifest.json`
- `packages/plugins`
  - `plugin-git/src/index.ts`
  - `plugin-mods/src/index.ts`
- Documentation mentioning `remoteName`

## Implementation notes
1. **Flag exposure**
   - Move `remoteName` flag behind `hidden: true` in `SubtreeCommand` and ensure derived base classes and command files no longer document it. Only advanced users can pass `--remoteName` explicitly.
2. **Resolution order**
   - Update `resolveRemoteName` in `src/utils/git.ts` to prioritize stored config (`civ7.<domain>.<slug>.remoteName`), then infer from `remoteUrl` or default to `slug`. The hidden flag should only override after config lookup.
   - Adjust `requireRemoteName` to surface helpful errors when no mapping exists.
3. **Command updates**
   - Review all subtree command implementations (`mod/*`, `git/*`) for any references to `flags.remoteName` and ensure they rely on the resolver.
   - Examples and help text should mention only `slug`.
4. **Base class alignment**
   - Ensure `ConfigRemoteBase`, `ImportBase`, `SetupBase`, `PushBase`, `PullBase`, and `StatusBase` pass resolved `remoteName` internally without exposing flags.
5. **Plugins**
   - `plugin-git`: confirm helpers assume `remoteName` may differ from `slug` but is supplied by callers; no user-facing exposure.
   - `plugin-mods`: default `remoteName` derivation from `slug` (or `remoteUrl`) remains, but public APIs should treat it as optional.
6. **Tests**
   - Update `test/utils/git.test.ts` to reflect new resolution order and hidden flag behavior.
   - Add coverage ensuring commands work when only `slug` is provided and that hidden `--remoteName` overrides when needed.
7. **Docs**
   - Search docs for `remoteName` mentions and revise to emphasize `slug` as primary identifier.
   - Note advanced override flag in a dedicated troubleshooting or advanced usage section if necessary.
8. **Build & manifest**
   - After code changes, run `pnpm lint`, `pnpm test`, and `pnpm run build` to regenerate `oclif.manifest.json` so hidden flags disappear from help output.

## Edge cases / advanced scenarios
- Allow overriding inferred `remoteName` with `--remoteName` when multiple remotes map to the same `slug`.
- Maintain ability to infer `remoteName` from `--remoteUrl` during initial `config`/`import`/`setup` workflows.
- Ensure backward compatibility: existing configs storing `remoteName` continue to resolve correctly.

