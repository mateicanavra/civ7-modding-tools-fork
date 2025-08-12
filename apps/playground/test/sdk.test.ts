import { Mod } from '@mateicanavra/civ7-sdk';
import { expect, test } from 'vitest';

test('SDK Mod can be instantiated', () => {
  const mod = new Mod();
  expect(mod).toBeInstanceOf(Mod);
});
