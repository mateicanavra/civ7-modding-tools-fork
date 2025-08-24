import { Args } from '@oclif/core';
import PushBase from '../../../subtree/PushBase.js';

export default class ModLinkPush extends PushBase {
  static summary = 'Push mods/<slug> to its configured remote';
  static description = 'Push local mod subtree changes back to the mirror repository.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;

  protected domain = 'mod';

  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
