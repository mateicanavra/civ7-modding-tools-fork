import SubtreeRemoveConfigBase from '../../../base/subtree/SubtreeRemoveConfigBase.js';

export default class ModLinkRemove extends SubtreeRemoveConfigBase {
  static summary = 'Remove a stored mod subtree configuration';
  static description = 'Delete config for a slug or repo URL.';
  protected domain = 'mod';
  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
