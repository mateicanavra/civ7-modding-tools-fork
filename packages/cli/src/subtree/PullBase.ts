import { Args, Flags } from '@oclif/core';
import SubtreeCommand from '../base/SubtreeCommand.js';
import { pullSubtree } from '../utils/git.js';

export default abstract class PullBase extends SubtreeCommand {
  static flags = {
    ...SubtreeCommand.baseFlags,
    squash: Flags.boolean({
      description: 'Squash history when pulling',
      default: false,
      char: 'S',
    }),
    yes: Flags.boolean({
      description: 'Assume yes to safety prompts',
      default: false,
      char: 'y',
    }),
    autoUnshallow: Flags.boolean({
      description: 'Automatically unshallow the repo if needed',
      default: undefined,
      char: 'U',
    }),
  } as const;

  static args = {
    slug: Args.string({ description: 'Subtree slug', required: true }),
  } as const;

  protected getPrefix(slug: string): string {
    return slug;
  }

  async run() {
    const ctor: any = this.constructor;
    const { args, flags } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? PullBase.flags,
      args: ctor.args ?? (this as any).args ?? PullBase.args,
    });
    const slug = args.slug as string;
    const prefix = this.getPrefix(slug);
    await pullSubtree({
      domain: this.domain,
      slug,
      prefix,
      branch: flags.branch,
      squash: flags.squash,
      allowDirty: flags.yes,
      autoUnshallow: flags.autoUnshallow,
      verbose: flags.verbose,
      logger: this,
    });
  }
}
