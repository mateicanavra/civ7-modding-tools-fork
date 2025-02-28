import { randomUUID } from "node:crypto";

import { TObjectValues } from "../types";
import { AGE, YIELD } from "../constants";

import { BaseNode } from "./BaseNode";

export type TWarehouseYieldChangeNode = Pick<WarehouseYieldChangeNode,
    "id" |
    "age" |
    "yieldType" |
    "yieldChange" |
    "biomeInCity" |
    "constructibleInCity" |
    "districtInCity" |
    "featureClassInCity" |
    "featureInCity" |
    "lakeInCity" |
    "minorRiverInCity" |
    "naturalWonderInCity" |
    "navigableRiverInCity" |
    "overbuilt" |
    "resourceInCity" |
    "routeInCity" |
    "terrainInCity" |
    "terrainTagInCity"
>;

export class WarehouseYieldChangeNode extends BaseNode<TWarehouseYieldChangeNode> {
    id = randomUUID();
    age: TObjectValues<typeof AGE> = AGE.ANTIQUITY;
    yieldType: TObjectValues<typeof YIELD> = YIELD.FOOD;
    yieldChange = 1;
    biomeInCity: string | null = null;
    constructibleInCity: string | null = null;
    districtInCity: string | null = null;
    featureClassInCity: string | null = null;
    featureInCity: string | null = null;
    lakeInCity: boolean | null = null;
    minorRiverInCity: boolean | null = null;
    naturalWonderInCity: boolean | null = null;
    navigableRiverInCity: boolean | null = null;
    overbuilt: boolean | null = null;
    resourceInCity: boolean | null = null;
    routeInCity: boolean | null = null;
    terrainInCity: string | null = null;
    terrainTagInCity: string | null = null;

    constructor(payload: Partial<TWarehouseYieldChangeNode> = {}) {
        super();
        this.fill(payload);
    }
}
