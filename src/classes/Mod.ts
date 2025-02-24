import * as lodash from "lodash";

import { TClassProperties, TObjectValues } from "../types";
import { ACTIONS_GROUPS_ACTIONS } from "../constants";

import { Base } from "./Base";
import { Unit } from "./Unit";
import { XmlFile } from "./XmlFile";
import { ActionGroup } from "./ActionGroup";

type TMod = TClassProperties<Mod>;

export class Mod extends Base<TMod> implements TMod {
    id: string = 'test';
    name: string = 'test'
    version: string | number = 1;
    description: string = '';
    authors: string = '';
    affectsSavedGames: boolean = true;

    units: Unit[] = [];

    constructor(payload: Partial<TMod> = {}) {
        super();
        this.fill(payload);
    }

    build(dist = './dist') {
        let xmlFiles: XmlFile[] = [
            ...lodash.flatten(this.units.map(unit => unit.build()))
        ];

        const criterias = lodash.uniqBy(
            xmlFiles.flatMap(file => file.actionGroups.map(actionGroup => actionGroup.criteria)),
            criteria => criteria.id
        );

        type TActionGroups = {
            actionGroup: ActionGroup,
            actions: Partial<Record<TObjectValues<typeof ACTIONS_GROUPS_ACTIONS>, string[]>>
        }[]
        const actionGroups: TActionGroups = Object.values(xmlFiles.reduce((prev, xmlFile) => {
            let result = {...prev};

            xmlFile.actionGroups.forEach(actionGroup => {
                if(!result[actionGroup.id]) {
                    result[actionGroup.id] = {
                        actionGroup,
                        actions: {}
                    }
                }
                actionGroup.actions.forEach(action => {
                    if(!result[actionGroup.id].actions[action]){
                        result[actionGroup.id].actions[action] = [];
                    }
                    result[actionGroup.id].actions[action].push(xmlFile.modInfoFilepath);
                })
            });
            return result;
        }, {}));

        console.log(JSON.stringify(actionGroups))

        xmlFiles.forEach(xmlFile => xmlFile.write(dist));

        const modInfo = new XmlFile({
            filename: `${this.id}.modinfo`,
            filepath: '/',
            content: {
                _name: 'Mod',
                _attrs: {
                    id: this.id,
                    version: this.version,
                    xmlms: "ModInfo"
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
                    ActionCriteria: criterias.map(criteria => criteria.toXMLElement()),
                    ActionGroups: actionGroups.map(({actionGroup, actions}) => ({
                        _name: 'ActionGroup',
                        _attrs: {
                            id: actionGroup.id,
                            scope: actionGroup.scope,
                            criteria: actionGroup.criteria,
                        },
                        _content: {
                            Actions: Object.entries(actions).map(([key, items]) =>  ({
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

        return [];
    }
}