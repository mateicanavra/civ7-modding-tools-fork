import SubtreeListConfigBase from '../../../base/subtree/SubtreeListConfigBase.js';

export default class GitSubtreeList extends SubtreeListConfigBase {
  static summary = 'List stored git subtree configurations';
  protected domain = 'git';
}
