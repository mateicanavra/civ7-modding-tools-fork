import { TClassProperties, TObjectValues, TPartialRequired } from "../types";
import { DatabaseNode, GameEffectNode, TProgressionTreeNodeNode } from "../nodes";
import { ADVISORY } from "../constants";
import { BaseBuilder } from "./BaseBuilder";
import { ModifierBuilder } from "./ModifierBuilder";
import { ConstructibleBuilder } from "./ConstructibleBuilder";
import { UnitBuilder } from "./UnitBuilder";
import { TProgressionTreeNodeLocalization } from "../localizations";
import { TraditionBuilder } from "./TraditionBuilder";
type TProgressionTreeNodeBuilder = TClassProperties<ProgressionTreeNodeBuilder>;
export declare class ProgressionTreeNodeBuilder extends BaseBuilder<TProgressionTreeNodeBuilder> {
    _current: DatabaseNode;
    _localizations: DatabaseNode;
    _gameEffects: GameEffectNode;
    progressionTreeNode: TPartialRequired<TProgressionTreeNodeNode, 'progressionTreeNodeType'>;
    progressionTreeAdvisories: TObjectValues<typeof ADVISORY>[];
    localizations: TProgressionTreeNodeLocalization[];
    constructor(payload?: Partial<TProgressionTreeNodeBuilder>);
    bind(items: (ModifierBuilder | ConstructibleBuilder | UnitBuilder | TraditionBuilder)[], unlockDepth?: number): this;
    build(): never[];
}
export {};
