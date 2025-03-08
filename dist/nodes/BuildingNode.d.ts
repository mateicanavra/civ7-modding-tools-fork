import { BaseNode } from "./BaseNode";
export type TBuildingNode = Pick<BuildingNode, "constructibleType" | "movable" | 'traitType' | 'allowsHolyCity' | 'archaeologyResearch' | 'buildQueue' | 'capital' | 'citizenSlots' | 'cityCenterPriority' | 'defenseModifier' | 'grantFortification' | 'housing' | 'maxPlayerInstances' | 'multiplePerCity' | 'mustPurchase' | 'outerDefenseHitPoints' | 'outerDefenseStrength' | 'purchasable' | 'purchaseYield' | 'town' | 'workable'>;
export declare class BuildingNode extends BaseNode<TBuildingNode> {
    constructibleType: string | null;
    movable: boolean | null;
    traitType: string | null;
    allowsHolyCity: boolean | null;
    archaeologyResearch: boolean | null;
    buildQueue: boolean | null;
    capital: boolean | null;
    citizenSlots: number | null;
    cityCenterPriority: number | null;
    defenseModifier: number | null;
    grantFortification: number | null;
    housing: number | null;
    maxPlayerInstances: number | null;
    multiplePerCity: boolean | null;
    mustPurchase: boolean | null;
    outerDefenseHitPoints: number | null;
    outerDefenseStrength: number | null;
    purchasable: boolean | null;
    purchaseYield: string | null;
    town: boolean | null;
    workable: boolean | null;
    constructor(payload?: Partial<TBuildingNode>);
}
