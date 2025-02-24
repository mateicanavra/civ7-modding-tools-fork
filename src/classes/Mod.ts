import * as lodash from "lodash";

import { TClassProperties } from "../types";

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

        const actionGroupsWithFiles: Record<string, {actionGroup: ActionGroup, actions: string[]}> = xmlFiles.reduce((prev, xmlFile) => {
            let result = {...prev};

            xmlFile.actionGroups.forEach(actionGroup => {
                if(!result[actionGroup.id]) {
                    result[actionGroup.id] = {
                        actionGroup,
                        files: []
                    }
                }
                result[actionGroup.id].files.push(xmlFile.modInfoFilepath);
            });
            return result;
        }, {});

        console.log({actionGroupsWithFiles})

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
                    // ActionGroups: actionGroups.map(actionGroup => ({
                    //     _name: 'ActionGroup',
                    //     _attrs: {
                    //         id: actionGroup.id,
                    //         scope: actionGroup.scope,
                    //         criteria: actionGroup.criteria.id
                    //     },
                    // }))
                }
            }
        });

        modInfo.write(dist);

        return [];
    }
}