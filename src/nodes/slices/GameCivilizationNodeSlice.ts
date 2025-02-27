import { BaseNode } from "../BaseNode";
import { CivilizationNode } from "../CivilizationNode";

export type TGameCivilizationNodeSlice = Pick<GameCivilizationNodeSlice,
    "adjective" |
    "civilizationType" |
    "fullName" |
    "name" |
    "startingCivilizationLevelType" |
    "randomCityNameDepth" |
    "capitalName"
>;

// TODO should extend CivilizationNode, not BaseNode, need to update CivilizationNode -> CivilizationNode<T>
export class GameCivilizationNodeSlice extends BaseNode<TGameCivilizationNodeSlice> {
    civilizationType = 'CIVILIZATION_';
    capitalName = 'capitalName';
    adjective = 'adjective';
    fullName = 'FullName';
    name = 'Name';
    startingCivilizationLevelType = 'CIVILIZATION_LEVEL_FULL_CIV';
    randomCityNameDepth = 10;

    constructor(payload: Partial<TGameCivilizationNodeSlice> = {}) {
        super();
        this.fill(payload);
    }

    static from(civilization: CivilizationNode) {
        return new GameCivilizationNodeSlice(civilization);
    }
}
