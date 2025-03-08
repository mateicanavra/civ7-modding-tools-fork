"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitLocalization = void 0;
const BaseLocalization_1 = require("./BaseLocalization");
class UnitLocalization extends BaseLocalization_1.BaseLocalization {
    constructor(payload = {}) {
        super();
        this.name = '';
        this.description = '';
        this.fill(payload);
    }
}
exports.UnitLocalization = UnitLocalization;
//# sourceMappingURL=UnitLocalization.js.map