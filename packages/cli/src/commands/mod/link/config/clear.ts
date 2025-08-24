import ClearConfigBase from '../../../../subtree/ClearConfigBase.js';

export default class ModLinkConfigClear extends ClearConfigBase {
  static summary = 'Delete all stored mod subtree configurations';
  protected domain = 'mod';
  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
