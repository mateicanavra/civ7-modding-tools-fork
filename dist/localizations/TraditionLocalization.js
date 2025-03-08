"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraditionLocalization = void 0;
const BaseLocalization_1 = require("./BaseLocalization");
class TraditionLocalization extends BaseLocalization_1.BaseLocalization {
    constructor(payload = {}) {
        super();
        this.name = '';
        this.description = '';
        this.fill(payload);
    }
}
exports.TraditionLocalization = TraditionLocalization;
//# sourceMappingURL=TraditionLocalization.js.map