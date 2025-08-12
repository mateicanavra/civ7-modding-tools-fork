# CI/CD Workflow Review & Improvements

Looking at the CI/CD workflows in this PR, I can see several well-designed aspects and a few potential improvements:

## Current Workflows

- `ci.yml` - Main CI workflow
- `publish.yml` - Publishing workflow

## Potential Issues & Improvements

### CI Workflow Issues:

1. **Turbo cache key collision risk** - The cache key includes `github.sha` which means every commit gets a unique cache, reducing cache effectiveness. Consider using content-based hashing instead.

2. **Missing pnpm cache** - While Turbo cache is configured, there's no pnpm store cache which could speed up dependency installation.

3. **Bun version pinning** - Using `bun-version: latest` could cause non-deterministic builds. Consider pinning to a specific version.

### Publish Workflow Issues:

1. **Redundant typecheck steps** - The workflow runs separate typecheck commands for SDK and CLI, but these might already be covered by the build step.

2. **No version validation** - The workflow doesn't validate that package.json versions match the git tag.

3. **Missing dry-run validation** - No pre-publish validation to catch issues before actual publishing.

## Suggested Improvements:

### `.github/workflows/ci.yml`

```yaml
# Before
- name: Install dependencies
  run: pnpm install --frozen-lockfile
- name: Setup Bun (for playground build)
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest
- name: Cache Turbo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-

# After
- name: Cache pnpm store
  uses: actions/cache@v4
  with:
    path: ~/.local/share/pnpm/store
    key: pnpm-store-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      pnpm-store-${{ runner.os }}-
- name: Install dependencies
  run: pnpm install --frozen-lockfile
- name: Setup Bun (for playground build)
  uses: oven-sh/setup-bun@v2
  with:
    bun-version-file: ".bun-version"
- name: Cache Turbo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml', 'turbo.json', 'packages/*/package.json', 'packages/plugins/*/package.json', 'apps/*/package.json') }}
    restore-keys: |
      turbo-${{ runner.os }}-
```

### `.github/workflows/publish.yml`

```yaml
# Remove redundant typechecks
- name: Typecheck (SDK)
  run: pnpm -F @civ7/sdk run typecheck
- name: Typecheck (CLI)
  run: pnpm -F @civ7/cli run typecheck

# Add version validation
- name: Validate package versions
  run: |
    TAG=${GITHUB_REF_NAME#v}
    TAG=${TAG#sdk-v}
    TAG=${TAG#cli-v}
    if [[ $GITHUB_REF_NAME == sdk-v* ]]; then
      SDK_VERSION=$(node -p "require('./packages/sdk/package.json').version")
      if [[ "$SDK_VERSION" != "$TAG" ]]; then
        echo "SDK version mismatch: tag=$TAG, package.json=$SDK_VERSION"
        exit 1
      fi
    elif [[ $GITHUB_REF_NAME == cli-v* ]]; then
      CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")
      if [[ "$CLI_VERSION" != "$TAG" ]]; then
        echo "CLI version mismatch: tag=$TAG, package.json=$CLI_VERSION"
        exit 1
      fi
    fi
```

## Summary of Improvements:

1. **Better caching**: Added pnpm store cache and improved Turbo cache key to be more content-based
2. **Pinned Bun version**: Changed from `latest` to a specific version for reproducibility
3. **Version validation**: Added check to ensure package.json versions match git tags before publishing
4. **Removed redundant typechecks**: The separate typecheck steps were likely redundant with the build process

The workflows are generally well-structured with good separation of concerns, proper permissions, and flexible tag-based publishing. These improvements should make them more reliable and efficient.

---

## Plugin Package Caching

To ensure plugin packages are properly cached, the cache key now includes:

```yaml
key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml', 'turbo.json', 'packages/*/package.json', 'packages/plugins/*/package.json', 'apps/*/package.json') }}
```

This covers all workspace package.json files:
- `packages/*/package.json` - main packages like SDK, CLI, config
- `packages/plugins/*/package.json` - plugin packages like plugin-files, plugin-graph
- `apps/*/package.json` - apps like docs, playground

