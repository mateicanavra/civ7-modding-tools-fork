import { Args } from '@oclif/core';
import SubtreePullBase from '../../../base/subtree/SubtreePullBase.js';

export default class ModLinkPull extends SubtreePullBase {
  static summary = 'Pull remote changes into mods/<slug>';
  static description = 'Fetch and merge updates from the mirror repository into the local mod subtree.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;
  static aliases = ['link:pull'];

  protected domain = 'mod';

  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
