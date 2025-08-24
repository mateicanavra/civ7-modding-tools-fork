import ClearConfigBase from '../../../subtree/ClearConfigBase.js';

export default class GitConfigClear extends ClearConfigBase {
  static summary = 'Delete all stored git subtree configurations';
  protected domain = 'git';
  protected getPrefix(slug: string): string {
    return slug;
  }
}
