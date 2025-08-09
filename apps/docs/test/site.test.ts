import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('documentation site index exists', () => {
  const index = join(process.cwd(), 'site', 'index.html');
  expect(existsSync(index)).toBe(true);
});
