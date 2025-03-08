import { randomUUID } from "node:crypto";

import { TObjectValues } from "../types";
import { AGE, YIELD } from "../constants";

import { BaseNode } from "./BaseNode";

export type TAdjacencyYieldChangeNode = Pick<AdjacencyYieldChangeNode,
    "id" |
    "age" |
    "yieldType" |
    "yieldChange" |
    "adjacentBiome" |
    "adjacentConstructible" |
    "adjacentConstructibleTag" |
    "adjacentDistrict" |
    "adjacentFeature" |
    "adjacentFeatureClass" |
    "adjacentLake" |
    "adjacentNaturalWonder" |
    "adjacentNavigableRiver" |
    "adjacentQuarter" |
    "adjacentResource" |
    "adjacentResourceClass" |
    "adjacentRiver" |
    "adjacentSeaResource" |
    "adjacentTerrain" |
    "adjacentUniqueQuarter" |
    "adjacentUniqueQuarterType" |
    "projectMaxYield" |
    "self" |
    "tilesRequired"
>;

export class AdjacencyYieldChangeNode extends BaseNode<TAdjacencyYieldChangeNode> {
    id = randomUUID();
    age: TObjectValues<typeof AGE> | null = AGE.ANTIQUITY;
    yieldType: TObjectValues<typeof YIELD> | null = YIELD.FOOD;
    yieldChange: number | null = 1;
    adjacentBiome : string | null = null;
    adjacentConstructible : string | null = null;
    adjacentConstructibleTag : string | null = null;
    adjacentDistrict : string | null = null;
    adjacentFeature : string | null = null;
    adjacentFeatureClass : string | null = null;
    adjacentLake : boolean | null = null;
    adjacentNaturalWonder : boolean | null = null;
    adjacentNavigableRiver : boolean | null = null;
    adjacentQuarter : boolean | null = null;
    adjacentResource : boolean | null = null;
    adjacentResourceClass : string | null = null;
    adjacentRiver : boolean | null = null;
    adjacentSeaResource : boolean | null = null;
    adjacentTerrain : string | null = null;
    adjacentUniqueQuarter : boolean | null = null;
    adjacentUniqueQuarterType : string | null = null;
    projectMaxYield : boolean | null = null;
    self : boolean | null = null;
    tilesRequired : string | null = null;

    constructor(payload: Partial<TAdjacencyYieldChangeNode> = {}) {
        super();
        this.fill(payload);
    }
}
