import { BaseBuilder } from '../src/builders';
import { expect, test } from 'vitest';

class DummyBuilder extends BaseBuilder<{ foo: string; bar: string }> {
  foo = 'initial';
  bar = 'initial';
  migrateCount = 0;
  migrate() {
    this.bar = 'migrated';
    this.migrateCount++;
    return this;
  }
}

test('BaseBuilder.fill updates known properties and triggers migrate', () => {
  const builder = new DummyBuilder().fill({ foo: 'updated', unknown: 'ignored' } as any);
  expect(builder.foo).toBe('updated');
  expect((builder as any).unknown).toBeUndefined();
  expect(builder.bar).toBe('migrated');
  expect(builder.migrateCount).toBe(1);
});
