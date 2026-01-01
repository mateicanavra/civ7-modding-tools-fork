import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('Mintlify config, llms.txt, and entry page exist', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const docsJson = join(here, '..', 'docs.json');
  const indexMdx = join(here, '..', 'index.mdx');
  const llmsTxt = join(here, '..', 'public', 'llms.txt');
  expect(existsSync(docsJson)).toBe(true);
  expect(existsSync(indexMdx)).toBe(true);
  expect(existsSync(llmsTxt)).toBe(true);
  const json = JSON.parse(readFileSync(docsJson, 'utf8'));
  expect(json.name).toBeTruthy();
  expect(json.navigation && typeof json.navigation === 'object' && !Array.isArray(json.navigation)).toBe(true);
});
