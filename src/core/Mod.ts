import * as lodash from "lodash";
import * as fs from 'node:fs';

import { fill } from "../utils";
import { TClassProperties, TObjectValues } from "../types";
import { ACTION_GROUP_ACTION } from "../constants";
import { BaseBuilder } from "../builders";
import { ActionGroupNode } from "../nodes";
import { BaseFile, XmlFile } from "../files";


type TMod = TClassProperties<Mod>;

export class Mod {
    id: string = 'test';
    name: string = 'test'
    version: string | number = 1;
    description: string = 'generated by https://github.com/izica/civ7-modding-tool';
    authors: string = 'generated by https://github.com/izica/civ7-modding-tool';
    affectsSavedGames: boolean = true;

    private builders: BaseBuilder[] = [];
    private files: BaseFile[] = [];

    constructor(payload: Partial<TMod> = {}) {
        this.fill(payload);
    }

    fill = fill<TMod>;

    /**
     * @description add/link builders to mod
     * @param data
     */
    add(data: BaseBuilder | BaseBuilder[]) {
        if(Array.isArray(data)) {
            this.builders = this.builders.concat(data);
        } else {
            this.builders.push(data)
        }

        return this;
    }

    addFiles(data: BaseFile | BaseFile[]) {
        if(Array.isArray(data)) {
            this.files = this.files.concat(data);
        } else {
            this.files.push(data)
        }

        return this;
    }

    // TODO maybe refactoring in feature?
    build(dist = './dist', clear = true) {
        if (clear) {
            fs.mkdirSync(dist, { recursive: true });
            fs.rmSync(dist, { recursive: true });
            fs.mkdirSync(dist, { recursive: true });
        }

        const files = this.builders
            .flatMap(builder => builder.build())
            .concat(this.files);

        const criterias = lodash.uniqBy(
            files.flatMap(file => file.actionGroups.map(actionGroup => actionGroup.criteria)),
            criteria => criteria.id
        );

        const actionGroups: Record<string, {
            actionGroup: ActionGroupNode,
            actions: Partial<Record<TObjectValues<typeof ACTION_GROUP_ACTION>, string[]>>
        }> = {};

        files.forEach(file => {
            file.actionGroups.forEach(actionGroup => {
                if(!actionGroups[actionGroup.id]) {
                    actionGroups[actionGroup.id] = { actionGroup, actions: {} }
                }

                file.actionGroupActions.forEach(actionGroupAction => {
                    if(!actionGroups[actionGroup.id].actions[actionGroupAction]) {
                        actionGroups[actionGroup.id].actions[actionGroupAction] = [];
                    }
                    actionGroups[actionGroup.id].actions[actionGroupAction].push(file.modInfoPath);
                })
            });
        });

        const modInfo = new XmlFile({
            name: `${this.id}.modinfo`,
            path: '/',
            content: {
                _name: 'Mod',
                _attrs: {
                    id: this.id,
                    version: this.version,
                    xmlns: "ModInfo"
                },
                _content: {
                    Properties: {
                        Name: this.name,
                        Description: this.description,
                        Authors: this.authors,
                        Version: this.version,
                        AffectsSavedGames: +this.affectsSavedGames
                    },
                    Dependencies: [{
                        _name: 'Mod',
                        _attrs: {
                            id: 'base-standard',
                            title: 'LOC_MODULE_BASE_STANDARD_NAME'
                        }
                    }],
                    ActionCriteria: criterias.map(criteria => criteria.toXmlElement()),
                    ActionGroups: Object.values(actionGroups).map(({ actionGroup, actions }) => ({
                        _name: 'ActionGroup',
                        _attrs: {
                            id: actionGroup.id,
                            scope: actionGroup.scope,
                            criteria: actionGroup.criteria.id,
                        },
                        _content: {
                            Actions: Object.entries(actions).map(([key, items]) => ({
                                [key]: items.map(item => ({
                                    Item: item
                                }))
                            }))
                        }
                    }))
                }
            }
        });

        modInfo.write(dist);
        files.forEach(file => file.write(dist));

        return [];
    }
}
