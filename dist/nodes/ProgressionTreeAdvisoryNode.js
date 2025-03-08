"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionTreeAdvisoryNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ProgressionTreeAdvisoryNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.progressionTreeNodeType = 'NODE_';
        this.advisoryClassType = constants_1.ADVISORY.CLASS_FOOD;
        this.fill(payload);
    }
}
exports.ProgressionTreeAdvisoryNode = ProgressionTreeAdvisoryNode;
//# sourceMappingURL=ProgressionTreeAdvisoryNode.js.map