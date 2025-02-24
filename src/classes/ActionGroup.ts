import { v4 as uuid } from 'uuid';

import { Base } from "./Base";
import { AGES } from "../constants";
import { Criteria } from "./Criteria";

type TActionGroup = {
    id: string;
    scope: 'shell' | 'game',
    actionCriteria: Criteria
}

export class ActionGroup extends Base<TActionGroup> implements TActionGroup {
    id: string = `action-group-${uuid()}`;
    scope: 'shell' | 'game' = 'shell';
    actionCriteria: Criteria;

    constructor(payload: Partial<TActionGroup> = {}) {
        super();
        this.fill(payload);
    }

    toXMLElement() {
        return {
            _name: 'ActionGroup',
            _attrs: {
                id: this.id,
                scope: this.scope,
                criteria: this.actionCriteria.id
            },
            _content: []
        };
    }
}