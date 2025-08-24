import ListConfigBase from '../../../subtree/ListConfigBase.js';

export default class GitConfigList extends ListConfigBase {
  static summary = 'List stored git subtree configurations';
  protected domain = 'git';
}
