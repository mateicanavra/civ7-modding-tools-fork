import { TClassProperties, TPartialRequired } from "../types";
import { DatabaseNode, GameEffectNode, TProgressionTreeNode, TProgressionTreePrereqNode } from "../nodes";
import { XmlFile } from "../files";
import { ProgressionTreeNodeBuilder } from "./ProgressionTreeNodeBuilder";
import { BaseBuilder } from "./BaseBuilder";
import { TProgressionTreeLocalization } from "../localizations";
type TProgressionTreeBuilder = TClassProperties<ProgressionTreeBuilder>;
export declare class ProgressionTreeBuilder extends BaseBuilder<TProgressionTreeBuilder> {
    _current: DatabaseNode;
    _gameEffects: GameEffectNode;
    _localizations: DatabaseNode;
    progressionTree: TPartialRequired<TProgressionTreeNode, 'progressionTreeType' | 'ageType'>;
    progressionTreePrereqs: TProgressionTreePrereqNode[];
    localizations: TProgressionTreeLocalization[];
    constructor(payload?: Partial<TProgressionTreeBuilder>);
    migrate(): this;
    bind(items: ProgressionTreeNodeBuilder[]): this;
    build(): XmlFile[];
}
export {};
