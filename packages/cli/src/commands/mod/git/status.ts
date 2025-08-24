import { Args } from '@oclif/core';
import SubtreeStatusBase from '../../../base/subtree/SubtreeStatusBase.js';
import { getModStatus } from '@civ7/plugin-mods';
import { getRemotePushConfig } from '../../../utils/git.js';

export default class ModGitStatus extends SubtreeStatusBase {
  static summary = 'Show git subtree status for a mod';
  static description = 'Displays repository and remote information for mods/<slug>.';
  static args = { slug: Args.string({ description: 'Mod slug', required: true }) } as any;
  static aliases = ['link:status'];

  protected domain = 'mod';

  async run() {
    const { args, flags } = await this.parse(ModGitStatus);
    const slug = args.slug as string;
    const status = await getModStatus({ slug, branch: flags.branch, verbose: flags.verbose });

    if (flags.json) {
      const config = status.remoteName
        ? await getRemotePushConfig(status.remoteName, { verbose: flags.verbose })
        : undefined;
      this.logJson({
        repoRoot: status.repoRoot,
        modsPrefix: status.modsPrefix,
        remoteName: status.remoteName,
        config,
      });
      return;
    }

    this.log(`Repo root: ${status.repoRoot ?? '(not a git repo)'}`);
    this.log(`Subtree prefix: ${status.modsPrefix}`);
    await super.run();
  }
}
