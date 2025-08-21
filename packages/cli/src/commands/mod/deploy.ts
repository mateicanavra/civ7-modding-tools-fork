import { Command, Flags } from '@oclif/core';
import { deployMod, resolveModsDir } from '@civ7/plugin-mods-deploy';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export default class ModDeploy extends Command {
    static id = 'mod deploy';
    static summary = 'Deploy a mod folder into the Civ7 Mods directory';
    static description = 'Copies files from an input directory into Mods/[mod-id].';

    static examples = [
        '<%= config.bin %> mod deploy --input ./dist --id my_mod',
        '<%= config.bin %> mod deploy -i ../plugin-mapgen/dist -m epic-diverse-huge',
    ];

    static flags = {
        input: Flags.string({ char: 'i', description: 'Input directory of the mod files', required: true }),
        id: Flags.string({ char: 'm', description: 'Target mod id (directory name under Mods/)', required: true }),
        dir: Flags.string({ description: 'Override Mods directory path' }),
    };

    public async run(): Promise<void> {
        const { flags } = await this.parse(ModDeploy);
        const inputDir = path.resolve(flags.input!);
        if (!fs.existsSync(inputDir)) this.error(`Input directory not found: ${inputDir}`);
        const modsDir = flags.dir ?? resolveModsDir().modsDir;
        const res = deployMod({ inputDir, modId: flags.id!, modsDir });
        this.log(`✅ Deployed to: ${res.targetDir}`);
        // Provide a clickable URL variant for terminals/editors where spaces break path detection
        this.log(`Open: ${pathToFileURL(res.targetDir).toString()}`);
    }
}


