import { Mod, BaseBuilder, BaseFile } from '../src';
import { expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';

test('Mod has default id', () => {
  const mod = new Mod();
  expect(mod.id).toBe('test');
});

test('Mod.add invokes build for each builder', () => {
  const mod = new Mod();
  let single = 0;
  let array = 0;
  class SingleBuilder extends BaseBuilder {
    build() {
      single++;
      return [];
    }
  }
  class ArrayBuilder extends BaseBuilder {
    build() {
      array++;
      return [];
    }
  }
  mod.add(new SingleBuilder());
  mod.add([new ArrayBuilder(), new ArrayBuilder()]);
  const tmp = fs.mkdtempSync(join(os.tmpdir(), 'mod-test-'));
  mod.build(tmp);
  expect(single).toBe(1);
  expect(array).toBe(2);
});

test('Mod.addFiles invokes write for each file', () => {
  const mod = new Mod();
  let count = 0;
  class FileStub extends BaseFile {
    constructor() {
      super({ content: 'data' });
    }
    write() {
      count++;
    }
  }
  mod.addFiles(new FileStub());
  mod.addFiles([new FileStub(), new FileStub()]);
  const tmp = fs.mkdtempSync(join(os.tmpdir(), 'mod-test-'));
  mod.build(tmp);
  expect(count).toBe(3);
});
