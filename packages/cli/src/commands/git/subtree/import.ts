import SubtreeImportBase from '../../../base/subtree/SubtreeImportBase.js';

export default class GitImport extends SubtreeImportBase {
  static summary = 'Import a remote repository into a local subtree';
  static description = 'Preserve history by importing a remote repository under a prefix.';

  protected domain = 'git';
}
