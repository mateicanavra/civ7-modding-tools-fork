import { Command, Flags } from '@oclif/core';
import { listMods, resolveModsDir } from '@civ7/plugin-mods';

export default class ModList extends Command {
    static id = 'mod list';
    static summary = 'List locally installed Civ7 mods in the Mods directory';
    static description = 'Finds the Mods directory on this machine and lists subdirectories.';

    static flags = {
        dir: Flags.string({ description: 'Override Mods directory path' }),
    };

    public async run(): Promise<void> {
        const { flags } = await this.parse(ModList);
        const base = flags.dir ?? resolveModsDir().modsDir;
        const mods = listMods(base);
        if (mods.length === 0) {
            this.log('No mods found.');
            return;
        }
        this.log(`Mods directory: ${base}`);
        for (const m of mods) this.log(`- ${m}`);
    }
}


