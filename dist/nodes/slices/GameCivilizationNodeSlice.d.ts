import { BaseNode } from "../BaseNode";
import { CivilizationNode } from "../CivilizationNode";
export type TGameCivilizationNodeSlice = Pick<GameCivilizationNodeSlice, "adjective" | "civilizationType" | "fullName" | "name" | "startingCivilizationLevelType" | "randomCityNameDepth" | "capitalName">;
export declare class GameCivilizationNodeSlice extends BaseNode<TGameCivilizationNodeSlice> {
    civilizationType: string | null;
    capitalName: string | null;
    adjective: string | null;
    fullName: string | null;
    name: string | null;
    startingCivilizationLevelType: string | null;
    randomCityNameDepth: number | null;
    constructor(payload?: Partial<TGameCivilizationNodeSlice>);
    static from(civilization: CivilizationNode): GameCivilizationNodeSlice;
}
