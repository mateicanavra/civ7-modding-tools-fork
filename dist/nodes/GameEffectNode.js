"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEffectNode = void 0;
const BaseNode_1 = require("./BaseNode");
class GameEffectNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this._name = 'GameEffects';
        this.modifiers = [];
        this.fill(payload);
    }
    toXmlElement() {
        if (this.modifiers.length === 0) {
            return null;
        }
        return {
            _name: this._name,
            _attrs: {
                xmlns: "GameEffects",
            },
            _content: this.modifiers.map(item => item.toXmlElement())
        };
    }
}
exports.GameEffectNode = GameEffectNode;
//# sourceMappingURL=GameEffectNode.js.map