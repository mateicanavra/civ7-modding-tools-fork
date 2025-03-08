"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifierLocalization = void 0;
const BaseLocalization_1 = require("./BaseLocalization");
class ModifierLocalization extends BaseLocalization_1.BaseLocalization {
    constructor(payload = {}) {
        super();
        this.description = '';
        this.fill(payload);
    }
}
exports.ModifierLocalization = ModifierLocalization;
//# sourceMappingURL=ModifierLocalization.js.map