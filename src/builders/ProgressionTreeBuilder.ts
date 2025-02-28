import { TClassProperties, TPartialWithRequired } from "../types";

import { BaseBuilder } from "./BaseBuilder";
import {
    DatabaseNode,
    GameEffectNode,
    ModifierNode,
    ProgressionTreeAdvisoryNode,
    ProgressionTreeNode,
    ProgressionTreeNodeNode,
    ProgressionTreeNodeUnlockNode,
    TModifierNode,
    TProgressionTreeAdvisoryNode,
    TProgressionTreeNode,
    TProgressionTreeNodeNode,
    TProgressionTreeNodeUnlockNode,
    TypeNode
} from "../nodes";
import { ACTION_GROUP_ACTION, AGE, KIND } from "../constants";
import { locale } from "../utils";
import * as lodash from "lodash";
import { XmlFile } from "../files";

type TProgressionTreeBuilder = TClassProperties<ProgressionTreeBuilder>

export class ProgressionTreeBuilder extends BaseBuilder<TProgressionTreeBuilder> {
    _current: DatabaseNode = new DatabaseNode();
    _gameEffects: GameEffectNode = new GameEffectNode();

    progressionTree: TPartialWithRequired<TProgressionTreeNode, 'progressionTreeType' | 'ageType'> = {
        progressionTreeType: 'TREE_CIVICS_CUSTOM',
        ageType: AGE.ANTIQUITY
    }

    progressionTreeNodes: TPartialWithRequired<TProgressionTreeNodeNode, 'progressionTreeNodeType'>[] = [];
    progressionTreeAdvisory: TProgressionTreeAdvisoryNode[] = [];
    progressionTreeNodeUnlocks: TPartialWithRequired<TProgressionTreeNodeUnlockNode,
        'progressionTreeNodeType' | 'targetType' | 'targetKind'
    >[] = [];

    modifiers: Partial<TModifierNode>[] = [];

    constructor(payload: Partial<TProgressionTreeBuilder> = {}) {
        super();
        this.fill(payload);

        this._current.fill({
            types: [new TypeNode({
                type: this.progressionTree.progressionTreeType,
                kind: KIND.TREE,
            }), ...this.progressionTreeNodes.map(item => {
                return new TypeNode({
                    type: item.progressionTreeNodeType,
                    kind: KIND.TREE_NODE
                })
            })],
            progressionTrees: [new ProgressionTreeNode({
                ...this.progressionTree,
                name: locale(this.progressionTree.progressionTreeType, 'name')
            })],
            progressionTreeNodes: this.progressionTreeNodes.map(item => {
                return new ProgressionTreeNodeNode({
                    progressionTree: this.progressionTree.progressionTreeType,
                    name: locale(item.progressionTreeNodeType, 'name'),
                    ...item,
                })
            }),
            progressionTreeNodeUnlocks: this.progressionTreeNodeUnlocks.map(item => {
                return new ProgressionTreeNodeUnlockNode(item);
            }),
            progressionTreeAdvisories: this.progressionTreeAdvisory.map(item => {
                return new ProgressionTreeAdvisoryNode(item);
            }),
        })

        if (this.modifiers.length > 0) {
            this._gameEffects = new GameEffectNode({
                modifiers: this.modifiers.map(item => {
                    return new ModifierNode(item);
                })
            });
        }
    }

    build() {
        const path = `/progression-trees/${lodash.kebabCase(this.progressionTree.progressionTreeType.replace('TREE_', ''))}/`;
        return [
            new XmlFile({
                path,
                name: 'current.xml',
                content: this._current.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new XmlFile({
                path,
                name: 'game-effects.xml',
                content: this._gameEffects?.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
        ];
    }
}
