import { Args } from '@oclif/core';
import SubtreeConfigRemoteBase from '../../../base/subtree/SubtreeConfigRemoteBase.js';

export default class ModGitUpdate extends SubtreeConfigRemoteBase {
  static summary = 'Create or update the remote configuration for a mod subtree';
  static description = 'Add or update the git remote used by mods/<slug>.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;
  static aliases = ['link:update'];

  protected domain = 'mod';
}
