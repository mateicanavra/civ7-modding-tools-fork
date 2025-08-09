# Testing

This app uses [Vitest](https://vitest.dev/) with the Node environment.

## Running tests

```bash
pnpm --filter @civ7/docs test
```

## Current smoke tests

- Ensures `site/index.html` exists.

## Suggested future tests

- Verify the Docsify build copies files into `dist`.
- Check for broken links or missing pages.
