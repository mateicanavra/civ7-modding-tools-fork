import * as lodash from "lodash";

import { Base } from "./Base";
import { Unit } from "./Unit";
import { XmlFile } from "./XmlFile";

type TMod = {
    id: string;
    name: string;
    version: string | number;
    description: string;
    authors: string;
    affectsSavedGames: boolean;
    units: Unit[];
}

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

    toXMLElement() {
        return {
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
            }
        };
    }

    build(dist = './dist') {

        const modInfo = new XmlFile({
            filename: `${this.id}.modinfo`,
            filepath: '/',
            content: this.toXMLElement()
        });

        modInfo.write(dist);

        let files: XmlFile[] = [
            ...lodash.flatten(this.units.map(unit => unit.build()))
        ];

        const criterias = lodash.uniqBy(files.flatMap(file => file.criterias), criteria => criteria.id);
        console.log(criterias);

        files.forEach(file => file.write(dist));


        return [];
    }
}