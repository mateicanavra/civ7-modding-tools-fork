import { Mod } from '../src';
import { expect, test } from 'vitest';

test('Mod has default id', () => {
  const mod = new Mod();
  expect(mod.id).toBe('test');
});
