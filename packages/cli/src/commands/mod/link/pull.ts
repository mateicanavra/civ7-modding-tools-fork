import { Args } from '@oclif/core';
import PullBase from '../../../subtree/PullBase.js';

export default class ModLinkPull extends PullBase {
  static summary = 'Pull remote changes into mods/<slug>';
  static description = 'Fetch and merge updates from the mirror repository into the local mod subtree.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;

  protected domain = 'mod';

  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
