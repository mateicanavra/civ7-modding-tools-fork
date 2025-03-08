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

export class GameCivilizationNodeSlice extends BaseNode<TGameCivilizationNodeSlice> {
    civilizationType: string | null = 'CIVILIZATION_';
    capitalName: string | null = 'capitalName';
    adjective: string | null = 'adjective';
    fullName: string | null = 'FullName';
    name: string | null = 'Name';
    startingCivilizationLevelType: string | null = 'CIVILIZATION_LEVEL_FULL_CIV';
    randomCityNameDepth: number | null = 10;

    constructor(payload: Partial<TGameCivilizationNodeSlice> = {}) {
        super();
        this.fill(payload);
    }

    static from(civilization: CivilizationNode) {
        return new GameCivilizationNodeSlice(civilization);
    }
}
