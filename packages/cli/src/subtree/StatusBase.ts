import { Args } from '@oclif/core';
import SubtreeCommand from '../base/SubtreeCommand.js';
import { getRemoteNameForSlug, getRemotePushConfig, logRemotePushConfig } from '../utils/git.js';

export default abstract class StatusBase extends SubtreeCommand {
  static flags = {
    ...SubtreeCommand.baseFlags,
  } as const;

  static args = {
    slug: Args.string({ description: 'Subtree slug', required: false }),
  } as const;

  async run() {
    const ctor: any = this.constructor;
    const { args, flags } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? StatusBase.flags,
      args: ctor.args ?? (this as any).args ?? StatusBase.args,
    });
    const slug = args.slug as string | undefined;
    const remoteName = slug
      ? await getRemoteNameForSlug(this.domain, slug)
      : undefined;
    if (flags.json) {
      const config = remoteName
        ? await getRemotePushConfig(remoteName, { verbose: flags.verbose })
        : undefined;
      this.logJson({ remoteName, config });
      return;
    }

    if (remoteName) {
      await logRemotePushConfig(remoteName, { logger: this, verbose: flags.verbose });
    }
  }
}
