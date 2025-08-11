import { expandPath } from '../../src/utils/resolver';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('expandPath resolves tilde to home directory', () => {
  const result = expandPath('~/foo');
  expect(result).toBe(join(homedir(), 'foo'));
});
