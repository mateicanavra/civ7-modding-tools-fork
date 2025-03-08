"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameCivilizationNodeSlice = void 0;
const BaseNode_1 = require("../BaseNode");
class GameCivilizationNodeSlice extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = 'CIVILIZATION_';
        this.capitalName = 'capitalName';
        this.adjective = 'adjective';
        this.fullName = 'FullName';
        this.name = 'Name';
        this.startingCivilizationLevelType = 'CIVILIZATION_LEVEL_FULL_CIV';
        this.randomCityNameDepth = 10;
        this.fill(payload);
    }
    static from(civilization) {
        return new GameCivilizationNodeSlice(civilization);
    }
}
exports.GameCivilizationNodeSlice = GameCivilizationNodeSlice;
//# sourceMappingURL=GameCivilizationNodeSlice.js.map