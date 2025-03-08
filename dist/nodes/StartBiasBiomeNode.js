"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartBiasBiomeNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class StartBiasBiomeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = null;
        this.leaderType = null;
        this.biomeType = constants_1.BIOME.GRASSLAND;
        this.score = 5;
        this.fill(payload);
    }
}
exports.StartBiasBiomeNode = StartBiasBiomeNode;
//# sourceMappingURL=StartBiasBiomeNode.js.map