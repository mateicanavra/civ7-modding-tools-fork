import { ACTION_TYPES } from "../constants";
import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { Criteria } from "./Criteria";

type TAction = TClassProperties<Action>;

export class Action extends Base<TAction> {
    scope: 'shell' | 'game' = 'game'
    criteria: Criteria = new Criteria();
    type: TObjectValues<typeof ACTION_TYPES> = ACTION_TYPES.UpdateDatabase;

    constructor(payload: Partial<TAction> = {}) {
        super();
        this.fill(payload);
    }
}