import RemoveConfigBase from '../../../subtree/RemoveConfigBase.js';

export default class GitConfigRemove extends RemoveConfigBase {
  static summary = 'Remove a stored git subtree configuration';
  static description = 'Delete config for a slug or repo URL.';
  protected domain = 'git';
  protected getPrefix(slug: string): string {
    return slug;
  }
}
