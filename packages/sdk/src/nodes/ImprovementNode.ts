import { TObjectValues } from "../types";
import { DOMAIN } from "../constants";

import { BaseNode } from "./BaseNode";

export type TImprovementNode = Pick<ImprovementNode,
    "constructibleType" |
    "adjacentSeaResource" |
    "airSlots" |
    "barbarianCamp" |
    "buildInLine" |
    "buildOnFrontier" |
    "canBuildOnNonDistrict" |
    "canBuildOutsideTerritory" |
    "cityBuildable" |
    "defenseModifier" |
    "discoveryType" |
    "dispersalGold" |
    "domain" |
    "grantFortification" |
    "icon" |
    "ignoreNaturalYields" |
    "improvementOnRemove" |
    "mustBeAppealing" |
    "onePerSettlement" |
    "removeOnEntry" |
    "resourceTier" |
    "sameAdjacentValid" |
    "traitType" |
    "unitBuildable" |
    "weaponSlots" |
    "workable"
>;

export class ImprovementNode extends BaseNode<TImprovementNode> {
    constructibleType: string | null = `IMPROVEMENT_`;
    adjacentSeaResource: boolean | null = null;
    airSlots: number | null = null;
    barbarianCamp: boolean | null = null;
    buildInLine: boolean | null = null;
    buildOnFrontier: boolean | null = null;
    canBuildOnNonDistrict: boolean | null = null;
    canBuildOutsideTerritory: boolean | null = null;
    cityBuildable: boolean | null = null;
    defenseModifier: number | null = null;
    discoveryType: string | null = null;
    dispersalGold: number | null = null;
    domain: TObjectValues<typeof DOMAIN> | null = null;
    grantFortification: number | null = null;
    icon: string | null = null;
    ignoreNaturalYields: boolean | null = null;
    improvementOnRemove: string | null = null;
    mustBeAppealing: boolean | null = null;
    onePerSettlement: boolean | null = null;
    removeOnEntry: boolean | null = null;
    resourceTier: number | null = null;
    sameAdjacentValid: boolean | null = null;
    traitType: string | null = null;
    unitBuildable: boolean | null = null;
    weaponSlots: number | null = null;
    workable: boolean | null = null;

    constructor(payload: Partial<TImprovementNode> = {}) {
        super();
        this.fill(payload);
    }
}
