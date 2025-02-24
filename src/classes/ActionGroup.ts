import { v4 as uuid } from 'uuid';
import * as lodash from 'lodash';

import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { Criteria } from "./Criteria";
import { ACTIONS_GROUPS_ACTION } from "../constants";

type TActionGroup = TClassProperties<ActionGroup>;

export class ActionGroup extends Base<TActionGroup> implements TActionGroup {
    id: string = `action-group-${uuid()}`;
    scope: 'shell' | 'game' = 'shell';
    criteria: Criteria;
    actions: TObjectValues<typeof ACTIONS_GROUPS_ACTION>[] = []

    constructor(payload: Partial<TActionGroup> = {}) {
        super();
        this.fill(payload);
    }
}