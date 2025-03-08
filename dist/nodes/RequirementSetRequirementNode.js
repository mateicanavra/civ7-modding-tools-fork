"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementSetRequirementNode = void 0;
const BaseNode_1 = require("./BaseNode");
class RequirementSetRequirementNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.requirementSetId = 'REQSET_';
        this.requirementId = 'REQ_';
        this.fill(payload);
    }
}
exports.RequirementSetRequirementNode = RequirementSetRequirementNode;
//# sourceMappingURL=RequirementSetRequirementNode.js.map