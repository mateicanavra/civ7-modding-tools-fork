# Testing (Mintlify)

This app uses [Vitest](https://vitest.dev/) with the Node environment.

## Running tests

```bash
pnpm --filter @civ7/docs test
```

## Current smoke tests

- Ensures `apps/docs/docs.json` and `apps/docs/pages/index.mdx` exist and are valid.

## Suggested future tests

- Verify the Mintlify build succeeds (`pnpm -F @civ7/docs build`).
- Check for broken links using Mintlify CI checks.
