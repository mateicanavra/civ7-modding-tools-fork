import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('documentation site index exists', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const index = join(here, '..', 'site', 'index.html');
  expect(existsSync(index)).toBe(true);
});
