import { CivilizationBuilder } from '../src';
import { expect, test } from 'vitest';

const civPayload = {
  civilization: {
    civilizationType: 'CIVILIZATION_FOO',
    domain: 'AntiquityAgeCivilizations'
  }
};

test('CivilizationBuilder migrates trait types from civilization', () => {
  const builder = new CivilizationBuilder(civPayload);
  expect(builder.trait.traitType).toBe('TRAIT_FOO');
  expect(builder.traitAbility.traitType).toBe('TRAIT_FOO_ABILITY');
});

test('CivilizationBuilder.build produces core files', () => {
  const builder = new CivilizationBuilder(civPayload);
  const files = builder.build();
  const names = files.map(f => f.name);
  expect(names).toContain('current.xml');
  expect(names).toContain('localization.xml');
});
