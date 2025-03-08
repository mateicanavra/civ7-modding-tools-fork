"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseYieldChangeNode = void 0;
const node_crypto_1 = require("node:crypto");
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class WarehouseYieldChangeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.id = (0, node_crypto_1.randomUUID)();
        this.age = constants_1.AGE.ANTIQUITY;
        this.yieldType = constants_1.YIELD.FOOD;
        this.yieldChange = 1;
        this.biomeInCity = null;
        this.constructibleInCity = null;
        this.districtInCity = null;
        this.featureClassInCity = null;
        this.featureInCity = null;
        this.lakeInCity = null;
        this.minorRiverInCity = null;
        this.naturalWonderInCity = null;
        this.navigableRiverInCity = null;
        this.overbuilt = null;
        this.resourceInCity = null;
        this.routeInCity = null;
        this.terrainInCity = null;
        this.terrainTagInCity = null;
        this.fill(payload);
    }
}
exports.WarehouseYieldChangeNode = WarehouseYieldChangeNode;
//# sourceMappingURL=WarehouseYieldChangeNode.js.map