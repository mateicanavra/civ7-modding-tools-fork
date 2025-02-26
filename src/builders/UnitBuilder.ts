import * as lodash from "lodash";

import { TClassProperties } from "../types";
import { Database, TypeNode, UnitNode } from "../nodes";
import { ACTION_GROUP, ACTION_GROUP_ACTION, KIND } from "../constants";
import { locale } from "../utils";

import { BaseBuilder } from "./BaseBuilder";
import { XmlFile } from "../files/XmlFile";

type TUnitBuilder = TClassProperties<UnitBuilder>

export class UnitBuilder extends BaseBuilder<TUnitBuilder> {
    type = 'UNIT_TEST_SCOUT';

    _game: Database = new Database();

    constructor(payload: Partial<TUnitBuilder> = {}) {
        super();
        this.fill(payload);
        this.migrate();
    }

    migrate(){
        this._game.fill({
            types: [
                new TypeNode({
                    type: this.type,
                    kind: KIND.UNIT
                })
            ],
            units: [
                new UnitNode({
                    unitType: this.type,
                    name: locale(this.type, 'name'),
                    description: locale(this.type, 'description'),
                })
            ],
        })

        return this;
    }


    build() {
        const path = `/units/${lodash.kebabCase(this.type.replace('UNIT_', ''))}/`;
        return [
            new XmlFile({
                path,
                name: 'game.xml',
                content: this._game.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            })
        ]
    }
}
