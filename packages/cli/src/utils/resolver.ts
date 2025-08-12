import * as path from 'node:path';
import * as Config from '@civ7/config';

export interface ResolvedRootOptions {
  projectRoot: string;
  profile: string;
  flagsRoot?: string;
  flagsConfig?: string;
}

export async function resolveRootFromConfigOrFlag(opts: ResolvedRootOptions): Promise<string> {
  const { projectRoot, profile, flagsRoot, flagsConfig } = opts;
  if (flagsRoot) {
    return path.resolve(projectRoot, Config.expandPath(flagsRoot));
  }
  const cfg = (await Config.loadConfig(projectRoot, flagsConfig)).raw;
  return Config.resolveUnzipDir({ projectRoot, profile }, cfg);
}


