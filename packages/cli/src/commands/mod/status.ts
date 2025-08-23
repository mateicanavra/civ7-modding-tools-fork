import { Args } from '@oclif/core';
import SubtreeCommand from '../../base/SubtreeCommand.js';
import { getModStatus } from '@civ7/plugin-mods';
import { logRemotePushConfig } from '../../utils/git.js';

export default class ModStatus extends SubtreeCommand {
  static summary = 'Show git subtree status for a mod';
  static description = 'Displays repository and remote information for mods/<slug>.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as const;

  protected domain = 'mod';

  async run() {
    const { args, flags } = await this.parse(ModStatus);
    const slug = args.slug as string;
    const remoteName = await this.resolveRemoteName({ slug, flags });
    const status = await getModStatus({ slug, remoteName, branch: flags.branch, verbose: flags.verbose });
    this.log(`Repo root: ${status.repoRoot ?? '(not a git repo)'}`);
    this.log(`Subtree prefix: ${status.modsPrefix}`);
    if (remoteName) {
      await logRemotePushConfig(remoteName, { logger: this, verbose: flags.verbose });
    }
  }
}
