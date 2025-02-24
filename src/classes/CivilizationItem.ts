import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { locale } from "../utils";
import { XmlFile } from "./XmlFile";
import { ACTIONS_GROUPS_ACTION, KIND, TAG_TRAIT } from "../constants";
import * as lodash from "lodash";
import { ActionGroupBundle } from "./ActionGroupBundle";
import { Unit } from "./Unit";
import { XmlElement } from "jstoxml";

type TCivilizationItem = TClassProperties<CivilizationItem>;

export class CivilizationItem extends Base<TCivilizationItem> implements TCivilizationItem {
    civilizationDomain = '';
    civilizationType = '';
    type = '';
    kind: TObjectValues<typeof KIND> = KIND.TRAIT;
    icon = '';

    constructor(payload: Partial<TCivilizationItem> = {}) {
        super();
        this.fill(payload);
    }
    
    static from(data: Unit) {
        if(data instanceof Unit){
            return new CivilizationItem({
                type: data.type,
                kind: KIND.UNIT,
                icon: data.icon
            })
        }
        
        return new CivilizationItem({});
    }

    toXmlElement() {
        return {
            _name: 'Row',
            _attrs: {
                CivilizationDomain: this.civilizationDomain,
                CivilizationType: this.civilizationType,
                Type: this.type,
                Kind: this.kind,
                Name: locale(this.type, 'Name'),
                Description: locale(this.type, 'Description'),
                Icon: this.icon
            }
        };
    }
}