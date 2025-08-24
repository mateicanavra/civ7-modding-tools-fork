import { Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import BaseCommand from '../BaseCommand.js';
import { listSubtreeConfigs, removeSubtreeConfig } from '../../utils/git.js';

export default abstract class SubtreeClearConfigBase extends BaseCommand {
  static flags = {
    deleteLocal: Flags.boolean({
      description: 'Also delete local subtree directories',
      default: false,
    }),
    verbose: Flags.boolean({
      description: 'Show underlying git commands',
      default: false,
      char: 'v',
    }),
  } as const;

  protected abstract domain: string;
  protected abstract getPrefix(slug: string): string;

  async run() {
    const ctor: any = this.constructor;
    const { flags } = await this.parse({
      flags: ctor.flags ?? (this as any).flags ?? SubtreeClearConfigBase.flags,
    });
    const configs = await listSubtreeConfigs(this.domain, { verbose: flags.verbose });
    if (configs.length === 0) {
      this.log('No stored config entries to clear.');
      return;
    }
    for (const cfg of configs) {
      await removeSubtreeConfig(this.domain, { slug: cfg.slug, verbose: flags.verbose });
      if (flags.deleteLocal) {
        const dir = path.resolve(this.getPrefix(cfg.slug));
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
    }
    this.log(`Cleared ${configs.length} config entr${configs.length === 1 ? 'y' : 'ies'}.`);
  }
}
