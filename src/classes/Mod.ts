import _ from "lodash";

import { Base } from "./Base";
import { Unit } from "./Unit";
import { XMLFile } from "./XMLFile";
import { write } from "node:fs";

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

    constructor(payload?: Partial<TMod>) {
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
            }
        };
    }

    build(dist = './dist') {
        const xml = new XMLFile({
            path: 'config.xml',
            content: this.toXMLElement()
        });
        let files: XMLFile[] = [
            ..._.flatten(this.units.map(unit => unit.build()))
        ];

        files.forEach(file => file.write());

        console.log(files);

        return [];
    }
}