import * as lodash from "lodash";

import { TClassProperties, TPartialWithRequired } from "../types";
import { DatabaseNode, GameEffectNode, ProgressionTreeNode, TProgressionTreeNode, TypeNode } from "../nodes";
import { ACTION_GROUP_ACTION, AGE, KIND } from "../constants";
import { locale } from "../utils";
import { XmlFile } from "../files";

import { ProgressionTreeNodeBuilder } from "./ProgressionTreeNodeBuilder";
import { BaseBuilder } from "./BaseBuilder";

type TProgressionTreeBuilder = TClassProperties<ProgressionTreeBuilder>

export class ProgressionTreeBuilder extends BaseBuilder<TProgressionTreeBuilder> {
    _current: DatabaseNode = new DatabaseNode();
    _gameEffects: GameEffectNode = new GameEffectNode();

    progressionTree: TPartialWithRequired<TProgressionTreeNode, 'progressionTreeType' | 'ageType'> = {
        progressionTreeType: 'TREE_CIVICS_CUSTOM',
        ageType: AGE.ANTIQUITY
    }

    constructor(payload: Partial<TProgressionTreeBuilder> = {}) {
        super();
        this.fill(payload);

        this._current.fill({
            types: [new TypeNode({
                type: this.progressionTree.progressionTreeType,
                kind: KIND.TREE,
            })],
            progressionTrees: [new ProgressionTreeNode({
                ...this.progressionTree,
                name: locale(this.progressionTree.progressionTreeType, 'name')
            })],
        })
    }

    bind(items: ProgressionTreeNodeBuilder[]) {
        items.forEach(item => {
            this._current.progressionTreeNodes = [
                ...this._current.progressionTreeNodes,
                ...item._current.progressionTreeNodes,
            ];
            this._current.progressionTreeAdvisories = [
                ...this._current.progressionTreeAdvisories,
                ...item._current.progressionTreeAdvisories,
            ];
            this._current.progressionTreeNodeUnlocks = [
                ...this._current.progressionTreeNodeUnlocks,
                ...item._current.progressionTreeNodeUnlocks,
            ];
            this._current.progressionTreePrereqs = [
                ...this._current.progressionTreePrereqs,
                ...item._current.progressionTreePrereqs,
            ];
            this._gameEffects.modifiers = [
                ...this._gameEffects.modifiers,
                ...item._gameEffects.modifiers
            ];
        })
        return this;
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
