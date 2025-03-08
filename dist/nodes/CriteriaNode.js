"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriteriaNode = void 0;
const node_crypto_1 = require("node:crypto");
const BaseNode_1 = require("./BaseNode");
class CriteriaNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this._name = 'Criteria';
        this.id = (0, node_crypto_1.randomUUID)();
        this.ages = [];
        this.any = null;
        this.fill(payload);
    }
    toXmlElement() {
        return {
            _name: this._name,
            _attrs: Object.assign({ id: this.id }, (this.any ? { any: "true" } : {})),
            _content: this.ages.length
                ? this.ages.map(AgeInUse => ({ AgeInUse }))
                : { AlwaysMet: '' }
        };
    }
}
exports.CriteriaNode = CriteriaNode;
//# sourceMappingURL=CriteriaNode.js.map