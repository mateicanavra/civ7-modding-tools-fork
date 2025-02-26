import { BaseNode } from "./BaseNode";

export type TGameCivilizationNode = Pick<GameCivilizationNode,
    "adjective" |
    "civilizationType" |
    "fullName" |
    "name" |
    "startingCivilizationLevelType" |
    "randomCityNameDepth" |
    "capitalName"
>;

export class GameCivilizationNode extends BaseNode<TGameCivilizationNode> {
    civilizationType = 'CIVILIZATION_';
    capitalName = 'capitalName';
    adjective = 'adjective';
    fullName = 'FullName';
    name = 'Name';
    startingCivilizationLevelType = 'CIVILIZATION_LEVEL_FULL_CIV';
    randomCityNameDepth = 10;

    constructor(payload: Partial<TGameCivilizationNode> = {}) {
        super();
        this.fill(payload);
    }
}
