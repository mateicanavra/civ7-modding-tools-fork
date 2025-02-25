import { randomUUID } from "node:crypto";

import { TClassProperties, TObjectValues } from "../types";
import { ACTIONS_GROUPS_ACTION } from "../constants";

import { Base } from "./Base";
import { Criteria } from "./Criteria";

type TActionGroup = TClassProperties<ActionGroup>;

export class ActionGroup extends Base<TActionGroup> implements TActionGroup {
    id: string = `action-group-${randomUUID()}`;
    scope: 'shell' | 'game' = 'shell';
    criteria: Criteria;
    actions: TObjectValues<typeof ACTIONS_GROUPS_ACTION>[] = []

    constructor(payload: Partial<TActionGroup> = {}) {
        super();
        this.fill(payload);
    }
}