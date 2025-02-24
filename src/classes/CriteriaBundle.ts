import { Base } from "./Base";
import { Criteria } from "./Criteria";

type TCriteriaBundle = {
    always: Criteria | null,
    current: Criteria | null,
    exist: Criteria | null,
}

export class CriteriaBundle extends Base<TCriteriaBundle> implements TCriteriaBundle {
    always: Criteria | null = null;
    current: Criteria | null = null;
    exist: Criteria | null = null;

    constructor(payload: Partial<TCriteriaBundle> = {}) {
        super();
        this.fill(payload);
    }

    values = () => {
        return [this.always, this.current, this.exist].filter(criteria => !!criteria);
    }
}