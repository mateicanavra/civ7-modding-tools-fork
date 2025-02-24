import { v4 as uuid } from 'uuid';

import { Base } from "./Base";
import { AGES } from "../constants";
import { Criteria } from "./Criteria";

type TAction = {
    id: string;
    scope: 'shell' | 'game',
    actionCriteria: Criteria
}

export class Action extends Base<TAction> implements TAction {
    id: string = `action-group-${uuid()}`;
    scope: 'shell' | 'game' = 'shell';
    actionCriteria: Criteria;

    constructor(payload: Partial<TAction> = {}) {
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