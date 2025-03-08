"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionTreeNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ProgressionTreeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.progressionTreeType = 'TREE_';
        this.ageType = constants_1.AGE.ANTIQUITY;
        this.systemType = constants_1.SYSTEM.CULTURE;
        this.name = null;
        this.fill(payload);
    }
}
exports.ProgressionTreeNode = ProgressionTreeNode;
//# sourceMappingURL=ProgressionTreeNode.js.map