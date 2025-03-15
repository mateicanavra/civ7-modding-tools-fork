"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderCivilizationBiasNode = void 0;
const BaseNode_1 = require("./BaseNode");
class LeaderCivilizationBiasNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationDomain = null;
        this.civilizationType = null;
        this.leaderDomain = 'StandardLeaders';
        this.leaderType = null;
        this.bias = 4;
        this.reasonType = null;
        this.choiceType = 'LOC_CREATE_GAME_HISTORICAL_CHOICE';
        this.fill(payload);
    }
}
exports.LeaderCivilizationBiasNode = LeaderCivilizationBiasNode;
//# sourceMappingURL=LeaderCivilizationBiasNode.js.map