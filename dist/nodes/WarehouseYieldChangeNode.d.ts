import { TObjectValues } from "../types";
import { AGE, YIELD } from "../constants";
import { BaseNode } from "./BaseNode";
export type TWarehouseYieldChangeNode = Pick<WarehouseYieldChangeNode, "id" | "age" | "yieldType" | "yieldChange" | "biomeInCity" | "constructibleInCity" | "districtInCity" | "featureClassInCity" | "featureInCity" | "lakeInCity" | "minorRiverInCity" | "naturalWonderInCity" | "navigableRiverInCity" | "overbuilt" | "resourceInCity" | "routeInCity" | "terrainInCity" | "terrainTagInCity">;
export declare class WarehouseYieldChangeNode extends BaseNode<TWarehouseYieldChangeNode> {
    id: string;
    age: TObjectValues<typeof AGE> | null;
    yieldType: TObjectValues<typeof YIELD> | null;
    yieldChange: number | null;
    biomeInCity: string | null;
    constructibleInCity: string | null;
    districtInCity: string | null;
    featureClassInCity: string | null;
    featureInCity: string | null;
    lakeInCity: boolean | null;
    minorRiverInCity: boolean | null;
    naturalWonderInCity: boolean | null;
    navigableRiverInCity: boolean | null;
    overbuilt: boolean | null;
    resourceInCity: boolean | null;
    routeInCity: boolean | null;
    terrainInCity: string | null;
    terrainTagInCity: string | null;
    constructor(payload?: Partial<TWarehouseYieldChangeNode>);
}
