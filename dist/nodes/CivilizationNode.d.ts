import { BaseNode } from "./BaseNode";
export type TCivilizationNode = Pick<CivilizationNode, "civilizationType" | "adjective" | "capitalName" | "fullName" | "name" | "domain" | "aiTargetCityPercentage" | "description" | "randomCityNameDepth" | "startingCivilizationLevelType" | "uniqueCultureProgressionTree">;
export declare class CivilizationNode extends BaseNode<TCivilizationNode> {
    civilizationType: `CIVILIZATION_${string}` | null;
    adjective: string | null;
    capitalName: string | null;
    fullName: string | null;
    name: string | null;
    domain: string | null;
    startingCivilizationLevelType: string | null;
    aiTargetCityPercentage: number | null;
    description: string | null;
    randomCityNameDepth: number | null;
    uniqueCultureProgressionTree: string | null;
    constructor(payload?: Partial<TCivilizationNode>);
}
