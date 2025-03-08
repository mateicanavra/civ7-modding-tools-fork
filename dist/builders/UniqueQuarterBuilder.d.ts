import { TClassProperties, TPartialRequired } from "../types";
import { DatabaseNode, GameEffectNode, TIconDefinitionNode, UniqueQuarterNode } from "../nodes";
import { TUniqueQuarterLocalization } from "../localizations";
import { XmlFile } from "../files";
import { ModifierBuilder } from "./ModifierBuilder";
import { ConstructibleBuilder } from "./ConstructibleBuilder";
import { BaseBuilder } from "./BaseBuilder";
type TUniqueQuarterBuilder = TClassProperties<UniqueQuarterBuilder>;
export declare class UniqueQuarterBuilder extends BaseBuilder<TUniqueQuarterBuilder> {
    _always: DatabaseNode;
    _localizations: DatabaseNode;
    _gameEffects: GameEffectNode;
    _icons: DatabaseNode;
    uniqueQuarter: TPartialRequired<UniqueQuarterNode, 'uniqueQuarterType' | 'buildingType1' | 'buildingType2'>;
    icon: TPartialRequired<TIconDefinitionNode, 'path'>;
    localizations: Partial<TUniqueQuarterLocalization>[];
    constructor(payload?: Partial<TUniqueQuarterBuilder>);
    bind(items: (ModifierBuilder | ConstructibleBuilder)[]): this;
    build(): XmlFile[];
}
export {};
