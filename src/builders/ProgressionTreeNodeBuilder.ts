import { TClassProperties, TObjectValues, TPartialWithRequired } from "../types";
import {
    DatabaseNode,
    GameEffectNode,
    ModifierNode,
    ProgressionTreeAdvisoryNode,
    ProgressionTreeNodeNode,
    ProgressionTreeNodeUnlockNode,
    TModifierNode,
    TProgressionTreeNodeNode,
    TypeNode
} from "../nodes";
import { ADVISORY, KIND } from "../constants";

import { BaseBuilder } from "./BaseBuilder";
import { locale } from "../utils";

type TProgressionTreeNodeBuilder = TClassProperties<ProgressionTreeNodeBuilder>

export class ProgressionTreeNodeBuilder extends BaseBuilder<TProgressionTreeNodeBuilder> {
    _current: DatabaseNode = new DatabaseNode();
    _gameEffects: GameEffectNode = new GameEffectNode();

    progressionTreeNode: TPartialWithRequired<TProgressionTreeNodeNode, 'progressionTreeNodeType'> = {
        progressionTreeNodeType: 'NODE_CIVIC_'
    }
    progressionTreeAdvisories: TObjectValues<typeof ADVISORY>[] = [];
    modifiers: Partial<TModifierNode>[] = [];

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

        if (this.modifiers.length > 0) {
            this._gameEffects = new GameEffectNode({
                modifiers: this.modifiers.map(item => {
                    return new ModifierNode(item);
                })
            });

            this._gameEffects.modifiers.forEach(modifier => {
                this._current.progressionTreeNodeUnlocks.push(new ProgressionTreeNodeUnlockNode({
                    progressionTreeNodeType: this.progressionTreeNode.progressionTreeNodeType,
                    targetKind: KIND.MODIFIER,
                    targetType: modifier.id,
                    unlockDepth: 1
                }));
            })
        }
    }

    build() {
        return [];
    }
}