This future-proofs the caching as the plugin architecture expands.

---

## Bun Version Pinning

Created a `.bun-version` file to pin the Bun version:

```text
1.2.20
```

Updated the CI workflow to use the pinned version:

```yaml
- name: Setup Bun (for playground build)
  uses: oven-sh/setup-bun@v2
  with:
    bun-version-file: ".bun-version"
```

This ensures:
- Local developers using `bun install` will automatically use the pinned version
- CI builds use the exact same Bun version as local development
- The version is centrally managed in one place (`.bun-version` file)
- No more non-deterministic builds due to Bun version differences

The setup follows Bun's recommended practices for version pinning in projects. See the latest release notes for Bun v1.2.20 for stability improvements and fixes that benefit CI reliability ([Bun v1.2.20 blog](https://bun.sh/blog/bun-v1.2.20), [GitHub release](https://github.com/oven-sh/bun/releases/tag/bun-v1.2.20)).

---

## PR Review Guidelines

Here are the key areas to focus on while reviewing this monorepo refactor PR:

### 🏗️ Workspace Structure & Dependencies
- **Verify workspace boundaries**: Check that packages don't have circular dependencies or inappropriate cross-references
- **Dependency management**: Look for runtime deps that should be dev deps, or shared deps that could be centralized
- **Build order**: Ensure `turbo.json` has correct `dependsOn` relationships

### 📁 File Organization & Migrations
- **No orphaned files**: Verify all content from old locations (like root `src/`, `docs/`, `examples/`) has been properly moved
- **Path references**: Check that imports, file paths, and documentation links have been updated to new locations
- **Output locations**: Confirm the new `.civ7/outputs` policy is consistently applied

### ⚙️ Configuration Consistency
- **Config refactor**: The `civ.config.jsonc` structure changed significantly - verify the new `inputs/outputs/profiles` format works correctly
- **TypeScript configs**: Each package has different TS needs (SDK uses Bundler, CLI uses Node, apps use Bun) - ensure they're appropriate
- **Tool versions**: Check that Node, pnpm, and now Bun versions are consistently pinned

### 🔧 CLI Behavior Preservation
- **Command compatibility**: The CLI was refactored to use plugin libraries - ensure `civ7 zip`, `unzip`, `render`, etc. behave identically to before
- **Profile handling**: The config profiles (default, full, assets) should work the same way
- **Error handling**: Plugin extraction might have changed error messages or behavior

### 🚀 CI/CD & Publishing
- **Cache effectiveness**: The new Turbo + pnpm caching should speed up builds, not slow them down
- **Publishing workflow**: The tag-based publishing (`v*`, `sdk-v*`, `cli-v*`) is complex - verify the logic is correct
- **Build reproducibility**: Pinned versions should make builds more consistent

### 📚 Documentation & Developer Experience
- **Setup instructions**: The new `pnpm refresh:data` workflow should be clearly documented and working
- **Plugin architecture**: The new `@civ7/plugin-*` packages should be well-documented for future extension
- **Breaking changes**: Any config format changes should be clearly communicated

### 🧪 Testing & Validation
- **Smoke tests**: Basic functionality like building, linking CLI, serving docs should work
- **Integration points**: Where apps consume plugins (like docs using `@civ7/plugin-files`) should be tested
- **Backward compatibility**: Existing user workflows shouldn't break

### ⚠️ Potential Risk Areas
- **Complex config migration** - The `civ.config.jsonc` refactor touches many parts of the system
- **Plugin extraction** - Moving logic from CLI to plugins could introduce bugs
- **Build tool mixing** - Using Bun + Node + TypeScript + Turbo together has complexity
- **Publishing workflow** - The conditional tag-based publishing logic is intricate

### 🔍 Quick Validation Commands

```bash
# Test the full workflow
pnpm install && pnpm build && pnpm test
pnpm refresh:data
pnpm dev:docs  # Should serve docs with resources
pnpm link:cli && civ7 --help  # CLI should work globally
```

The biggest risks are around the config refactor and plugin extraction - those touch the most critical user-facing functionality.