import { TClassProperties, TPartialRequired } from "../types";
import { DatabaseNode, TLeaderCivilizationBiasNode, TLeaderUnlockNode } from "../nodes";
import { TLeaderUnlockLocalization } from "../localizations";
import { BaseBuilder } from "./BaseBuilder";
import { XmlFile } from "../files";
type TLeaderUnlockBuilder = TClassProperties<LeaderUnlockBuilder>;
export declare class LeaderUnlockBuilder extends BaseBuilder<TLeaderUnlockBuilder> {
    _current: DatabaseNode;
    _localizations: DatabaseNode;
    leaderUnlock: TPartialRequired<TLeaderUnlockNode, "leaderType" | "type" | "ageType">;
    leaderCivilizationBias: Partial<TLeaderCivilizationBiasNode>;
    localizations: Partial<TLeaderUnlockLocalization>[];
    constructor(payload?: Partial<TLeaderUnlockBuilder>);
    migrate(): this;
    build(): XmlFile[];
}
export {};
