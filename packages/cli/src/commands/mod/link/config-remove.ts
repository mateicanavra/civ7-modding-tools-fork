import RemoveConfigBase from '../../../subtree/RemoveConfigBase.js';

export default class ModLinkConfigRemove extends RemoveConfigBase {
  static summary = 'Remove a stored mod subtree configuration';
  static description = 'Delete config for a slug or repo URL.';
  protected domain = 'mod';
  protected getPrefix(slug: string): string {
    return `mods/${slug}`;
  }
}
