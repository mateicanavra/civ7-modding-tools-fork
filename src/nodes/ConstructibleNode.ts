import { TObjectValues } from "../types";
import { AGE, CONSTRUCTIBLE_CLASS } from "../constants";

import { BaseNode } from "./BaseNode";

type TConstructibleNode = Pick<ConstructibleNode,
    "constructibleType" |
    "adjacentDistrict" |
    "adjacentLake" |
    "adjacentRiver" |
    "adjacentTerrain" |
    "age" |
    "archaeology" |
    "canBeHidden" |
    "constructibleClass" |
    "cost" |
    "costProgressionModel" |
    "costProgressionParam1" |
    "defense" |
    "description" |
    "discovery" |
    "districtDefense" |
    "existingDistrictOnly" |
    "immuneDamage" |
    "inRailNetwork" |
    "militaryDomain" |
    "name" |
    "noFeature" |
    "noRiver" |
    "population" |
    "productionBoostOverRoute" |
    "repairable" |
    "requiresAppealPlacement" |
    "requiresDistantLands" |
    "requiresHomeland" |
    "requiresUnlock" |
    "riverPlacement" |
    "tooltip" |
    "victoryItem"
>;

export class ConstructibleNode extends BaseNode<TConstructibleNode> {
    constructibleClass: TObjectValues<typeof CONSTRUCTIBLE_CLASS> = CONSTRUCTIBLE_CLASS.BUILDING;
    constructibleType: string = 'test';
    cost: number = 1;
    name: string = 'test';
    population: number = 1;

    adjacentDistrict: string | null = null;
    adjacentLake: boolean | null = null;
    adjacentRiver: boolean | null = null;
    adjacentTerrain: string | null = null;
    age: TObjectValues<typeof AGE> | null = null;
    archaeology: boolean | null = null;
    canBeHidden: boolean | null = null;
    costProgressionModel: string | null = null;
    costProgressionParam1: number | null = null;
    defense: number | null = null;
    description: string | null = null;
    discovery: boolean | null = null;
    districtDefense: boolean | null = null;
    existingDistrictOnly: boolean | null = null;
    immuneDamage: boolean | null = null;
    inRailNetwork: boolean | null = null;
    militaryDomain: string | null = null;
    noFeature: boolean | null = null;
    noRiver: boolean | null = null;
    productionBoostOverRoute: number | null = null;
    repairable: boolean | null = null;
    requiresAppealPlacement: boolean | null = null;
    requiresDistantLands: boolean | null = null;
    requiresHomeland: boolean | null = null;
    requiresUnlock: boolean | null = null;
    riverPlacement: string | null = null;
    tooltip: string | null = null;
    victoryItem: boolean | null = null;

    constructor(payload: Partial<TConstructibleNode> = {}) {
        super();
        this.fill(payload);
    }
}