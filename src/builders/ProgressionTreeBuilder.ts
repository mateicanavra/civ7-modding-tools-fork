import * as lodash from "lodash";

import { TClassProperties, TPartialWithRequired } from "../types";
import { DatabaseNode, GameEffectNode, ProgressionTreeNode, ProgressionTreePrereqNode, TProgressionTreeNode, TProgressionTreePrereqNode, TypeNode } from "../nodes";
import { ACTION_GROUP_ACTION, AGE, KIND } from "../constants";
import { locale } from "../utils";
import { XmlFile } from "../files";

import { ProgressionTreeNodeBuilder } from "./ProgressionTreeNodeBuilder";
import { BaseBuilder } from "./BaseBuilder";
import { ProgressionTreeLocalization, TProgressionTreeLocalization } from "../localizations";

type TProgressionTreeBuilder = TClassProperties<ProgressionTreeBuilder>

export class ProgressionTreeBuilder extends BaseBuilder<TProgressionTreeBuilder> {
    _current: DatabaseNode = new DatabaseNode();
    _gameEffects: GameEffectNode = new GameEffectNode();
    _localizations: DatabaseNode = new DatabaseNode();

    progressionTree: TPartialWithRequired<TProgressionTreeNode, 'progressionTreeType' | 'ageType'> = {
        progressionTreeType: 'TREE_CIVICS_CUSTOM',
        ageType: AGE.ANTIQUITY
    }
    progressionTreePrereqs: TProgressionTreePrereqNode[] = [];

    localizations: TProgressionTreeLocalization[] = [];

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
            progressionTreePrereqs: this.progressionTreePrereqs.map(item => {
                return new ProgressionTreePrereqNode(item)
            })
        });

        this._localizations.fill({
            englishText: this.localizations.map(item => {
                return new ProgressionTreeLocalization({
                    prefix: this.progressionTree.progressionTreeType,
                    ...item
                });
            }).flatMap(item => item.getNodes())
        });
    }

    bind(items: ProgressionTreeNodeBuilder[]) {
        items.forEach(item => {
            item._current.progressionTreeNodes.forEach(item => {
                item.fill({
                    progressionTree: this.progressionTree.progressionTreeType,
                });
            })
            this._current.types = [
                ...this._current.types,
                ...item._current.types,
            ];
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

            this._localizations.englishText = [
                ...this._localizations.englishText,
                ...item._localizations.englishText
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
            new XmlFile({
                path,
                name: 'localization.xml',
                content: this._localizations.toXmlElement(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.always],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_TEXT]
            }),
        ];
    }
}
