"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderUnlockNode = void 0;
const BaseNode_1 = require("./BaseNode");
const constants_1 = require("../constants");
class LeaderUnlockNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.leaderDomain = 'StandardLeaders';
        this.leaderType = null;
        this.ageDomain = 'StandardAges';
        this.ageType = constants_1.AGE.ANTIQUITY;
        this.type = null;
        this.kind = constants_1.KIND.CIVILIZATION;
        this.name = null;
        this.description = null;
        this.icon = null;
        this.fill(payload);
    }
}
exports.LeaderUnlockNode = LeaderUnlockNode;
//# sourceMappingURL=LeaderUnlockNode.js.map