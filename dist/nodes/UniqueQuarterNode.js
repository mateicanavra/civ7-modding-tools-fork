"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueQuarterNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UniqueQuarterNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.uniqueQuarterType = 'QUARTER_';
        this.buildingType1 = null;
        this.buildingType2 = null;
        this.name = null;
        this.description = null;
        this.traitType = null;
        this.fill(payload);
    }
}
exports.UniqueQuarterNode = UniqueQuarterNode;
//# sourceMappingURL=UniqueQuarterNode.js.map