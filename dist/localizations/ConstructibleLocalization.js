"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleLocalization = void 0;
const BaseLocalization_1 = require("./BaseLocalization");
class ConstructibleLocalization extends BaseLocalization_1.BaseLocalization {
    constructor(payload = {}) {
        super();
        this.name = 'test';
        this.description = 'text';
        this.tooltip = 'Tooltip';
        this.fill(payload);
    }
}
exports.ConstructibleLocalization = ConstructibleLocalization;
//# sourceMappingURL=ConstructibleLocalization.js.map