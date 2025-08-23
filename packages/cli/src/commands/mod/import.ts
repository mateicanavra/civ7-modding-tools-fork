import { Args } from '@oclif/core';
import SubtreeCommand from '../../base/SubtreeCommand.js';
import ImportBase from '../../subtree/ImportBase.js';

export default class ModImport extends ImportBase {
  static summary = 'Import a remote mod repository under mods/<slug>';
  static description = 'Preserve history by adding the remote as a subtree under mods/<slug>.';

  static flags = { ...SubtreeCommand.baseFlags } as typeof SubtreeCommand.baseFlags;
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;

  protected domain = 'mod';

  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
