import { TClassProperties } from "../types";

import { Base } from "./Base";
import { ActionGroup } from "./ActionGroup";

type TActionGroupBundle = TClassProperties<ActionGroupBundle>;

export class ActionGroupBundle extends Base<TActionGroupBundle> implements TActionGroupBundle {
    shell: ActionGroup | null = null;
    game: ActionGroup | null = null;
    current: ActionGroup | null = null;
    exist: ActionGroup | null = null;

    constructor(payload: Partial<TActionGroupBundle> = {}) {
        super();
        this.fill(payload);
    }

    values = () => {
        return [this.shell, this.game, this.current, this.exist].filter(ActionGroup => !!ActionGroup);
    }
}