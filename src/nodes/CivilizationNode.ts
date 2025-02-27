import { BaseNode } from "./BaseNode";

export type TCivilizationNode = Pick<CivilizationNode,
    "civilizationType" |
    "adjective" |
    "capitalName" |
    "fullName" |
    "name" |
    "domain" |
    "aiTargetCityPercentage" |
    "description" |
    "randomCityNameDepth" |
    "startingCivilizationLevelType" |
    "uniqueCultureProgressionTree"
>;

export class CivilizationNode extends BaseNode<TCivilizationNode> {
    civilizationType: `CIVILIZATION_${string}` = 'CIVILIZATION_CUSTOM';
    adjective: string = '';
    capitalName: string = '';
    fullName: string = '';
    name: string = '';
    domain: string | null = null;
    startingCivilizationLevelType: string = 'CIVILIZATION_LEVEL_FULL_CIV';

    aiTargetCityPercentage: number | null = null;
    description: string | null = null;
    randomCityNameDepth: number | null = null;
    uniqueCultureProgressionTree: string | null = null;

    constructor(payload: Partial<TCivilizationNode> = {}) {
        super();
        this.fill(payload);
    }
}
