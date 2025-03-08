import { TClassProperties, TPartialRequired } from "../types";
import { DatabaseNode, GameEffectNode, TTraditionNode } from "../nodes";
import { TTraditionLocalization } from "../localizations";
import { XmlFile } from "../files";
import { ModifierBuilder } from "./ModifierBuilder";
import { ConstructibleBuilder } from "./ConstructibleBuilder";
import { UnitBuilder } from "./UnitBuilder";
import { BaseBuilder } from "./BaseBuilder";
type TTraditionBuilder = TClassProperties<TraditionBuilder>;
export declare class TraditionBuilder extends BaseBuilder<TTraditionBuilder> {
    _current: DatabaseNode;
    _gameEffects: GameEffectNode;
    _localizations: DatabaseNode;
    tradition: TPartialRequired<TTraditionNode, 'traditionType'>;
    localizations: Partial<TTraditionLocalization>[];
    constructor(payload?: Partial<TTraditionBuilder>);
    bind(items: (ModifierBuilder | ConstructibleBuilder | UnitBuilder)[]): this;
    build(): XmlFile[];
}
export {};
