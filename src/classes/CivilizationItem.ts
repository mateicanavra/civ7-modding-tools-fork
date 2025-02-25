import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { locale } from "../utils";
import { XmlFile } from "./XmlFile";
import { ACTIONS_GROUPS_ACTION, KIND, TAG_TRAIT } from "../constants";
import * as lodash from "lodash";
import { ActionGroupBundle } from "./ActionGroupBundle";
import { Unit } from "./Unit";
import { XmlElement } from "jstoxml";
import { Constructible } from "./Constructible";

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
    
    static from(data: Unit | Constructible) {
        if(data instanceof Unit){
            return new CivilizationItem({
                kind: KIND.UNIT,
                type: data.type,
                icon: data.icon
            })
        }

        if(data instanceof Constructible){
            return new CivilizationItem({
                kind: KIND.IMPROVEMENT, // TODO wtf is this KIND_BUILDING / KIND_IMPROVEMENT / KIND_QUARTER, what diff in view
                type: data.type,
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