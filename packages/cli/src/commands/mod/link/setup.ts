import { Args } from '@oclif/core';
import SubtreeSetupBase from '../../../base/subtree/SubtreeSetupBase.js';

export default class ModLinkSetup extends SubtreeSetupBase {
  static summary = 'Configure and import a mod in one step';
  static description = 'Adds the remote and imports the repository into mods/<slug>.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;
  static aliases = ['link:setup'];

  protected domain = 'mod';

  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
