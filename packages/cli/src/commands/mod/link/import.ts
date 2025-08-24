import { Args } from '@oclif/core';
import SubtreeImportBase from '../../../base/subtree/SubtreeImportBase.js';

export default class ModLinkImport extends SubtreeImportBase {
  static summary = 'Import a remote mod repository under mods/<slug>';
  static description = 'Preserve history by adding the remote as a subtree under mods/<slug>.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;

  protected domain = 'mod';

  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
