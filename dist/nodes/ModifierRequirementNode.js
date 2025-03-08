"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifierRequirementNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
const ArgumentNode_1 = require("./ArgumentNode");
class ModifierRequirementNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this._name = 'Requirement';
        this.type = constants_1.REQUIREMENT.PLAYER_HAS_CIVILIZATION_OR_LEADER_TRAIT;
        this.arguments = [];
        this.fill = (payload = {}) => {
            for (const [key, value] of Object.entries(payload)) {
                if (this.hasOwnProperty(key)) {
                    this[key] = value;
                }
            }
            return this;
        };
        this.fill(payload);
    }
    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                type: this.type,
            },
            _content: this.arguments.map(item => new ArgumentNode_1.ArgumentNode(item).toXmlElement())
        };
    }
}
exports.ModifierRequirementNode = ModifierRequirementNode;
//# sourceMappingURL=ModifierRequirementNode.js.map