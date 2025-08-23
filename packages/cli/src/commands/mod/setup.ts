import { Args } from '@oclif/core';
import SetupBase from '../../subtree/SetupBase.js';

export default class ModSetup extends SetupBase {
  static summary = 'Configure and import a mod in one step';
  static description = 'Adds the remote and imports the repository into mods/<slug>.';

  static flags = { ...SetupBase.flags } as typeof SetupBase.flags;
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;

  protected domain = 'mod';

  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
