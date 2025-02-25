import { randomUUID } from "node:crypto";

import { TClassProperties } from "../types";

import { Base } from "./Base";
import { Criteria } from "./Criteria";

type TActionGroup = TClassProperties<ActionGroup>;

export class ActionGroup extends Base<TActionGroup> implements TActionGroup {
    id: string = `action-group-${randomUUID()}`;
    scope: 'shell' | 'game' = 'shell';
    criteria: Criteria = new Criteria();

    constructor(payload: Partial<TActionGroup> = {}) {
        super();
        this.fill(payload);
    }
}