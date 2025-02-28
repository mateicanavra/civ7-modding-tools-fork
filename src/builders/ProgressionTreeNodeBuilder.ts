import { TClassProperties, TObjectValues, TPartialWithRequired } from "../types";
import { DatabaseNode, GameEffectNode, ProgressionTreeAdvisoryNode, ProgressionTreeNodeNode, ProgressionTreeNodeUnlockNode, TProgressionTreeNodeNode, TypeNode } from "../nodes";
import { ADVISORY, KIND } from "../constants";

import { BaseBuilder } from "./BaseBuilder";
import { locale } from "../utils";
import { ModifierBuilder } from "./ModifierBuilder";

type TProgressionTreeNodeBuilder = TClassProperties<ProgressionTreeNodeBuilder>

export class ProgressionTreeNodeBuilder extends BaseBuilder<TProgressionTreeNodeBuilder> {
    _current: DatabaseNode = new DatabaseNode();
    _localizations: DatabaseNode = new DatabaseNode();
    _gameEffects: GameEffectNode = new GameEffectNode();


    progressionTreeNode: TPartialWithRequired<TProgressionTreeNodeNode, 'progressionTreeNodeType'> = {
        progressionTreeNodeType: 'NODE_CIVIC_'
    }
    progressionTreeAdvisories: TObjectValues<typeof ADVISORY>[] = [];

    constructor(payload: Partial<TProgressionTreeNodeBuilder> = {}) {
        super();
        this.fill(payload);

        this._current.fill({
            types: [new TypeNode({
                type: this.progressionTreeNode.progressionTreeNodeType,
                kind: KIND.TREE_NODE,
            })],
            progressionTreeNodes: [new ProgressionTreeNodeNode({
                name: locale(this.progressionTreeNode.progressionTreeNodeType, 'name'),
                ...this.progressionTreeNode
            })],
            progressionTreeAdvisories: this.progressionTreeAdvisories.map(item => {
                return new ProgressionTreeAdvisoryNode({
                    progressionTreeNodeType: this.progressionTreeNode.progressionTreeNodeType,
                    advisoryClassType: item
                });
            }),
        })
    }

    bind(items: ModifierBuilder[], unlockDepth = 1){
        items.forEach(item => {
            if(item instanceof ModifierBuilder) {
                item._gameEffects.modifiers.forEach((modifier) => {
                    this._gameEffects.modifiers.push(modifier);

                    this._current.progressionTreeNodeUnlocks.push(new ProgressionTreeNodeUnlockNode({
                        progressionTreeNodeType: this.progressionTreeNode.progressionTreeNodeType,
                        targetKind: KIND.MODIFIER,
                        targetType: modifier.id,
                        unlockDepth: unlockDepth
                    }));
                });

                this._localizations.englishText = [
                    ...this._localizations.englishText,
                    ...item._localizations.englishText
                ];
            }
        });

        return this;
    }

    build() {
        return [];
    }
}
