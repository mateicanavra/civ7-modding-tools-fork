"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifierNode = void 0;
const node_crypto_1 = require("node:crypto");
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
const ArgumentNode_1 = require("./ArgumentNode");
const ModifierRequirementNode_1 = require("./ModifierRequirementNode");
const StringNode_1 = require("./StringNode");
class ModifierNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this._name = 'Modifier';
        this.id = `MOD_` + (0, node_crypto_1.randomUUID)().split('-').join('').toLocaleUpperCase();
        this.collection = constants_1.COLLECTION.OWNER;
        this.effect = constants_1.EFFECT.CITY_ADJUST_YIELD_PER_RESOURCE;
        this.arguments = [];
        this.requirements = [];
        this.strings = [];
        this.permanent = null;
        this.runOnce = null;
        this.fill(payload);
    }
    toXmlElement() {
        return {
            _name: this._name,
            _attrs: Object.assign(Object.assign({ id: this.id, collection: this.collection, effect: this.effect }, (this.permanent !== null && { permanent: this.permanent ? 'true' : 'false' })), (this.runOnce !== null && { "run-once": this.runOnce ? 'true' : 'false' })),
            _content: [
                {
                    _name: 'SubjectRequirements',
                    _content: this.requirements.map(item => new ModifierRequirementNode_1.ModifierRequirementNode(item).toXmlElement())
                },
                ...this.arguments.map(item => new ArgumentNode_1.ArgumentNode(item).toXmlElement()),
                ...this.strings.map(item => new StringNode_1.StringNode(item).toXmlElement()),
            ]
        };
    }
}
exports.ModifierNode = ModifierNode;
//# sourceMappingURL=ModifierNode.js.map