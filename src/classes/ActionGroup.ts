import { v4 as uuid } from 'uuid';

import { TClassProperties } from "../types";

import { Base } from "./Base";
import { Criteria } from "./Criteria";

type TActionGroup = TClassProperties<ActionGroup>;

export class ActionGroup extends Base<TActionGroup> implements TActionGroup {
    id: string = `action-group-${uuid()}`;
    scope: 'shell' | 'game' = 'shell';
    criteria: Criteria;

    constructor(payload: Partial<TActionGroup> = {}) {
        super();
        this.fill(payload);
    }
}