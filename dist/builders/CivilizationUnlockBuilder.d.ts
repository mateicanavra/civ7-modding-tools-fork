import { TClassProperties, TObjectValues } from "../types";
import { DatabaseNode } from "../nodes";
import { TCivilizationUnlockLocalization } from "../localizations";
import { XmlFile } from "../files";
import { AGE } from "../constants";
import { BaseBuilder } from "./BaseBuilder";
type TCivilizationUnlockBuilder = TClassProperties<CivilizationUnlockBuilder>;
export declare class CivilizationUnlockBuilder extends BaseBuilder<TCivilizationUnlockBuilder> {
    _current: DatabaseNode;
    from: {
        civilizationType: string;
        ageType: TObjectValues<typeof AGE>;
    };
    to: {
        civilizationType: string;
        ageType: TObjectValues<typeof AGE>;
    };
    localizations: Partial<TCivilizationUnlockLocalization>[];
    constructor(payload?: Partial<TCivilizationUnlockBuilder>);
    migrate(): this;
    build(): XmlFile[];
}
export {};
