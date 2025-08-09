import { BaseNode } from "./BaseNode";

export type TBuildingNode = Pick<BuildingNode,
    "constructibleType" |
    "movable" |
    'traitType' |
    'allowsHolyCity' |
    'archaeologyResearch' |
    'buildQueue' |
    'capital' |
    'citizenSlots' |
    'cityCenterPriority' |
    'defenseModifier' |
    'grantFortification' |
    'housing' |
    'maxPlayerInstances' |
    'multiplePerCity' |
    'mustPurchase' |
    'outerDefenseHitPoints' |
    'outerDefenseStrength' |
    'purchasable' |
    'purchaseYield' |
    'town' |
    'workable'
>;

export class BuildingNode extends BaseNode<TBuildingNode> {
    constructibleType: string | null = 'BUILDING_';
    movable: boolean | null = false;
    traitType: string | null = null;
    allowsHolyCity: boolean | null = null;
    archaeologyResearch: boolean | null = null;
    buildQueue: boolean | null = null;
    capital: boolean | null = null;
    citizenSlots: number | null = null;
    cityCenterPriority: number | null = null;
    defenseModifier: number | null = null;
    grantFortification: number | null = null;
    housing: number | null = null;
    maxPlayerInstances: number | null = null;
    multiplePerCity: boolean | null = null;
    mustPurchase: boolean | null = null;
    outerDefenseHitPoints: number | null = null;
    outerDefenseStrength: number | null = null;
    purchasable: boolean | null = null;
    purchaseYield: string | null = null;
    town: boolean | null = null;
    workable: boolean | null = null;

    constructor(payload: Partial<TBuildingNode> = {}) {
        super();
        this.fill(payload);
    }
}
