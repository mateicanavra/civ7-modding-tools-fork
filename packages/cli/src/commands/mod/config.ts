import { Args } from '@oclif/core';
import ConfigRemoteBase from '../../subtree/ConfigRemoteBase.js';

export default class ModConfig extends ConfigRemoteBase {
  static summary = 'Configure the remote for a mod subtree';
  static description = 'Add or update the git remote used by mods/<slug>.';

  static flags = { ...ConfigRemoteBase.flags } as typeof ConfigRemoteBase.flags;
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;

  protected domain = 'mod';
}
