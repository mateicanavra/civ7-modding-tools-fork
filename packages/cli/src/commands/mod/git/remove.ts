import SubtreeRemoveConfigBase from '../../../base/subtree/SubtreeRemoveConfigBase.js';

export default class ModGitRemove extends SubtreeRemoveConfigBase {
  static summary = 'Remove a stored mod subtree configuration';
  static description = 'Delete config for a slug or repo URL.';
  static aliases = ['link:remove'];
  protected domain = 'mod';
  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
