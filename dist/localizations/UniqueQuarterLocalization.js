"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueQuarterLocalization = void 0;
const BaseLocalization_1 = require("./BaseLocalization");
class UniqueQuarterLocalization extends BaseLocalization_1.BaseLocalization {
    constructor(payload = {}) {
        super();
        this.name = '';
        this.description = '';
        this.fill(payload);
    }
}
exports.UniqueQuarterLocalization = UniqueQuarterLocalization;
//# sourceMappingURL=UniqueQuarterLocalization.js.map