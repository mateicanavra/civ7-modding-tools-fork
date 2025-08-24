import SubtreeClearConfigBase from '../../../base/subtree/SubtreeClearConfigBase.js';

export default class ModLinkClear extends SubtreeClearConfigBase {
  static summary = 'Delete all stored mod subtree configurations';
  static aliases = ['link:clear'];
  protected domain = 'mod';
  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
