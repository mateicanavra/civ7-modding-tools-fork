import { Mod, BaseBuilder, XmlFile, ActionGroupNode, ACTION_GROUP_ACTION } from '../src';
import { expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';

class FileBuilder extends BaseBuilder {
  build() {
    return [
      new XmlFile({
        path: '/foo/',
        name: 'bar.xml',
        content: { _name: 'Test' },
        actionGroups: [new ActionGroupNode({ id: 'ag1' })],
        actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
      })
    ];
  }
}

test('Mod.build writes modinfo referencing builder files', async () => {
  const mod = new Mod({ id: 'my-mod' });
  mod.add(new FileBuilder());
  const tmp = fs.mkdtempSync(join(os.tmpdir(), 'mod-build-'));
  mod.build(tmp);
  await new Promise(r => setTimeout(r, 50));
  const modinfoPath = join(tmp, 'my-mod.modinfo');
  const xml = fs.readFileSync(modinfoPath, 'utf-8');
  expect(xml).toContain('<UpdateDatabase>');
  expect(xml).toContain('<Item>foo/bar.xml</Item>');
  const builderFile = fs.readFileSync(join(tmp, 'foo', 'bar.xml'), 'utf-8');
  expect(builderFile).toContain('<Test');
});
