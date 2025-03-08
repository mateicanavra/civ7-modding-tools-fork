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
    civilizationType: `CIVILIZATION_${string}` | null = 'CIVILIZATION_CUSTOM';
    adjective: string | null = null;
    capitalName: string | null = null;
    fullName: string | null = null;
    name: string | null = null;
    domain: string | null = null;
    startingCivilizationLevelType: string | null = 'CIVILIZATION_LEVEL_FULL_CIV';

    aiTargetCityPercentage: number | null = null;
    description: string | null = null;
    randomCityNameDepth: number | null = null;
    uniqueCultureProgressionTree: string | null = null;

    constructor(payload: Partial<TCivilizationNode> = {}) {
        super();
        this.fill(payload);
    }
}
