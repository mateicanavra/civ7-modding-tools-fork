import { TClassProperties } from "../types";
import { DatabaseNode, GameEffectNode, TModifierNode } from "../nodes";
import { BaseBuilder } from "./BaseBuilder";
import { TModifierLocalization } from "../localizations";
type TModifierBuilder = TClassProperties<ModifierBuilder>;
export declare class ModifierBuilder extends BaseBuilder<TModifierBuilder> {
    _gameEffects: GameEffectNode;
    _localizations: DatabaseNode;
    /** @description if detached only adding into game effects file while binding*/
    isDetached: boolean;
    modifier: Partial<TModifierNode>;
    localizations: Partial<TModifierLocalization>[];
    constructor(payload?: Partial<TModifierBuilder>);
    migrate(): this;
    build(): never[];
}
export {};
