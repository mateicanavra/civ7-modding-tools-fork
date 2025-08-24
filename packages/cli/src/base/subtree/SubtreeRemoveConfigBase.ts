import { Args, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import BaseCommand from '../BaseCommand.js';
import { removeSubtreeConfig } from '../../utils/git.js';

export default abstract class SubtreeRemoveConfigBase extends BaseCommand {
  static flags = {
    repoUrl: Flags.string({ description: 'Repository URL to match' }),
    deleteLocal: Flags.boolean({
      description: 'Also delete local subtree directory',
      default: false,
    }),
    verbose: Flags.boolean({
      description: 'Show underlying git commands',
      default: false,
      char: 'v',
    }),
  } as const;

  static args = {
    slug: Args.string({ description: 'Subtree slug', required: false }),
  } as const;

  protected abstract domain: string;
  protected abstract getPrefix(slug: string): string;

  async run() {
    const ctor: any = this.constructor;
    const { flags, args } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? SubtreeRemoveConfigBase.flags,
      args: ctor.args ?? (this as any).args ?? SubtreeRemoveConfigBase.args,
    });
    const slug = args.slug as string | undefined;
    const repoUrl = flags.repoUrl as string | undefined;
    if (!slug && !repoUrl) {
      throw new Error('Provide a slug or --repoUrl to remove.');
    }
    const removed = await removeSubtreeConfig(this.domain, { slug, repoUrl, verbose: flags.verbose });
    if (!removed) {
      this.log('No matching config entry found.');
      return;
    }
    if (flags.deleteLocal) {
      const dir = path.resolve(this.getPrefix(removed));
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    this.log(`Removed config for ${removed}.`);
  }
}
