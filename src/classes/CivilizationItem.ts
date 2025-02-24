import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { locale } from "../utils";
import { XmlFile } from "./XmlFile";
import { ACTIONS_GROUPS_ACTION, TAG_TRAIT } from "../constants";
import * as lodash from "lodash";
import { ActionGroupBundle } from "./ActionGroupBundle";

type TCivilization = TClassProperties<Civilization>;

export class Civilization extends Base<TCivilization> implements TCivilization {
    actionGroupBundle = new ActionGroupBundle();

    domain = 'AntiquityAgeCivilizations';
    type: string = 'TEST';
    icon: string;
    civilizationTags: TObjectValues<typeof TAG_TRAIT>[] = [];

    constructor(payload: Partial<TCivilization> = {}) {
        super();
        this.fill(payload);
        this.type = lodash.snakeCase(this.type).toLocaleUpperCase();
        if (!this.type.startsWith('CIVILIZATION_')) {
            this.type = 'CIVILIZATION_' + this.type;
        }
    }

    toShell() {
        return {
            Database: {
                Civilizations: {
                    _name: 'Row',
                    _attrs: {
                        Domain: this.domain,
                        CivilizationType: this.type,
                        CivilizationName: locale(this.type, 'Name'),
                        CivilizationFullName: locale(this.type, 'FullName'),
                        CivilizationDescription: locale(this.type, 'Description'),
                        CivilizationIcon: this.icon
                    }
                },
                CivilizationTags: this.civilizationTags.map(civilizationTag => ({
                    _name: 'Row',
                    _attrs: {
                        CivilizationDomain: this.domain,
                        CivilizationType:this.type,
                        TagType: civilizationTag,
                    }
                })),
                CivilizationItems: []
            }
        }
    }

    build() {
        const name = lodash.kebabCase(this.type.replace('CIVILIZATION_', ''));
        const directory = `/civilization/${name}/`;

        const files: XmlFile[] = [(
            new XmlFile({
                filename: `shell.xml`,
                filepath: directory,
                content: this.toShell(),
                actionGroups: [
                    this.actionGroupBundle.shell.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_DATABASE]
                    })
                ]
            })
        )];

        return files;
    }
}